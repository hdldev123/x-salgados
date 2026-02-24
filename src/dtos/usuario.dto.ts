import { z } from 'zod';
import { PerfilUsuario } from '../models/enums';

// ─── Criar Usuário ───────────────────────────────────────────────────
export const CriarUsuarioSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido')
    .max(150, 'Email deve ter no máximo 150 caracteres'),
  senha: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
  perfil: z.nativeEnum(PerfilUsuario, { required_error: 'Perfil é obrigatório' }),
});
export type CriarUsuarioDto = z.infer<typeof CriarUsuarioSchema>;

// ─── Atualizar Usuário ──────────────────────────────────────────────
export const AtualizarUsuarioSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido')
    .max(150, 'Email deve ter no máximo 150 caracteres'),
  perfil: z.nativeEnum(PerfilUsuario, { required_error: 'Perfil é obrigatório' }),
  ativo: z.boolean().default(true),
});
export type AtualizarUsuarioDto = z.infer<typeof AtualizarUsuarioSchema>;

// ─── Alterar Senha ──────────────────────────────────────────────────
export const AlterarSenhaSchema = z.object({
  senhaAtual: z
    .string({ required_error: 'Senha atual é obrigatória' })
    .min(1, 'Senha atual é obrigatória'),
  novaSenha: z
    .string({ required_error: 'Nova senha é obrigatória' })
    .min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});
export type AlterarSenhaDto = z.infer<typeof AlterarSenhaSchema>;

// ─── Response DTO ───────────────────────────────────────────────────
export interface UsuarioDto {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  dataCriacao: Date;
  ativo: boolean;
}
