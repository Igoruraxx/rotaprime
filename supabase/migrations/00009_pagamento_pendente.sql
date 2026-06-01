-- ═══════════════════════════════════════════════════════════════
-- Migration 00009: Gestão de Pagamentos Pendentes Futuros
-- ═══════════════════════════════════════════════════════════════

-- 1. Coluna "data_vencimento_pagamento" em pacotes
--    Data em que o pagamento deste pacote vence (para controle de atraso no pagamento)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS data_vencimento_pagamento TIMESTAMP;

-- 2. Coluna "data_previsao_pagamento" em pacotes
--    Previsão de quando o pagamento será realizado (para planejamento financeiro)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS data_previsao_pagamento TIMESTAMP;

-- 3. Coluna "pendente_pagamento" em pacotes (flag para filtrar rápido)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS pendente_pagamento BOOLEAN DEFAULT FALSE;

-- 4. Índices para consultas de pagamento
CREATE INDEX IF NOT EXISTS idx_pacotes_pendente_pagamento
  ON pacotes(pendente_pagamento) WHERE pendente_pagamento = TRUE;

CREATE INDEX IF NOT EXISTS idx_pacotes_vencimento_pagamento
  ON pacotes(data_vencimento_pagamento)
  WHERE data_vencimento_pagamento IS NOT NULL;

-- 5. Função para calcular previsão de pagamentos futuros
--    Retorna um resumo dos próximos pagamentos agrupados por entregador
CREATE OR REPLACE FUNCTION previsao_pagamentos_futuros()
RETURNS TABLE (
  entregador_id INTEGER,
  entregador_nome VARCHAR,
  total_pacotes BIGINT,
  valor_total DECIMAL,
  qtd_entregues BIGINT,
  qtd_em_rota BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS entregador_id,
    e.nome::VARCHAR AS entregador_nome,
    COUNT(p.codigo)::BIGINT AS total_pacotes,
    COALESCE(SUM(p.valor_pacote), 0)::DECIMAL AS valor_total,
    COUNT(CASE WHEN p.status = 'Entregue' THEN 1 END)::BIGINT AS qtd_entregues,
    COUNT(CASE WHEN p.status IN ('Retirado pelo Entregador', 'Em Rota') THEN 1 END)::BIGINT AS qtd_em_rota
  FROM entregadores e
  JOIN pacotes p ON p.entregador_id = e.id
  WHERE p.pago = FALSE
    AND e.ativo = TRUE
  GROUP BY e.id, e.nome
  ORDER BY valor_total DESC;
END;
$$;
