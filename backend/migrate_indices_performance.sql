-- ============================================================
-- Migração: Índices de performance (DBA-002 / DBA-004)
-- Execute no SQL Editor do Supabase
-- Data: 2026-03-07
-- ============================================================

-- ─── pedidos ─────────────────────────────────────────────────
-- Índice composto para queries que filtram status E ordenam por data
-- (usado em listarPedidos, dashboard, relatórios)
CREATE INDEX IF NOT EXISTS idx_pedidos_status_data
    ON pedidos(status, data_criacao DESC);

-- Garante DESC em data_criacao para ORDER BY data_criacao DESC
-- que é o padrão nas listagens paginadas (evita sort extra)
CREATE INDEX IF NOT EXISTS idx_pedidos_data_criacao_desc
    ON pedidos(data_criacao DESC);

-- ─── clientes ────────────────────────────────────────────────
-- Necessário após correção DBA-002 (busca direta por telefone no banco)
-- Sem esse índice a query .or(telefone.eq.X) ainda faz sequential scan
CREATE INDEX IF NOT EXISTS idx_clientes_telefone
    ON clientes(telefone);

-- Índice para busca por whatsapp_lid (fallback quando JID é @lid)
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_lid
    ON clientes(whatsapp_lid)
    WHERE whatsapp_lid IS NOT NULL; -- índice parcial: ignora NULLs

-- ─── Verificar índices criados ────────────────────────────────
-- Após rodar, confirme com:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('pedidos', 'clientes', 'itens_pedido')
-- ORDER BY tablename, indexname;
