-- Tabela de Transportadoras cadastradas
CREATE TABLE IF NOT EXISTS transportadoras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transportadoras_nome ON transportadoras(nome);
