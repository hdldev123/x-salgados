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

interface ItemPedidoBanco {
  id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario_snapshot: string | number;
  produtos?: { nome: string };
}

interface PedidoBanco {
  id: number;
  cliente_id: number;
  data_criacao: string;
  data_entrega: string | null;
  valor_total: string | number;
  status: number;
  observacoes: string | null;
  clientes?: { nome: string; telefone: string | null; endereco: string | null };
  itens_pedido?: ItemPedidoBanco[];
}

interface PedidoResumoBanco {
  id: number;
  cliente_id: number;
  data_criacao: string;
  data_entrega: string | null;
  valor_total: string | number;
  status: number;
  clientes?: { nome: string };
  itens_pedido?: { quantidade: number }[];
}

interface ProdutoBanco {
  id: number;
  nome: string;
  preco: string | number;
  ativo: boolean;
}

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(pedido: PedidoBanco): PedidoDto {
  return {
    id: pedido.id,
    clienteId: pedido.cliente_id,
    clienteNome: pedido.clientes?.nome ?? '',
    clienteTelefone: pedido.clientes?.telefone ?? null,
    clienteEndereco: pedido.clientes?.endereco ?? null,
    dataCriacao: new Date(pedido.data_criacao),
    dataEntrega: pedido.data_entrega ? new Date(pedido.data_entrega) : null,
    valorTotal: Number(pedido.valor_total),
    status: StatusPedidoLabel[pedido.status as StatusPedido] || pedido.status.toString(),
    statusEnum: pedido.status,
    observacoes: pedido.observacoes,
    itens: (pedido.itens_pedido || []).map(
      (i: ItemPedidoBanco): ItemPedidoResponseDto => ({
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

  const dados: PedidoResumoDto[] = (data || []).map((pedido: PedidoResumoBanco) => ({
    id: pedido.id,
    clienteId: pedido.cliente_id,
    clienteNome: pedido.clientes?.nome ?? '',
    dataCriacao: new Date(pedido.data_criacao),
    dataEntrega: pedido.data_entrega ? new Date(pedido.data_entrega) : null,
    valorTotal: Number(pedido.valor_total),
    status: StatusPedidoLabel[pedido.status as StatusPedido] || pedido.status.toString(),
    statusEnum: pedido.status,
    quantidadeItens: (pedido.itens_pedido || []).reduce(
      (sum: number, i: { quantidade: number }) => sum + i.quantidade, 0,
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

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar pedido: ${error.message}`);
  }
  if (!pedido) return null;
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
    .select('id, nome, preco, ativo')
    .in('id', produtoIds);

  if (produtoError) throw new Error(produtoError.message);

  // Verificar produtos inexistentes
  const idsEncontrados = new Set((produtos || []).map((p: ProdutoBanco) => p.id));
  const naoEncontrados = produtoIds.filter((pid) => !idsEncontrados.has(pid));
  if (naoEncontrados.length > 0) {
    erros.push(`Produtos não encontrados: ${naoEncontrados.join(', ')}`);
  }

  // Verificar produtos inativos
  const inativos = (produtos || []).filter((p: ProdutoBanco) => !p.ativo).map((p: ProdutoBanco) => p.nome);
  if (inativos.length > 0) {
    erros.push(`Produtos inativos não podem ser adicionados: ${inativos.join(', ')}`);
  }

  if (erros.length > 0) {
    return { pedido: null, erros };
  }

  // REGRA CRÍTICA: Calcular valor total usando preços do banco
  const itensParaInserir: { produto_id: number; quantidade: number; preco_unitario_snapshot: number }[] = [];
  let valorTotal = 0;

  for (const itemDto of dto.itens) {
    const produto = (produtos || []).find((p: ProdutoBanco) => p.id === itemDto.produtoId)!;
    const preco = Number(produto.preco);
    const subtotal = preco * itemDto.quantidade;
    valorTotal += subtotal;

    itensParaInserir.push({
      produto_id: itemDto.produtoId,
      quantidade: itemDto.quantidade,
      preco_unitario_snapshot: preco, // Snapshot de preço no momento da venda
    });
  }

  // Criar pedido + itens em uma única transação atômica via RPC.
  // Se qualquer INSERT falhar, o Postgres desfaz TUDO automaticamente —
  // sem risco de "pedidos fantasma" deixados para trás.
  const { data: pedidoId, error: rpcError } = await supabase.rpc('criar_pedido_atomico', {
    p_cliente_id: dto.clienteId,
    p_data_entrega: dto.dataEntrega ?? null,
    p_valor_total: valorTotal,
    p_status: StatusPedido.Pendente,
    p_observacoes: dto.observacoes ?? null,
    p_itens: itensParaInserir.map((item) => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario_snapshot: item.preco_unitario_snapshot,
    })),
  });

  if (rpcError) throw new Error(rpcError.message);

  // Decrementar estoque de cada produto e auto-desativar se zerou
  for (const item of itensParaInserir) {
    const { error: estoqueErr } = await supabase.rpc('decrementar_estoque', {
      p_produto_id: item.produto_id,
      p_quantidade: item.quantidade,
    });
    if (estoqueErr) {
      console.error(`[PedidoService] Erro ao decrementar estoque do produto ${item.produto_id}:`, estoqueErr.message);
    }

    // Verificar se estoque zerou → desativar produto automaticamente
    const { data: produtoAtual } = await supabase
      .from('produtos')
      .select('estoque')
      .eq('id', item.produto_id)
      .single();

    if (produtoAtual && produtoAtual.estoque <= 0) {
      await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', item.produto_id);
      console.log(`[PedidoService] Produto ${item.produto_id} desativado automaticamente (estoque zerado).`);
    }
  }

  // Recarregar com relações
  const pedido = await obterPorIdAsync(pedidoId as number);
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

  if (findError) {
    if (findError.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar pedido para atualização: ${findError.message}`);
  }
  if (!pedido) return null;

  const updateData: Partial<PedidoBanco> = { status: dto.status };

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

  // Mapear para DTO e injetar totalItens por pedido (Null Safety via ?.)
  const pedidosProntos = (pedidos || []).map((pedidoRaw: any) => {
    const dto = mapToDto(pedidoRaw);
    dto.totalItens = (pedidoRaw.itens_pedido || []).reduce(
      (sum: number, item: ItemPedidoBanco) => sum + item.quantidade, 0
    );
    return dto;
  });

  // Somar TODAS as quantidades de itens de todos os pedidos prontos
  const totalLote = (pedidos || []).reduce((acc, pedido) => {
    const itensPedido = pedido.itens_pedido || [];
    return acc + itensPedido.reduce((sum: number, item: ItemPedidoBanco) => sum + item.quantidade, 0);
  }, 0);

  return {
    pedidosProntos,
    totalLote,
  };
}

// ─── Liberar Lote (Pronto → Em Entrega em massa) ─────────────────────
/**
 * Move apenas os pedidos cujos IDs foram informados de Pronto(3) para Em Entrega(4).
 * Garante que só atualiza pedidos que ainda estejam com status Pronto.
 * @param pedidoIds - IDs dos pedidos a serem liberados (vindos do frontend por lote).
 */
export async function liberarLoteAsync(pedidoIds: number[]): Promise<{ pedidosAfetados: number }> {
  if (!pedidoIds || pedidoIds.length === 0) {
    return { pedidosAfetados: 0 };
  }

  // Atualizar apenas os pedidos que estão com status Pronto E cujos IDs foram informados
  const { data: atualizados, error: updateError } = await supabase
    .from('pedidos')
    .update({ status: StatusPedido.EmEntrega })
    .in('id', pedidoIds)
    .eq('status', StatusPedido.Pronto)
    .select('id');

  if (updateError) throw new Error(updateError.message);

  return { pedidosAfetados: atualizados?.length ?? 0 };
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
