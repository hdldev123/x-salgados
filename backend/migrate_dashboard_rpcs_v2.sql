-- ============================================================
-- Migração v2: RPCs de agregação para o Dashboard (Relatório de Vendas)
-- Execute no SQL Editor do Supabase
-- Data: 2026-03-12
-- ============================================================

-- ─── RPC: KPIs do Dashboard v2 ──────────────────────────────
-- Extende a versão anterior adicionando métricas de cancelados e concluídos.
CREATE OR REPLACE FUNCTION get_dashboard_kpis_v2()
RETURNS TABLE (
    receita_total      NUMERIC,
    total_pedidos      BIGINT,
    pedidos_pendentes  BIGINT,
    pedidos_hoje       BIGINT,
    receita_hoje       NUMERIC,
    total_concluidos   BIGINT,
    total_cancelados   BIGINT,
    receita_cancelada  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        -- Receita total: somente pedidos entregues (status = 5)
        COALESCE(SUM(CASE WHEN status = 5 THEN valor_total ELSE 0 END), 0)                AS receita_total,
        COUNT(*)                                                                            AS total_pedidos,
        -- Pendentes: Pendente(1) + EmProducao(2) + Pronto(3)
        COUNT(*) FILTER (WHERE status IN (1, 2, 3))                                        AS pedidos_pendentes,
        -- Pedidos criados hoje (UTC)
        COUNT(*) FILTER (WHERE data_criacao >= CURRENT_DATE)                               AS pedidos_hoje,
        -- Receita hoje: entregues criados hoje
        COALESCE(SUM(valor_total) FILTER (WHERE status = 5 AND data_criacao >= CURRENT_DATE), 0) AS receita_hoje,
        -- Concluídos (entregues)
        COUNT(*) FILTER (WHERE status = 5)                                                 AS total_concluidos,
        -- Cancelados
        COUNT(*) FILTER (WHERE status = 6)                                                 AS total_cancelados,
        -- Receita perdida (valor dos pedidos cancelados)
        COALESCE(SUM(valor_total) FILTER (WHERE status = 6), 0)                            AS receita_cancelada
    FROM pedidos;
$$;

-- ─── RPC: Produtos Mais Vendidos ────────────────────────────
-- Retorna os top N produtos por quantidade vendida (apenas pedidos entregues).
CREATE OR REPLACE FUNCTION get_produtos_mais_vendidos(limite INTEGER DEFAULT 5)
RETURNS TABLE (
    nome               TEXT,
    quantidade_vendida BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        p.nome,
        SUM(ip.quantidade)::BIGINT AS quantidade_vendida
    FROM itens_pedido ip
    JOIN produtos p   ON p.id  = ip.produto_id
    JOIN pedidos  ped ON ped.id = ip.pedido_id
    WHERE ped.status = 5  -- apenas pedidos entregues/concluídos
    GROUP BY p.nome
    ORDER BY quantidade_vendida DESC
    LIMIT limite;
$$;

-- ─── Verificar funções criadas ────────────────────────────────
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_type = 'FUNCTION'
-- AND routine_name IN ('get_dashboard_kpis_v2', 'get_produtos_mais_vendidos');
