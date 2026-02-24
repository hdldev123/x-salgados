import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Usuario } from '../models/Usuario';
import { PerfilUsuarioLabel } from '../models/enums';
import { LoginDto, LoginResponseDto } from '../dtos/auth.dto';

const usuarioRepo = () => AppDataSource.getRepository(Usuario);

const BCRYPT_ROUNDS = 12;

/**
 * Realiza login e retorna JWT + dados do usuário.
 * Equivale a AuthService.LoginAsync() do C#.
 */
export async function loginAsync(dto: LoginDto): Promise<LoginResponseDto | null> {
  const usuario = await usuarioRepo().findOne({
    where: { email: dto.email, ativo: true },
  });

  if (!usuario) return null;

  const senhaValida = await verificarSenha(dto.senha, usuario.senhaHash);
  if (!senhaValida) return null;

  const token = gerarToken(usuario);
  const horasExpiracao = parseInt(process.env.JWT_EXPIRES_HOURS || '8');
  const expiracao = new Date(Date.now() + horasExpiracao * 60 * 60 * 1000);

  return {
    token,
    expiracao,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: PerfilUsuarioLabel[usuario.perfil] || usuario.perfil.toString(),
    },
  };
}

/**
 * Gera hash bcrypt da senha.
 * CORREÇÃO DE SEGURANÇA: substitui SHA256 puro por bcrypt com salt.
 */
export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

/**
 * Verifica senha contra hash bcrypt.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Gera token JWT com claims equivalentes ao .NET.
 */
function gerarToken(usuario: Usuario): string {
  const jwtKey = process.env.JWT_KEY;
  if (!jwtKey) {
    throw new Error('FATAL: A chave JWT não foi configurada. Defina JWT_KEY no .env');
  }

  const horasExpiracao = parseInt(process.env.JWT_EXPIRES_HOURS || '8');

  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: PerfilUsuarioLabel[usuario.perfil] || usuario.perfil.toString(),
  };

  return jwt.sign(payload, jwtKey, {
    issuer: process.env.JWT_ISSUER || 'XSalgadosApi',
    audience: process.env.JWT_AUDIENCE || 'XSalgadosApp',
    expiresIn: `${horasExpiracao}h`,
  });
}
