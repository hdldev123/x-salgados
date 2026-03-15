-- ============================================================
-- Migração: Adicionar coluna estoque à tabela produtos
-- ============================================================

-- Adicionar coluna estoque (padrão 0, não nulo)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS estoque INT NOT NULL DEFAULT 0;

-- Índice para consultas de produtos com estoque disponível
CREATE INDEX IF NOT EXISTS idx_produtos_estoque
  ON produtos (estoque)
  WHERE ativo = true;

-- ============================================================
-- RPC: Decrementar estoque de forma atômica e segura
-- ============================================================
CREATE OR REPLACE FUNCTION decrementar_estoque(
  p_produto_id INT,
  p_quantidade INT
) RETURNS VOID AS $$
BEGIN
  UPDATE produtos
  SET estoque = estoque - p_quantidade
  WHERE id = p_produto_id
    AND estoque >= p_quantidade;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', p_produto_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
