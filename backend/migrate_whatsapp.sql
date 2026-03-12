-- ============================================================
-- Migração: Persistência WhatsApp (JID, Sessões, Mensagens)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Colunas de JID na tabela clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS whatsapp_jid VARCHAR(100),
ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_jid ON clientes(whatsapp_jid);

-- 2. Tabela de estado do bot (substitui bot-state em memória)
CREATE TABLE IF NOT EXISTS sessoes_whatsapp (
    telefone VARCHAR(20) PRIMARY KEY,
    etapa VARCHAR(50) NOT NULL,
    dados JSONB DEFAULT '{}'::jsonb,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de auditoria de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
    remote_jid VARCHAR(100) NOT NULL,
    texto TEXT NOT NULL,
    direcao VARCHAR(10) CHECK (direcao IN ('INBOUND', 'OUTBOUND')),
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_cliente ON whatsapp_mensagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_data ON whatsapp_mensagens(data_registro);
