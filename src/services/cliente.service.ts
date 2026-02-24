import { AppDataSource } from '../config/database';
import { Cliente } from '../models/Cliente';
import { Pedido } from '../models/Pedido';
import { ClienteDto, CriarClienteDto, AtualizarClienteDto } from '../dtos/cliente.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';
import { ILike } from 'typeorm';

const clienteRepo = () => AppDataSource.getRepository(Cliente);
const pedidoRepo = () => AppDataSource.getRepository(Pedido);

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(cliente: Cliente, totalPedidos: number): ClienteDto {
  return {
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    email: cliente.email,
    endereco: cliente.endereco,
    cidade: cliente.cidade,
    cep: cliente.cep,
    dataCriacao: cliente.dataCriacao,
    totalPedidos,
  };
}

// ─── Listar (paginado + busca) ───────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
  busca?: string,
): Promise<ResultadoPaginadoDto<ClienteDto>> {
  const repo = clienteRepo();
  const qb = repo
    .createQueryBuilder('c')
    .leftJoin('c.pedidos', 'p')
    .addSelect('COUNT(p.id)', 'totalPedidos')
    .groupBy('c.id');

  if (busca) {
    const termo = `%${busca.toLowerCase()}%`;
    qb.where(
      'LOWER(c.nome) LIKE :termo OR c.telefone LIKE :termo OR LOWER(c.email) LIKE :termo',
      { termo },
    );
  }

  // Total antes da paginação
  const totalItens = await (() => {
    const countQb = repo.createQueryBuilder('c');
    if (busca) {
      const termo = `%${busca.toLowerCase()}%`;
      countQb.where(
        'LOWER(c.nome) LIKE :termo OR c.telefone LIKE :termo OR LOWER(c.email) LIKE :termo',
        { termo },
      );
    }
    return countQb.getCount();
  })();

  qb.orderBy('c.data_criacao', 'DESC')
    .offset((paginacao.pagina - 1) * paginacao.tamanhoPagina)
    .limit(paginacao.tamanhoPagina);

  const rawResults = await qb.getRawAndEntities();

  const dados: ClienteDto[] = rawResults.entities.map((cliente, idx) => {
    const raw = rawResults.raw[idx];
    return mapToDto(cliente, parseInt(raw.totalPedidos || '0'));
  });

  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, totalItens);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<ClienteDto | null> {
  const cliente = await clienteRepo().findOne({
    where: { id },
    relations: ['pedidos'],
  });

  if (!cliente) return null;
  return mapToDto(cliente, cliente.pedidos?.length || 0);
}

// ─── Criar ───────────────────────────────────────────────────────────
export async function criarAsync(dto: CriarClienteDto): Promise<ClienteDto> {
  const repo = clienteRepo();

  const cliente = repo.create({
    nome: dto.nome,
    telefone: dto.telefone,
    email: dto.email ?? null,
    endereco: dto.endereco ?? null,
    cidade: dto.cidade ?? null,
    cep: dto.cep ?? null,
  });

  const salvo = await repo.save(cliente);
  return mapToDto(salvo, 0);
}

// ─── Atualizar ───────────────────────────────────────────────────────
export async function atualizarAsync(
  id: number,
  dto: AtualizarClienteDto,
): Promise<ClienteDto | null> {
  const repo = clienteRepo();
  const cliente = await repo.findOneBy({ id });
  if (!cliente) return null;

  cliente.nome = dto.nome;
  cliente.telefone = dto.telefone;
  cliente.email = dto.email ?? null;
  cliente.endereco = dto.endereco ?? null;
  cliente.cidade = dto.cidade ?? null;
  cliente.cep = dto.cep ?? null;

  await repo.save(cliente);
  return obterPorIdAsync(id);
}

// ─── Excluir ─────────────────────────────────────────────────────────
export async function excluirAsync(
  id: number,
): Promise<{ sucesso: boolean; mensagemErro?: string }> {
  const cliente = await clienteRepo().findOne({
    where: { id },
    relations: ['pedidos'],
  });

  if (!cliente) {
    return { sucesso: false, mensagemErro: 'Cliente não encontrado.' };
  }

  if (cliente.pedidos && cliente.pedidos.length > 0) {
    return {
      sucesso: false,
      mensagemErro: 'Não é possível excluir o cliente pois existem pedidos vinculados.',
    };
  }

  await clienteRepo().remove(cliente);
  return { sucesso: true };
}
