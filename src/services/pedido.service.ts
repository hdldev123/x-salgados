import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Pedido } from '../models/Pedido';
import { ItemPedido } from '../models/ItemPedido';
import { Cliente } from '../models/Cliente';
import { Produto } from '../models/Produto';
import { StatusPedido, StatusPedidoLabel } from '../models/enums';
import {
  CriarPedidoDto,
  AtualizarStatusDto,
  PedidoDto,
  PedidoResumoDto,
  ItemPedidoResponseDto,
} from '../dtos/pedido.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';

const pedidoRepo = () => AppDataSource.getRepository(Pedido);
const clienteRepo = () => AppDataSource.getRepository(Cliente);
const produtoRepo = () => AppDataSource.getRepository(Produto);

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(pedido: Pedido): PedidoDto {
  return {
    id: pedido.id,
    clienteId: pedido.clienteId,
    clienteNome: pedido.cliente?.nome ?? '',
    clienteTelefone: pedido.cliente?.telefone ?? null,
    clienteEndereco: pedido.cliente?.endereco ?? null,
    dataCriacao: pedido.dataCriacao,
    dataEntrega: pedido.dataEntrega,
    valorTotal: Number(pedido.valorTotal),
    status: StatusPedidoLabel[pedido.status] || pedido.status.toString(),
    statusEnum: pedido.status,
    observacoes: pedido.observacoes,
    itens: (pedido.itens || []).map(
      (i): ItemPedidoResponseDto => ({
        id: i.id,
        produtoId: i.produtoId,
        produtoNome: i.produto?.nome ?? '',
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitarioSnapshot),
        subtotal: i.quantidade * Number(i.precoUnitarioSnapshot),
      }),
    ),
  };
}

// ─── Listar (paginado + filtros) ─────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
  status?: number,
  dataInicio?: string,
  dataFim?: string,
): Promise<ResultadoPaginadoDto<PedidoResumoDto>> {
  const qb = pedidoRepo()
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.cliente', 'c')
    .leftJoin('p.itens', 'i');

  if (status !== undefined && status !== null) {
    qb.andWhere('p.status = :status', { status });
  }

  if (dataInicio) {
    qb.andWhere('p.data_criacao >= :dataInicio', { dataInicio });
  }

  if (dataFim) {
    qb.andWhere('p.data_criacao <= :dataFim', { dataFim });
  }

  const totalItens = await qb.getCount();

  // Subconsulta para soma de quantidade por pedido
  const pedidos = await pedidoRepo()
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.cliente', 'c')
    .leftJoin('p.itens', 'i')
    .addSelect('COALESCE(SUM(i.quantidade), 0)', 'quantidadeItens')
    .where(status !== undefined && status !== null ? 'p.status = :status' : '1=1', { status })
    .andWhere(dataInicio ? 'p.data_criacao >= :dataInicio' : '1=1', { dataInicio })
    .andWhere(dataFim ? 'p.data_criacao <= :dataFim' : '1=1', { dataFim })
    .groupBy('p.id')
    .addGroupBy('c.id')
    .orderBy('p.data_criacao', 'DESC')
    .offset((paginacao.pagina - 1) * paginacao.tamanhoPagina)
    .limit(paginacao.tamanhoPagina)
    .getRawAndEntities();

  const dados: PedidoResumoDto[] = pedidos.entities.map((pedido, idx) => ({
    id: pedido.id,
    clienteNome: pedido.cliente?.nome ?? '',
    dataCriacao: pedido.dataCriacao,
    dataEntrega: pedido.dataEntrega,
    valorTotal: Number(pedido.valorTotal),
    status: StatusPedidoLabel[pedido.status] || pedido.status.toString(),
    statusEnum: pedido.status,
    quantidadeItens: parseInt(pedidos.raw[idx]?.quantidadeItens || '0'),
  }));

  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, totalItens);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<PedidoDto | null> {
  const pedido = await pedidoRepo().findOne({
    where: { id },
    relations: ['cliente', 'itens', 'itens.produto'],
  });

  if (!pedido) return null;
  return mapToDto(pedido);
}

