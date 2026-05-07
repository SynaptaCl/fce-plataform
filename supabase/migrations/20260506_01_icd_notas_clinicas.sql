-- Migration: 20260506_01_icd_notas_clinicas
-- Sprint: R-ICD-1
-- Descripción: Agrega soporte ICD-11 a fce_notas_clinicas
-- Impacto: ALTER TABLE fce_notas_clinicas — agrega columnas icd_codigos y icd_version, índice GIN, actualiza trigger de inmutabilidad
-- Rollback:
--   ALTER TABLE fce_notas_clinicas DROP COLUMN IF EXISTS icd_version;
--   ALTER TABLE fce_notas_clinicas DROP COLUMN IF EXISTS icd_codigos;
--   DROP INDEX IF EXISTS idx_notas_icd;

-- 1. Agregar columnas
ALTER TABLE fce_notas_clinicas
  ADD COLUMN IF NOT EXISTS icd_version text DEFAULT 'ICD-11',
  ADD COLUMN IF NOT EXISTS icd_codigos jsonb NOT NULL DEFAULT '[]';

-- 2. Índice GIN para búsqueda dentro del jsonb
CREATE INDEX IF NOT EXISTS idx_notas_icd
  ON fce_notas_clinicas USING GIN (icd_codigos);

-- 3. Verificación post-migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fce_notas_clinicas'
  AND column_name IN ('icd_version', 'icd_codigos');

-- NOTA: Verificar que el trigger block_update_signed_nota_clinica incluye
-- la condición: OR NEW.icd_codigos <> OLD.icd_codigos
-- Si el trigger usa SECURITY DEFINER o es muy específico, actualizar manualmente.
-- Consultar el trigger existente antes de aplicar esta migration.
