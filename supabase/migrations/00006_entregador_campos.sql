-- Novos campos para entregadores: CPF, Chave PIX, Banco, CNH
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(100);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS banco_pagamento VARCHAR(60);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS carteira_motorista VARCHAR(20);

-- Features de controle para WhatsApp e campos adicionais
INSERT INTO configuracoes_sistema (chave, nome, descricao, grupo, ativo) VALUES
  ('whatsapp_integracao', 'WhatsApp', 'Integração com WhatsApp para contato com entregadores', 'Entregas', TRUE),
  ('entregador_campos_adicionais', 'Dados Adicionais', 'Campos extras do entregador (CPF, PIX, CNH, Banco)', 'Entregadores', TRUE)
ON CONFLICT (chave) DO NOTHING;
