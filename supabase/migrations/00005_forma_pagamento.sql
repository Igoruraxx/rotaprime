-- Adiciona forma_pagamento ao histórico de pagamentos
ALTER TABLE pagamentos_entregador ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30) DEFAULT 'Dinheiro';
