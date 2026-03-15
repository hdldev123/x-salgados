-- ═══════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: RBAC — Coluna `role` na tabela `usuarios`
-- ═══════════════════════════════════════════════════════════════════════
--
-- CONTEXTO:
--   A tabela `usuarios` já possui a coluna `perfil INTEGER` que armazena
--   o papel do usuário (1=Administrador, 2=Atendente, 3=Entregador).
--   O backend já converte esse valor numérico para label via PerfilUsuarioLabel.
--
--   Esta migração adiciona uma coluna textual `role` como campo auxiliar,
--   permitindo queries diretas sem JOIN com enums. A coluna é populada
--   automaticamente a partir do valor existente em `perfil`.
--
-- EXECUÇÃO:
--   Execute este script no SQL Editor do Supabase uma única vez.
--   É idempotente (seguro para rodar mais de uma vez).
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna (idempotente — ignora se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'role'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) DEFAULT 'ATENDENTE' NOT NULL;
  END IF;
END $$;

-- 2. Preencher a coluna role baseado no perfil existente
UPDATE usuarios SET role = CASE perfil
  WHEN 1 THEN 'ADMINISTRADOR'
  WHEN 2 THEN 'ATENDENTE'
  WHEN 3 THEN 'ENTREGADOR'
  ELSE 'ATENDENTE'
END
WHERE role = 'ATENDENTE' OR role IS NULL;

-- 3. Constraint para garantir apenas valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'usuarios' AND constraint_name = 'chk_usuarios_role'
  ) THEN
    ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_role
      CHECK (role IN ('ADMINISTRADOR', 'ATENDENTE', 'ENTREGADOR'));
  END IF;
END $$;

-- 4. Índice para queries filtradas por role
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
