import { supabase } from '../config/database';
import { StatusPedido, StatusPedidoLabel } from '../models/enums';
import {
  CriarPedidoDto,
  AtualizarStatusDto,
  PedidoDto,
  PedidoResumoDto,
  ItemPedidoResponseDto,
  LoteEntregaDto,
  LoteEmAndamentoDto,
} from '../dtos/pedido.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(pedido: any): PedidoDto {
  return {
    id: pedido.id,
    clienteId: pedido.cliente_id,
    clienteNome: pedido.clientes?.nome ?? '',
    clienteTelefone: pedido.clientes?.telefone ?? null,
    clienteEndereco: pedido.clientes?.endereco ?? null,
    dataCriacao: pedido.data_criacao,
    dataEntrega: pedido.data_entrega,
    valorTotal: Number(pedido.valor_total),
    status: StatusPedidoLabel[pedido.status as StatusPedido] || pedido.status.toString(),
    statusEnum: pedido.status,
    observacoes: pedido.observacoes,
    itens: (pedido.itens_pedido || []).map(
      (i: any): ItemPedidoResponseDto => ({
        id: i.id,
        produtoId: i.produto_id,
        produtoNome: i.produtos?.nome ?? '',
        quantidade: i.quantidade,
        precoUnitario: Number(i.preco_unitario_snapshot),
        subtotal: i.quantidade * Number(i.preco_unitario_snapshot),
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
  let query = supabase
    .from('pedidos')
    .select('*, clientes(nome), itens_pedido(quantidade)', { count: 'exact' });

  if (status !== undefined && status !== null) {
    query = query.eq('status', status);
  }

  if (dataInicio) {
    query = query.gte('data_criacao', dataInicio);
  }

  if (dataFim) {
    query = query.lte('data_criacao', dataFim);
  }

  query = query
    .order('data_criacao', { ascending: false })
    .range(
      (paginacao.pagina - 1) * paginacao.tamanhoPagina,
      paginacao.pagina * paginacao.tamanhoPagina - 1,
    );

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const dados: PedidoResumoDto[] = (data || []).map((pedido: any) => ({
    id: pedido.id,
    clienteNome: pedido.clientes?.nome ?? '',
    dataCriacao: pedido.data_criacao,
    dataEntrega: pedido.data_entrega,
    valorTotal: Number(pedido.valor_total),
    status: StatusPedidoLabel[pedido.status as StatusPedido] || pedido.status.toString(),
    statusEnum: pedido.status,
    quantidadeItens: (pedido.itens_pedido || []).reduce(
      (sum: number, i: any) => sum + i.quantidade, 0,
    ),
  }));

  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, count || 0);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<PedidoDto | null> {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('*, clientes(*), itens_pedido(*, produtos(*))')
    .eq('id', id)
    .single();

  if (error || !pedido) return null;
  return mapToDto(pedido);
}

// ─── Criar (REGRA CRÍTICA: calcula valor total com preços do banco) ──
export async function criarAsync(
  dto: CriarPedidoDto,
): Promise<{ pedido: PedidoDto | null; erros: string[] | null }> {
  const erros: string[] = [];

  // Validar cliente
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', dto.clienteId)
    .single();

  if (clienteError || !cliente) {
    erros.push('Cliente não encontrado.');
    return { pedido: null, erros };
  }

  // Buscar produtos e validar
  const produtoIds = dto.itens.map((i) => i.produtoId);
  const { data: produtos, error: produtoError } = await supabase
    .from('produtos')
    .select('*')
    .in('id', produtoIds);

  if (produtoError) throw new Error(produtoError.message);

  // Verificar produtos inexistentes
  const idsEncontrados = new Set((produtos || []).map((p: any) => p.id));
  const naoEncontrados = produtoIds.filter((pid) => !idsEncontrados.has(pid));
  if (naoEncontrados.length > 0) {
    erros.push(`Produtos não encontrados: ${naoEncontrados.join(', ')}`);
  }

  // Verificar produtos inativos
  const inativos = (produtos || []).filter((p: any) => !p.ativo).map((p: any) => p.nome);
  if (inativos.length > 0) {
    erros.push(`Produtos inativos não podem ser adicionados: ${inativos.join(', ')}`);
  }

  if (erros.length > 0) {
    return { pedido: null, erros };
  }

  // REGRA CRÍTICA: Calcular valor total usando preços do banco
  const itensParaInserir: any[] = [];
  let valorTotal = 0;

  for (const itemDto of dto.itens) {
    const produto = (produtos || []).find((p: any) => p.id === itemDto.produtoId)!;
    const preco = Number(produto.preco);
    const subtotal = preco * itemDto.quantidade;
    valorTotal += subtotal;

    itensParaInserir.push({
      produto_id: itemDto.produtoId,
      quantidade: itemDto.quantidade,
      preco_unitario_snapshot: preco, // Snapshot de preço no momento da venda
    });
  }

  // Inserir pedido
  const { data: pedidoCriado, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: dto.clienteId,
      data_entrega: dto.dataEntrega ?? null,
      valor_total: valorTotal,
      status: StatusPedido.Pendente,
      observacoes: dto.observacoes ?? null,
    })
    .select()
    .single();

  if (pedidoError) throw new Error(pedidoError.message);

  // Inserir itens vinculados ao pedido
  const itensComPedidoId = itensParaInserir.map((item) => ({
    ...item,
    pedido_id: pedidoCriado.id,
  }));

  const { error: itensError } = await supabase
    .from('itens_pedido')
    .insert(itensComPedidoId);

  if (itensError) {
    // Rollback: remove o pedido se os itens falharem
    await supabase.from('pedidos').delete().eq('id', pedidoCriado.id);
    throw new Error(itensError.message);
  }

  // Recarregar com relações
  const pedido = await obterPorIdAsync(pedidoCriado.id);
  return { pedido, erros: null };
}

// ─── Atualizar Status ────────────────────────────────────────────────
export async function atualizarStatusAsync(
  id: number,
  dto: AtualizarStatusDto,
): Promise<PedidoDto | null> {
  const { data: pedido, error: findError } = await supabase
    .from('pedidos')
    .select('id, data_entrega')
    .eq('id', id)
    .single();

  if (findError || !pedido) return null;

  const updateData: any = { status: dto.status };

  // Se status for Entregue, registrar data de entrega automaticamente
  if (dto.status === StatusPedido.Entregue && !pedido.data_entrega) {
    updateData.data_entrega = new Date().toISOString();
  }

  const { error } = await supabase
    .from('pedidos')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(error.message);

  return obterPorIdAsync(id);
}

// ─── Lote de Entrega (pedidos prontos acumulados) ────────────────────
/**
 * Busca todos os pedidos com status PRONTO (3), incluindo seus itens,
 * e calcula o total acumulado de unidades (soma de quantidade em itens_pedido).
 * A lógica de "lote" define que o motoboy só pode sair quando >= 900 itens.
 */
export async function obterLoteEntregaAsync(): Promise<LoteEntregaDto> {
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, clientes(*), itens_pedido(*, produtos(*))')
    .eq('status', StatusPedido.Pronto)
    .order('data_criacao', { ascending: true });

  if (error) throw new Error(error.message);

  const pedidosMapeados = (pedidos || []).map(mapToDto);

  // Somar TODAS as quantidades de itens de todos os pedidos prontos
  const totalItensAcumulados = (pedidos || []).reduce((acc, pedido) => {
    const itensPedido = pedido.itens_pedido || [];
    return acc + itensPedido.reduce((sum: number, item: any) => sum + item.quantidade, 0);
  }, 0);

  return {
    pedidosProntos: pedidosMapeados,
    totalItensAcumulados,
  };
}

// ─── Liberar Lote (Pronto → Em Entrega em massa) ─────────────────────
/**
 * Move TODOS os pedidos com status Pronto(3) para Em Entrega(4) de uma vez.
 * Retorna a quantidade de pedidos afetados.
 */
export async function liberarLoteAsync(): Promise<{ pedidosAfetados: number }> {
  // Buscar IDs dos pedidos prontos
  const { data: pedidosProntos, error: findError } = await supabase
    .from('pedidos')
    .select('id')
    .eq('status', StatusPedido.Pronto);

  if (findError) throw new Error(findError.message);
  if (!pedidosProntos || pedidosProntos.length === 0) {
    return { pedidosAfetados: 0 };
  }

  const ids = pedidosProntos.map((p: any) => p.id);

  const { error: updateError } = await supabase
    .from('pedidos')
    .update({ status: StatusPedido.EmEntrega })
    .in('id', ids);

  if (updateError) throw new Error(updateError.message);

  return { pedidosAfetados: ids.length };
}

// ─── Pedidos Em Trânsito ─────────────────────────────────────────────
/**
 * Busca todos os pedidos com status Em Entrega(4), incluindo itens e clientes.
 */
export async function obterPedidosEmTransitoAsync(): Promise<LoteEmAndamentoDto> {
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, clientes(*), itens_pedido(*, produtos(*))')
    .eq('status', StatusPedido.EmEntrega)
    .order('data_criacao', { ascending: true });

  if (error) throw new Error(error.message);

  const pedidosMapeados = (pedidos || []).map(mapToDto);
  const valorTotal = pedidosMapeados.reduce((acc, p) => acc + p.valorTotal, 0);

  return {
    pedidosEmTransito: pedidosMapeados,
    totalPedidos: pedidosMapeados.length,
    valorTotal,
  };
}
