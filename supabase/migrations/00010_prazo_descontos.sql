-- ═══════════════════════════════════════════════════════════════
-- Migration 00010: Prazo transportadoras + Descontos por Falta
-- ═══════════════════════════════════════════════════════════════

-- 1. COLUNA prazo_entrega_dias em transportadoras
--    Prazo padrão em dias úteis/corridos para entrega
ALTER TABLE transportadoras
  ADD COLUMN IF NOT EXISTS prazo_entrega_dias INTEGER;

-- 2. COLUNA falta em pacotes
--    Marca pacotes que viraram "falta" (perda/extraviado)
ALTER TABLE pacotes
  ADD COLUMN IF NOT EXISTS falta BOOLEAN DEFAULT FALSE;

-- 3. COLUNA data_falta em pacotes
--    Data em que foi marcado como falta
ALTER TABLE pacotes
  ADD COLUMN IF NOT EXISTS data_falta TIMESTAMP;

-- 4. COLUNA desconto_falta em pacotes
--    Valor de desconto aplicado por esta falta (R$)
ALTER TABLE pacotes
  ADD COLUMN IF NOT EXISTS desconto_falta DECIMAL(10,2) DEFAULT 0;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_pacotes_falta ON pacotes(falta) WHERE falta = TRUE;

-- 6. Função para calcular total de descontos por falta de um entregador
CREATE OR REPLACE FUNCTION total_descontos_falta(entregador_id_param INTEGER)
RETURNS DECIMAL LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(desconto_falta), 0) INTO total
  FROM pacotes
  WHERE entregador_id = entregador_id_param AND falta = TRUE;
  RETURN total;
END;
$$;
