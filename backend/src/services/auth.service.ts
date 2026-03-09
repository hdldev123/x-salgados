import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { PerfilUsuario, PerfilUsuarioLabel } from '../models/enums';
import { LoginDto, LoginResponseDto } from '../dtos/auth.dto';

interface UsuarioToken {
  id: number;
  nome: string;
  email: string;
  perfil: number | string;
}

const BCRYPT_ROUNDS = 12;

// ─── Validação do JWT_KEY na inicialização ────────────────────────────────────
// Falha imediatamente (fail-fast) se a chave for fraca ou não configurada.
// Isso impede que o servidor rode com uma chave insegura sem aviso.
(function validarJwtKey() {
  const key = process.env.JWT_KEY ?? '';

  if (!key) {
    throw new Error('[FATAL] JWT_KEY não definida no .env. O servidor não pode iniciar.');
  }
  if (key.startsWith('eyJ')) {
    throw new Error(
      '[FATAL] JWT_KEY parece ser um token JWT, não uma chave secreta. ' +
      'Gere um segredo seguro com: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
  }
  if (key.length < 32) {
    throw new Error(
      `[FATAL] JWT_KEY muito curta (${key.length} caracteres). ` +
      'Use uma chave de pelo menos 32 caracteres aleatórios.',
    );
  }
})();


/**
 * Realiza login e retorna JWT + dados do usuário.

 */
export async function loginAsync(dto: LoginDto): Promise<LoginResponseDto | null> {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, senha_hash, perfil, ativo')
    .eq('email', dto.email)
    .eq('ativo', true)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao tentar realizar login: ${error.message}`);
  }
  if (!usuario) return null;

  const senhaValida = await verificarSenha(dto.senha, usuario.senha_hash);
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
      perfil: PerfilUsuarioLabel[usuario.perfil as PerfilUsuario] || usuario.perfil.toString(),
    },
  };
}

/**
 * Gera hash bcrypt da senha.
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
 * Gera token JWT.
 */
function gerarToken(usuario: UsuarioToken): string {
  const jwtKey = process.env.JWT_KEY;
  if (!jwtKey) {
    throw new Error('FATAL: A chave JWT não foi configurada. Defina JWT_KEY no .env');
  }

  const horasExpiracao = parseInt(process.env.JWT_EXPIRES_HOURS || '8');

  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: PerfilUsuarioLabel[usuario.perfil as PerfilUsuario] || usuario.perfil.toString(),
  };

  return jwt.sign(payload, jwtKey, {
    issuer: process.env.JWT_ISSUER || 'XSalgadosApi',
    audience: process.env.JWT_AUDIENCE || 'XSalgadosApp',
    expiresIn: `${horasExpiracao}h`,
  });
}
