-- ============================================================================
-- Migration: 20260801_01_fix_trigger_inmutabilidad_notas_clinicas
-- Sprint: LEGAL1
-- Descripción: El trigger block_update_signed_nota_clinica() (creado en
--   20260421_03) solo chequeaba contenido/motivo_consulta/diagnostico/plan.
--   icd_codigos + icd_version (20260506_01) y secciones_estructuradas
--   (20260531_01) se agregaron después y nunca se incorporaron al trigger —
--   20260506_01 lo advertía en un comentario que quedó sin resolver. Una nota
--   clínica firmada podía tener sus códigos ICD-11 o sus secciones
--   estructuradas modificados sin bloqueo a nivel DB (la capa app sí bloquea
--   el UPDATE completo en src/app/actions/clinico/nota-clinica.ts, pero el
--   trigger es la última línea de defensa contra escritura directa/service_role).
-- Impacto: CREATE OR REPLACE de una función existente. No toca datos, no
--   requiere backfill. El trigger trg_block_update_signed_nota ya apunta a
--   esta función — no hace falta recrear el trigger.
-- Rollback: revertir a la definición original de 20260421_03_fce_notas_clinicas.sql
--   (sin las 3 condiciones nuevas).
-- Aprobación humana pendiente — NO aplicar sin revisión (CLAUDE.md regla 15).
-- ============================================================================

CREATE OR REPLACE FUNCTION block_update_signed_nota_clinica()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.contenido <> OLD.contenido OR
    NEW.motivo_consulta IS DISTINCT FROM OLD.motivo_consulta OR
    NEW.diagnostico IS DISTINCT FROM OLD.diagnostico OR
    NEW.plan IS DISTINCT FROM OLD.plan OR
    NEW.icd_codigos IS DISTINCT FROM OLD.icd_codigos OR
    NEW.icd_version IS DISTINCT FROM OLD.icd_version OR
    NEW.secciones_estructuradas IS DISTINCT FROM OLD.secciones_estructuradas
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una nota clínica firmada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTA: cie10_codigos (legacy, texto libre pre-ICD-11) no está incluida
-- arriba. Verificar si algún flujo activo todavía escribe ese campo antes de
-- decidir si se agrega también `NEW.cie10_codigos IS DISTINCT FROM OLD.cie10_codigos`.
