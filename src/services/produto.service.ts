import { AppDataSource } from '../config/database';
import { Produto } from '../models/Produto';
import { ProdutoDto, CriarProdutoDto, AtualizarProdutoDto } from '../dtos/produto.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';

const produtoRepo = () => AppDataSource.getRepository(Produto);

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(produto: Produto): ProdutoDto {
  return {
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    descricao: produto.descricao,
    preco: Number(produto.preco),
    ativo: produto.ativo,
    dataCriacao: produto.dataCriacao,
  };
}

// ─── Listar (paginado + filtros) ─────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
  categoria?: string,
  apenasAtivos?: boolean,
): Promise<ResultadoPaginadoDto<ProdutoDto>> {
  const repo = produtoRepo();
  const qb = repo.createQueryBuilder('p');

  if (categoria) {
    qb.andWhere('p.categoria = :categoria', { categoria });
  }

  if (apenasAtivos !== undefined && apenasAtivos !== null) {
    qb.andWhere('p.ativo = :ativo', { ativo: apenasAtivos });
  }

  const totalItens = await qb.getCount();

  qb.orderBy('p.categoria', 'ASC')
    .addOrderBy('p.nome', 'ASC')
    .skip((paginacao.pagina - 1) * paginacao.tamanhoPagina)
    .take(paginacao.tamanhoPagina);

  const produtos = await qb.getMany();
  const dados = produtos.map(mapToDto);

  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, totalItens);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<ProdutoDto | null> {
  const produto = await produtoRepo().findOneBy({ id });
  return produto ? mapToDto(produto) : null;
}

// ─── Listar categorias ───────────────────────────────────────────────
export async function obterCategoriasAsync(): Promise<string[]> {
  const result = await produtoRepo()
    .createQueryBuilder('p')
    .select('DISTINCT p.categoria', 'categoria')
    .orderBy('p.categoria', 'ASC')
    .getRawMany();

  return result.map((r) => r.categoria);
}

// ─── Criar ───────────────────────────────────────────────────────────
export async function criarAsync(dto: CriarProdutoDto): Promise<ProdutoDto> {
  const repo = produtoRepo();

  const produto = repo.create({
    nome: dto.nome,
    categoria: dto.categoria,
    descricao: dto.descricao ?? null,
    preco: dto.preco,
    ativo: dto.ativo,
  });

  const salvo = await repo.save(produto);
  return mapToDto(salvo);
}

// ─── Atualizar ───────────────────────────────────────────────────────
export async function atualizarAsync(
  id: number,
  dto: AtualizarProdutoDto,
): Promise<ProdutoDto | null> {
  const repo = produtoRepo();
  const produto = await repo.findOneBy({ id });
  if (!produto) return null;

  produto.nome = dto.nome;
  produto.categoria = dto.categoria;
  produto.descricao = dto.descricao ?? null;
  produto.preco = dto.preco;
  produto.ativo = dto.ativo;

  const salvo = await repo.save(produto);
  return mapToDto(salvo);
}

// ─── Excluir ─────────────────────────────────────────────────────────
export async function excluirAsync(id: number): Promise<boolean> {
  const produto = await produtoRepo().findOneBy({ id });
  if (!produto) return false;

  await produtoRepo().remove(produto);
  return true;
}
