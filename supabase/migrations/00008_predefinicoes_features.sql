-- ═══════════════════════════════════════════════════════════════
-- Migration 00008: Novas funcionalidades de Predefinições
-- ═══════════════════════════════════════════════════════════════

-- 1. Coluna "atrasado" em pacotes (marcação manual)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS atrasado BOOLEAN DEFAULT FALSE;

-- 2. Coluna "congelado" em pacotes (impede alterações)
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS congelado BOOLEAN DEFAULT FALSE;

-- 3. Coluna "data_congelamento" rastreia quando foi congelado
ALTER TABLE pacotes ADD COLUMN IF NOT EXISTS data_congelamento TIMESTAMP;

-- 4. Índice para consulta de atrasados
CREATE INDEX IF NOT EXISTS idx_pacotes_atrasado ON pacotes(atrasado) WHERE atrasado = TRUE;

-- 5. Índice para consulta de congelados
CREATE INDEX IF NOT EXISTS idx_pacotes_congelado ON pacotes(congelado) WHERE congelado = TRUE;
