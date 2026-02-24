import { AppDataSource } from '../config/database';
import { Usuario } from '../models/Usuario';
import { PerfilUsuarioLabel } from '../models/enums';
import {
  UsuarioDto,
  CriarUsuarioDto,
  AtualizarUsuarioDto,
  AlterarSenhaDto,
} from '../dtos/usuario.dto';
import { PaginacaoDto, ResultadoPaginadoDto, criarResultadoPaginado } from '../dtos/common.dto';
import { hashSenha, verificarSenha } from './auth.service';
import { InvalidOperationError } from '../middlewares/error.middleware';

const usuarioRepo = () => AppDataSource.getRepository(Usuario);

// ─── Mapper ──────────────────────────────────────────────────────────
function mapToDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: PerfilUsuarioLabel[usuario.perfil] || usuario.perfil.toString(),
    dataCriacao: usuario.dataCriacao,
    ativo: usuario.ativo,
  };
}

// ─── Listar (paginado) ──────────────────────────────────────────────
export async function obterTodosAsync(
  paginacao: PaginacaoDto,
): Promise<ResultadoPaginadoDto<UsuarioDto>> {
  const repo = usuarioRepo();

  const totalItens = await repo.count();

  const usuarios = await repo.find({
    order: { dataCriacao: 'DESC' },
    skip: (paginacao.pagina - 1) * paginacao.tamanhoPagina,
    take: paginacao.tamanhoPagina,
  });

  const dados = usuarios.map(mapToDto);
  return criarResultadoPaginado(dados, paginacao.pagina, paginacao.tamanhoPagina, totalItens);
}

// ─── Buscar por ID ───────────────────────────────────────────────────
export async function obterPorIdAsync(id: number): Promise<UsuarioDto | null> {
  const usuario = await usuarioRepo().findOneBy({ id });
  return usuario ? mapToDto(usuario) : null;
}

// ─── Criar ───────────────────────────────────────────────────────────
export async function criarAsync(dto: CriarUsuarioDto): Promise<UsuarioDto> {
  const repo = usuarioRepo();

  // Validação de email único (correção de segurança)
  const emailExiste = await repo.findOneBy({ email: dto.email });
  if (emailExiste) {
    throw new InvalidOperationError('Já existe um usuário cadastrado com este email.');
  }

  const senhaHasheada = await hashSenha(dto.senha);

  const usuario = repo.create({
    nome: dto.nome,
    email: dto.email,
    senhaHash: senhaHasheada,
    perfil: dto.perfil,
    ativo: true,
  });

  const salvo = await repo.save(usuario);
  return mapToDto(salvo);
}

// ─── Atualizar ───────────────────────────────────────────────────────
export async function atualizarAsync(
  id: number,
  dto: AtualizarUsuarioDto,
): Promise<UsuarioDto | null> {
  const repo = usuarioRepo();
  const usuario = await repo.findOneBy({ id });
  if (!usuario) return null;

  usuario.nome = dto.nome;
  usuario.email = dto.email;
  usuario.perfil = dto.perfil;
  usuario.ativo = dto.ativo;

  await repo.save(usuario);
  return mapToDto(usuario);
}

// ─── Excluir (com proteção contra auto-exclusão) ─────────────────────
export async function excluirAsync(id: number, usuarioLogadoId: number): Promise<boolean> {
  if (id === usuarioLogadoId) {
    throw new InvalidOperationError('Você não pode excluir a si mesmo.');
  }

  const usuario = await usuarioRepo().findOneBy({ id });
  if (!usuario) return false;

  await usuarioRepo().remove(usuario);
  return true;
}

// ─── Alterar Senha ───────────────────────────────────────────────────
export async function alterarSenhaAsync(id: number, dto: AlterarSenhaDto): Promise<boolean> {
  const usuario = await usuarioRepo().findOneBy({ id });
  if (!usuario) return false;

  const senhaCorreta = await verificarSenha(dto.senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) {
    throw new InvalidOperationError('Senha atual incorreta.');
  }

  usuario.senhaHash = await hashSenha(dto.novaSenha);
  await usuarioRepo().save(usuario);
  return true;
}
