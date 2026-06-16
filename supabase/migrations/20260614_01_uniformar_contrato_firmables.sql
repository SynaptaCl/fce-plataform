-- Migration: 20260614_01_uniformar_contrato_firmables
-- Sprint: A0
-- Descripción: Agrega columnas faltantes a tablas firmables para contrato uniforme.
--   Contrato: id, id_clinica, id_paciente, id_encuentro, created_by, created_at,
--   updated_at, firmado, firmado_at, firmado_por + trigger de inmutabilidad.
-- Impacto: ALTER TABLE en 2 tablas, CREATE TRIGGER en 1 tabla.
-- Rollback:
--   ALTER TABLE fce_notas_soap DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS updated_at;
--   DROP TRIGGER IF EXISTS trg_block_update_signed_consent ON fce_consentimientos;
--   DROP FUNCTION IF EXISTS block_update_signed_consentimiento();

-- 1. fce_notas_soap: falta created_by y updated_at
ALTER TABLE fce_notas_soap
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN fce_notas_soap.created_by IS 'profesionales.id del autor. Backfill obligatorio en data existente.';

-- 2. fce_consentimientos: falta trigger de inmutabilidad post-firma
CREATE OR REPLACE FUNCTION block_update_signed_consentimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.contenido IS DISTINCT FROM OLD.contenido OR
    NEW.tipo IS DISTINCT FROM OLD.tipo OR
    NEW.firma_paciente IS DISTINCT FROM OLD.firma_paciente OR
    NEW.firma_profesional IS DISTINCT FROM OLD.firma_profesional
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un consentimiento firmado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_update_signed_consent
  BEFORE UPDATE ON fce_consentimientos
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_consentimiento();

-- 3. fce_consentimientos: agregar updated_at si no existe
ALTER TABLE fce_consentimientos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
