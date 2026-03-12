import { supabase } from '../config/database';
import { ClienteDto, CriarClienteDto, AtualizarClienteDto } from '../dtos/cliente.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(c: any): ClienteDto {
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    endereco: c.endereco,
    cidade: c.cidade,
    cep: c.cep,
    dataCriacao: c.data_criacao,
    totalPedidos: Array.isArray(c.pedidos) ? c.pedidos.length : 0,
  };
}

// ─── Listar (paginado + busca) ───────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
  busca?: string,
): Promise<ResultadoPaginadoDto<ClienteDto>> {
  let query = supabase
    .from('clientes')
    .select('*, pedidos(id)', { count: 'exact' });

  if (busca) {
    const termo = `%${busca}%`;
    query = query.or(`nome.ilike.${termo},telefone.ilike.${termo},email.ilike.${termo}`);
  }

  query = query
    .order('data_criacao', { ascending: false })
    .range(
      (paginacao.pagina - 1) * paginacao.tamanhoPagina,
      paginacao.pagina * paginacao.tamanhoPagina - 1,
    );

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const dados: ClienteDto[] = (data || []).map(mapToDto);
  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, count || 0);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<ClienteDto | null> {
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*, pedidos(id)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao obter cliente: ${error.message}`);
  }
  if (!cliente) return null;
  return mapToDto(cliente);
}

// ─── Criar ───────────────────────────────────────────────────────────
export async function criarAsync(dto: CriarClienteDto): Promise<ClienteDto> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome: dto.nome,
      telefone: dto.telefone,
      email: dto.email ?? null,
      endereco: dto.endereco ?? null,
      cidade: dto.cidade ?? null,
      cep: dto.cep ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    nome: data.nome,
    telefone: data.telefone,
    email: data.email,
    endereco: data.endereco,
    cidade: data.cidade,
    cep: data.cep,
    dataCriacao: data.data_criacao,
    totalPedidos: 0,
  };
}

// ─── Atualizar ───────────────────────────────────────────────────────
export async function atualizarAsync(
  id: number,
  dto: AtualizarClienteDto,
): Promise<ClienteDto | null> {
  const { error } = await supabase
    .from('clientes')
    .update({
      nome: dto.nome,
      telefone: dto.telefone,
      email: dto.email ?? null,
      endereco: dto.endereco ?? null,
      cidade: dto.cidade ?? null,
      cep: dto.cep ?? null,
    })
    .eq('id', id);

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao atualizar cliente: ${error.message}`);
  }
  return obterPorIdAsync(id);
}

// ─── Excluir ─────────────────────────────────────────────────────────
export async function excluirAsync(
  id: number,
): Promise<{ sucesso: boolean; mensagemErro?: string }> {
  // Verificar se cliente existe
  const { data: cliente, error: findError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', id)
    .single();

  if (findError || !cliente) {
    return { sucesso: false, mensagemErro: 'Cliente não encontrado.' };
  }

  // Verificar se tem pedidos em andamento (status diferente de Entregue=5 e Cancelado=6)
  const { count, error: countError } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)
    .not('status', 'in', '(5,6)');

  if (countError) {
    throw new Error(`Erro ao verificar pedidos: ${countError.message}`);
  }

  if (count !== null && count > 0) {
    return {
      sucesso: false,
      mensagemErro: 'Não é possível excluir um cliente com pedidos em andamento. Cancele ou conclua os pedidos primeiro.',
    };
  }

  // Buscar IDs dos pedidos concluídos/cancelados para remover itens primeiro
  const { data: pedidosParaExcluir } = await supabase
    .from('pedidos')
    .select('id')
    .eq('cliente_id', id)
    .in('status', [5, 6]);

  if (pedidosParaExcluir && pedidosParaExcluir.length > 0) {
    const pedidoIds = pedidosParaExcluir.map((p: any) => p.id);

    // Excluir itens dos pedidos
    await supabase
      .from('itens_pedido')
      .delete()
      .in('pedido_id', pedidoIds);

    // Excluir os pedidos
    await supabase
      .from('pedidos')
      .delete()
      .in('id', pedidoIds);
  }

  // Agora excluir o cliente
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503' || error.message?.includes('foreign key')) {
      return {
        sucesso: false,
        mensagemErro: 'Não é possível excluir o cliente pois ainda existem registros vinculados.',
      };
    }
    throw new Error(error.message);
  }
  return { sucesso: true };
}
