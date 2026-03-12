-- ============================================================
-- Migração: RPCs de agregação para o Dashboard (DBA-003)
-- Execute no SQL Editor do Supabase
-- Data: 2026-03-07
-- ============================================================

-- ─── RPC: Pedidos agrupados por mês ──────────────────────────
-- Substitui a agregação feita em Node.js no dashboard.service.ts
-- (obterPedidosPorMesAsync), que trazia todos os pedidos e agrupava em JS.
--
-- Retorna: ano, mes, total_pedidos, receita_total (apenas entregues)
-- Parâmetro: qtd_meses (default 6)
CREATE OR REPLACE FUNCTION get_pedidos_por_mes(qtd_meses INTEGER DEFAULT 6)
RETURNS TABLE (
    ano          INTEGER,
    mes          INTEGER,
    total_pedidos BIGINT,
    receita_total NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        EXTRACT(YEAR  FROM data_criacao)::INTEGER AS ano,
        EXTRACT(MONTH FROM data_criacao)::INTEGER AS mes,
        COUNT(*)                                   AS total_pedidos,
        COALESCE(SUM(CASE WHEN status = 5 THEN valor_total ELSE 0 END), 0) AS receita_total
    FROM pedidos
    WHERE data_criacao >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' * (qtd_meses - 1)
    GROUP BY ano, mes
    ORDER BY ano, mes;
$$;

-- ─── RPC: Distribuição de status dos pedidos ─────────────────
-- Substitui o GROUP BY em JavaScript em obterDistribuicaoStatusAsync.
-- Retorna: status (int), quantidade, percentual
CREATE OR REPLACE FUNCTION get_distribuicao_status_pedidos()
RETURNS TABLE (
    status     INTEGER,
    quantidade BIGINT,
    percentual NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        status,
        COUNT(*)                                              AS quantidade,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)  AS percentual
    FROM pedidos
    GROUP BY status
    ORDER BY status;
$$;

-- ─── RPC: KPIs do Dashboard ──────────────────────────────────
-- Retorna todos os KPIs em uma única query ao banco,
-- eliminando os 3 round-trips paralelos + filtros em Node.js.
CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS TABLE (
    receita_total    NUMERIC,
    total_pedidos    BIGINT,
    pedidos_pendentes BIGINT,
    pedidos_hoje     BIGINT,
    receita_hoje     NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        -- Receita total: somente pedidos entregues (status = 5)
        COALESCE(SUM(CASE WHEN status = 5 THEN valor_total ELSE 0 END), 0)       AS receita_total,
        COUNT(*)                                                                   AS total_pedidos,
        -- Pendentes: Pendente(1) + EmProducao(2) + Pronto(3)
        COUNT(*) FILTER (WHERE status IN (1, 2, 3))                               AS pedidos_pendentes,
        -- Pedidos criados hoje (UTC)
        COUNT(*) FILTER (WHERE data_criacao >= CURRENT_DATE)                      AS pedidos_hoje,
        -- Receita hoje: entregues criados hoje
        COALESCE(SUM(valor_total) FILTER (WHERE status = 5 AND data_criacao >= CURRENT_DATE), 0) AS receita_hoje
    FROM pedidos;
$$;

-- ─── Verificar funções criadas ────────────────────────────────
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_type = 'FUNCTION'
-- AND routine_name IN ('get_pedidos_por_mes', 'get_distribuicao_status_pedidos', 'get_dashboard_kpis');
