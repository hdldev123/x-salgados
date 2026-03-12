-- ============================================================
-- Migração: RPC para criação atômica de pedido + itens (DBA-004)
-- Execute no SQL Editor do Supabase
-- Data: 2026-03-08
-- ============================================================
--
-- Problema resolvido:
--   A criação de pedidos envolvia dois INSERTs separados (pedidos e
--   itens_pedido) com rollback manual em Node.js. Caso o segundo INSERT
--   falhasse e o rollback também falhasse (ex: timeout de rede), o pedido
--   ficaria vazio ("pedido fantasma") no banco.
--
-- Solução:
--   Uma única função PL/pgSQL que executa os dois INSERTs dentro de uma
--   transação implícita do Postgres. Se qualquer passo falhar, o Postgres
--   faz o rollback automaticamente — sem nenhum código frágil no backend.
-- ============================================================

-- Tipo auxiliar para os itens do pedido
-- (DROP + CREATE para garantir idempotência nas re-execuções)
DROP TYPE IF EXISTS item_pedido_input CASCADE;

CREATE TYPE item_pedido_input AS (
    produto_id               INTEGER,
    quantidade               INTEGER,
    preco_unitario_snapshot  NUMERIC
);

-- ─── RPC: criar_pedido_atomico ────────────────────────────────
-- Parâmetros:
--   p_cliente_id   : ID do cliente
--   p_data_entrega : Data de entrega (pode ser NULL)
--   p_valor_total  : Valor total calculado no backend
--   p_status       : Status inicial (1 = Pendente)
--   p_observacoes  : Observações livres (pode ser NULL)
--   p_itens        : Array do tipo item_pedido_input
--
-- Retorna: o ID do pedido criado
CREATE OR REPLACE FUNCTION criar_pedido_atomico(
    p_cliente_id   INTEGER,
    p_data_entrega TIMESTAMPTZ,
    p_valor_total  NUMERIC,
    p_status       INTEGER,
    p_observacoes  TEXT,
    p_itens        item_pedido_input[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_pedido_id INTEGER;
    v_item      item_pedido_input;
BEGIN
    -- 1. Inserir o cabeçalho do pedido
    INSERT INTO pedidos (cliente_id, data_entrega, valor_total, status, observacoes)
    VALUES (p_cliente_id, p_data_entrega, p_valor_total, p_status, p_observacoes)
    RETURNING id INTO v_pedido_id;

    -- 2. Inserir cada item vinculado ao pedido recém-criado
    FOREACH v_item IN ARRAY p_itens LOOP
        INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario_snapshot)
        VALUES (v_pedido_id, v_item.produto_id, v_item.quantidade, v_item.preco_unitario_snapshot);
    END LOOP;

    -- Se qualquer INSERT acima falhar, o Postgres desfaz TUDO automaticamente.
    RETURN v_pedido_id;
END;
$$;

-- ─── Verificar função criada ──────────────────────────────────
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_type = 'FUNCTION' AND routine_name = 'criar_pedido_atomico';
