-- ROTA PRIME - Schema do Banco de Dados
-- Todas as 7 tabelas do sistema

-- Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. USUARIOS (Admins do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. ENTREGADORES (Prestadores de serviço)
-- ============================================
CREATE TABLE IF NOT EXISTS entregadores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  valor_padrao DECIMAL(10,2) DEFAULT 0.50,
  telefone VARCHAR(20),
  senha_hash VARCHAR(255),
  ultimo_pagamento_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. PACOTES (Registro central)
-- ============================================
CREATE TABLE IF NOT EXISTS pacotes (
  codigo VARCHAR(30) PRIMARY KEY,
  data_chegada TIMESTAMP DEFAULT NOW(),
  nf_remessa VARCHAR(50),
  descricao TEXT,
  quantidade INTEGER DEFAULT 1,
  endereco_entrega TEXT NOT NULL,
  data_limite_entrega TIMESTAMP,
  entregador_id INTEGER REFERENCES entregadores(id) ON DELETE SET NULL,
  valor_pacote DECIMAL(10,2) DEFAULT 0.50,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento TIMESTAMP,
  status VARCHAR(30) DEFAULT 'Recebido pela Central',
  data_repassado_entregador TIMESTAMP,
  data_retirada_central TIMESTAMP,
  data_entrega_real TIMESTAMP,
  motivo_devolucao TEXT,
  tentativa_atual INTEGER DEFAULT 0,
  validacao_admin BOOLEAN DEFAULT FALSE,
  data_validacao_admin TIMESTAMP,
  observacoes TEXT,
  transportadora VARCHAR(100),
  foto TEXT,
  gps_foto VARCHAR(60),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices para pacotes
CREATE INDEX IF NOT EXISTS idx_pacotes_entregador ON pacotes(entregador_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_status ON pacotes(status);
CREATE INDEX IF NOT EXISTS idx_pacotes_data ON pacotes(data_chegada);
CREATE INDEX IF NOT EXISTS idx_pacotes_pago ON pacotes(pago);

-- ============================================
-- 4. FINALIZACAO_DIA (Snapshots diários gerais)
-- ============================================
CREATE TABLE IF NOT EXISTS finalizacao_dia (
  id SERIAL PRIMARY KEY,
  data DATE UNIQUE NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  total_pacotes INTEGER DEFAULT 0,
  total_entregues INTEGER DEFAULT 0,
  total_valor DECIMAL(10,2) DEFAULT 0
);

-- ============================================
-- 5. FINALIZACAO_DIA_ENTREGADOR (Snapshots diários por entregador)
-- ============================================
CREATE TABLE IF NOT EXISTS finalizacao_dia_entregador (
  id SERIAL PRIMARY KEY,
  entregador_id INTEGER NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  total_pacotes INTEGER DEFAULT 0,
  total_entregues INTEGER DEFAULT 0,
  total_falhas INTEGER DEFAULT 0,
  total_valor DECIMAL(10,2) DEFAULT 0,
  total_pago DECIMAL(10,2) DEFAULT 0,
  UNIQUE(entregador_id, data)
);

-- ============================================
-- 6. PAGAMENTOS_ENTREGADOR (Histórico de ciclos)
-- ============================================
CREATE TABLE IF NOT EXISTS pagamentos_entregador (
  id SERIAL PRIMARY KEY,
  entregador_id INTEGER NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  total_entregues INTEGER DEFAULT 0,
  total_valor DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  data_pagamento TIMESTAMP DEFAULT NOW(),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. WHATSAPP_LOG (Auditoria de mensagens)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_log (
  id SERIAL PRIMARY KEY,
  entregador_id INTEGER REFERENCES entregadores(id) ON DELETE SET NULL,
  pacote_codigo VARCHAR(30),
  data_envio TIMESTAMP DEFAULT NOW(),
  tipo VARCHAR(50) DEFAULT 'consulta'
);

-- ============================================
-- Admin padrão (senha: admin123)
-- ============================================
INSERT INTO usuarios (nome, senha_hash) 
VALUES ('admin', crypt('admin123', gen_salt('bf')))
ON CONFLICT (nome) DO NOTHING;
