-- Migration: 20260506_02_icd_periograma
-- Sprint: R-ICD-1
-- Descripción: Agrega diagnóstico ICD-11 a fce_periograma
-- Impacto: ALTER TABLE fce_periograma — agrega columna diagnostico_icd
-- Rollback:
--   ALTER TABLE fce_periograma DROP COLUMN IF EXISTS diagnostico_icd;

-- 1. Agregar columna
ALTER TABLE fce_periograma
  ADD COLUMN IF NOT EXISTS diagnostico_icd jsonb NOT NULL DEFAULT '{}';

-- Estructura esperada: { code, title, uri, version, addedAt }

-- 2. Verificación post-migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fce_periograma'
  AND column_name = 'diagnostico_icd';

-- NOTA: Si fce_periograma tiene un trigger de inmutabilidad, verificar
-- que incluye: OR NEW.diagnostico_icd <> OLD.diagnostico_icd
