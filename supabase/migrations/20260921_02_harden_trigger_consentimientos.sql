-- Migration: 20260921_02_harden_trigger_consentimientos
-- Sprint: Fase 0 hotfix consentimientos (auditoría M5, hallazgo crítico T1)
-- Descripción: endurece block_update_signed_consentimiento().
--
--   La versión anterior (20260614_01) solo protegía contenido/tipo/firma_paciente/
--   firma_profesional cuando OLD.firmado = true. Eso dejaba dos huecos:
--     1) UPDATE firmado = true → false sobre una fila firmada pasaba limpio por el
--        trigger, y la fila quedaba luego editable en el resto de columnas
--        (el toggle de firmado reabría todo el documento).
--     2) id_paciente, id_clinica, firmado_at, version y created_by no estaban
--        protegidos — una fila firmada podía reasignarse a otro paciente o clínica.
--
--   Nueva regla: si OLD.firmado = true, el ÚNICO cambio permitido es updated_at.
--   Cualquier otra modificación dispara excepción.
--
-- Revocación (AMB-1, tipo='grabacion_ia'): se modela como INSERT de una fila
--   nueva con firmado=false (append-only, versión +1 sobre la más alta del tipo)
--   — ver src/lib/ambient/consentimiento.ts y revocarConsentimientoGrabacion().
--   Este trigger NO abre excepciones de revocación porque la revocación NUNCA es
--   un UPDATE sobre la fila firmada. No se agregan columnas de revocación
--   (decisión de diseño AMB-1 §0, documentada en su header).
--
-- Impacto: CREATE OR REPLACE FUNCTION + recreate del trigger. Sin DDL de columnas.
-- Rollback: restaurar la función de 20260614_01_uniformar_contrato_firmables.sql
--   (no recomendado — reintroduce el hueco de inmutabilidad).
--
-- ⚠️ PENDIENTE DE APLICACIÓN — regla 15 CLAUDE.md: requiere aprobación humana
--   explícita en el chat antes de aplicar contra el proyecto vigyhfpwyxihrjiygfsa.

CREATE OR REPLACE FUNCTION block_update_signed_consentimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.firmado           IS DISTINCT FROM OLD.firmado OR
    NEW.contenido         IS DISTINCT FROM OLD.contenido OR
    NEW.tipo              IS DISTINCT FROM OLD.tipo OR
    NEW.firma_paciente    IS DISTINCT FROM OLD.firma_paciente OR
    NEW.firma_profesional IS DISTINCT FROM OLD.firma_profesional OR
    NEW.id_paciente       IS DISTINCT FROM OLD.id_paciente OR
    NEW.id_clinica        IS DISTINCT FROM OLD.id_clinica OR
    NEW.firmado_at        IS DISTINCT FROM OLD.firmado_at OR
    NEW.version           IS DISTINCT FROM OLD.version OR
    NEW.created_by        IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un consentimiento firmado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_update_signed_consent ON fce_consentimientos;

CREATE TRIGGER trg_block_update_signed_consent
  BEFORE UPDATE ON fce_consentimientos
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_consentimiento();
