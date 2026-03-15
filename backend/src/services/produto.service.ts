import { supabase } from '../config/database';
import { ProdutoDto, CriarProdutoDto, AtualizarProdutoDto } from '../dtos/produto.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(p: any): ProdutoDto {
  return {
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    descricao: p.descricao,
    preco: Number(p.preco),
    ativo: p.ativo,
    estoque: p.estoque ?? 0,
    dataCriacao: p.data_criacao,
  };
}

// ─── Listar (paginado + filtros) ─────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
  categoria?: string,
  apenasAtivos?: boolean,
): Promise<ResultadoPaginadoDto<ProdutoDto>> {
  let query = supabase
    .from('produtos')
    .select('*', { count: 'exact' });

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  if (apenasAtivos !== undefined && apenasAtivos !== null) {
    query = query.eq('ativo', apenasAtivos);
  }

  query = query
    .order('categoria', { ascending: true })
    .order('nome', { ascending: true })
    .range(
      (paginacao.pagina - 1) * paginacao.tamanhoPagina,
      paginacao.pagina * paginacao.tamanhoPagina - 1,
    );

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const dados = (data || []).map(mapToDto);
  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, count || 0);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<ProdutoDto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao obter produto: ${error.message}`);
  }
  if (!data) return null;
  return mapToDto(data);
}

// ─── Listar categorias ───────────────────────────────────────────────
export async function obterCategoriasAsync(): Promise<string[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('categoria');

  if (error) throw new Error(error.message);

  const categorias = [...new Set((data || []).map((p: any) => p.categoria as string))].sort();
  return categorias;
}

// ─── Sincronizar ativo ↔ estoque ─────────────────────────────────────
// Pedido mínimo = 100 unidades. Produto com estoque < 100 é inativado.
const PEDIDO_MINIMO = 100;

function sincronizarAtivo(dados: { estoque?: number; ativo?: boolean }): void {
  if (dados.estoque !== undefined) {
    dados.ativo = dados.estoque >= PEDIDO_MINIMO;
  }
}

// ─── Criar ───────────────────────────────────────────────────────────
export async function criarAsync(dto: CriarProdutoDto): Promise<ProdutoDto> {
  const estoque = dto.estoque ?? 0;
  const { data, error } = await supabase
    .from('produtos')
    .insert({
      nome: dto.nome,
      categoria: dto.categoria,
      descricao: dto.descricao ?? null,
      preco: dto.preco,
      ativo: estoque >= PEDIDO_MINIMO,
      estoque,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapToDto(data);
}

// ─── Atualizar ───────────────────────────────────────────────────────
export async function atualizarAsync(
  id: number,
  dto: AtualizarProdutoDto,
): Promise<ProdutoDto | null> {
  // Hook: estoque controla visibilidade
  const updatePayload: Record<string, unknown> = {
    nome: dto.nome,
    categoria: dto.categoria,
    descricao: dto.descricao ?? null,
    preco: dto.preco,
    ativo: dto.ativo,
    estoque: dto.estoque ?? 0,
  };
  sincronizarAtivo(updatePayload as { estoque?: number; ativo?: boolean });

  const { data, error } = await supabase
    .from('produtos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao atualizar produto: ${error.message}`);
  }
  if (!data) return null;
  return mapToDto(data);
}

// ─── Excluir ─────────────────────────────────────────────────────────
export async function excluirAsync(id: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false;
    throw new Error(`Erro ao excluir produto: ${error.message}`);
  }
  if (!data) return false;
  return true;
}