// ─── Criar (REGRA CRÍTICA: calcula valor total com preços do banco) ──
export async function criarAsync(
  dto: CriarPedidoDto,
): Promise<{ pedido: PedidoDto | null; erros: string[] | null }> {
  const erros: string[] = [];

  // Validar cliente
  const cliente = await clienteRepo().findOneBy({ id: dto.clienteId });
  if (!cliente) {
    erros.push('Cliente não encontrado.');
    return { pedido: null, erros };
  }

  // Buscar produtos e validar
  const produtoIds = dto.itens.map((i) => i.produtoId);
  const produtos = await produtoRepo().find({ where: { id: In(produtoIds) } });

  // Verificar produtos inexistentes
  const idsEncontrados = new Set(produtos.map((p) => p.id));
  const naoEncontrados = produtoIds.filter((id) => !idsEncontrados.has(id));
  if (naoEncontrados.length > 0) {
    erros.push(`Produtos não encontrados: ${naoEncontrados.join(', ')}`);
  }

  // Verificar produtos inativos
  const inativos = produtos.filter((p) => !p.ativo).map((p) => p.nome);
  if (inativos.length > 0) {
    erros.push(`Produtos inativos não podem ser adicionados: ${inativos.join(', ')}`);
  }

  if (erros.length > 0) {
    return { pedido: null, erros };
  }

  // REGRA CRÍTICA: Calcular valor total usando preços do banco
  const itens: Partial<ItemPedido>[] = [];
  let valorTotal = 0;

  for (const itemDto of dto.itens) {
    const produto = produtos.find((p) => p.id === itemDto.produtoId)!;
    const preco = Number(produto.preco);
    const subtotal = preco * itemDto.quantidade;
    valorTotal += subtotal;

    itens.push({
      produtoId: itemDto.produtoId,
      quantidade: itemDto.quantidade,
      precoUnitarioSnapshot: preco, // Snapshot de preço no momento da venda
    });
  }

  const pedido = pedidoRepo().create({
    clienteId: dto.clienteId,
    dataEntrega: dto.dataEntrega ?? null,
    valorTotal,
    status: StatusPedido.Pendente,
    observacoes: dto.observacoes ?? null,
    itens: itens as ItemPedido[],
  });

  const salvo = await pedidoRepo().save(pedido);

  // Recarregar com relações
  const pedidoCriado = await obterPorIdAsync(salvo.id);
  return { pedido: pedidoCriado, erros: null };
}

// ─── Atualizar Status ────────────────────────────────────────────────
export async function atualizarStatusAsync(
  id: number,
  dto: AtualizarStatusDto,
): Promise<PedidoDto | null> {
  const pedido = await pedidoRepo().findOneBy({ id });
  if (!pedido) return null;

  pedido.status = dto.status;

  // Se status for Entregue, registrar data de entrega automaticamente
  if (dto.status === StatusPedido.Entregue && !pedido.dataEntrega) {
    pedido.dataEntrega = new Date();
  }

  await pedidoRepo().save(pedido);
  return obterPorIdAsync(id);
}

// ─── Rotas de Entrega (hoje) ─────────────────────────────────────────
export async function obterRotasHojeAsync(): Promise<PedidoDto[]> {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  const amanha = new Date(hoje);
  amanha.setUTCDate(amanha.getUTCDate() + 1);

  const pedidos = await pedidoRepo()
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.cliente', 'c')
    .leftJoinAndSelect('p.itens', 'i')
    .leftJoinAndSelect('i.produto', 'pr')
    .where('(p.status = :pronto OR p.status = :emEntrega)', {
      pronto: StatusPedido.Pronto,
      emEntrega: StatusPedido.EmEntrega,
    })
    .andWhere('p.data_entrega IS NOT NULL')
    .andWhere('p.data_entrega >= :hoje', { hoje })
    .andWhere('p.data_entrega < :amanha', { amanha })
    .orderBy('p.data_entrega', 'ASC')
    .getMany();

  return pedidos.map(mapToDto);
}
