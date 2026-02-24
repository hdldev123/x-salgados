-- Script SQL para criar as tabelas no Supabase (PostgreSQL)
-- Execute este script no SQL Editor do Supabase

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil INTEGER NOT NULL, -- 1=Administrador, 2=Atendente, 3=Entregador
    data_criacao TIMESTAMP DEFAULT NOW(),
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    cep VARCHAR(10),
    data_criacao TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descricao VARCHAR(500),
    preco DECIMAL(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT NOW()
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    data_criacao TIMESTAMP DEFAULT NOW(),
    data_entrega TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL,
    status INTEGER NOT NULL, -- 1=Pendente, 2=EmProducao, 3=Pronto, 4=EmEntrega, 5=Entregue, 6=Cancelado
    observacoes VARCHAR(500)
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL,
    preco_unitario_snapshot DECIMAL(10,2) NOT NULL -- Preço salvo no momento da venda
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_criacao ON pedidos(data_criacao);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_entrega ON pedidos(data_entrega);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Inserir usuario administrador padrao (senha: admin123)
-- Hash SHA256 de "admin123" em Base64
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) 
VALUES ('Administrador', 'admin@xsalgados.com', 'JAvlGPq9JyTdtvBO6x2llnRI1+gxwIyPqCKAn3THIKk=', 1, true)
ON CONFLICT (email) DO NOTHING;
