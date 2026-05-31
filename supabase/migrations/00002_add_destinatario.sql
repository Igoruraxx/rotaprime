-- Adicionar coluna destinatario (nome do destinatário) na tabela pacotes
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS destinatario VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_pacotes_destinatario ON pacotes(destinatario);
