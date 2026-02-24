import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido'),
  senha: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(1, 'Senha é obrigatória'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// ─── Respostas (interfaces puras — não precisam de validação) ────────
export interface UsuarioLogadoDto {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}

export interface LoginResponseDto {
  token: string;
  expiracao: Date;
  usuario: UsuarioLogadoDto;
}
