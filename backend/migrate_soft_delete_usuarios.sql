-- ============================================================
-- Migração: Soft Delete na tabela usuarios (DBA-005)
-- Execute no SQL Editor do Supabase
-- Data: 2026-03-08
-- ============================================================
--
-- Problema resolvido:
--   O DELETE físico impossibilitava auditoria e violava boas práticas
--   de LGPD (o "direito ao esquecimento" deve ser registrado, não
--   apagado silenciosamente sem rastreabilidade).
--
-- Solução:
--   Adicionar coluna deleted_at. Registros deletados ficam no banco com
--   o timestamp da deleção. Todas as queries de leitura filtram por
--   deleted_at IS NULL. A operação de "exclusão" vira um UPDATE.
-- ============================================================

-- 1. Adicionar a coluna de soft delete
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Índice parcial: acelera as queries do dia-a-dia que só lêem usuários ativos.
--    O índice é pequeno porque ignora linhas onde deleted_at IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_usuarios_ativos ON usuarios (id) WHERE deleted_at IS NULL;

-- ─── Verificar coluna adicionada ─────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios' AND column_name = 'deleted_at';
