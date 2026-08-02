-- ============================================================================
-- Migration: 20260427_02_fce_egresos_trigger_snapshot
-- Aplicado en producción: 2026-04-27 (migrations reales:
--   fce_egresos_snapshot_equipo_tratante, fce_egresos_trigger_include_snapshot)
-- NOTA: ya aplicado en producción — reconstruida el 2026-08-02 vía verificación
--   MCP Supabase (auditoría de cumplimiento legal). La columna
--   snapshot_equipo_tratante ya está en 20260427_01_fce_egresos.sql (repo);
--   este archivo cubre solo el trigger de inmutabilidad, que no existía en
--   el repo. CLAUDE.md regla 8 no menciona egresos entre los documentos con
--   trigger de inmutabilidad — en producción sí lo tiene.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.block_update_signed_egreso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado = true AND (
    NEW.tipo_egreso <> OLD.tipo_egreso OR
    NEW.diagnostico_egreso <> OLD.diagnostico_egreso OR
    NEW.resumen_tratamiento <> OLD.resumen_tratamiento OR
    NEW.estado_al_egreso IS DISTINCT FROM OLD.estado_al_egreso OR
    NEW.indicaciones_post_egreso IS DISTINCT FROM OLD.indicaciones_post_egreso OR
    NEW.derivacion_a IS DISTINCT FROM OLD.derivacion_a OR
    NEW.notas IS DISTINCT FROM OLD.notas OR
    NEW.snapshot_equipo_tratante IS DISTINCT FROM OLD.snapshot_equipo_tratante
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un egreso firmado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_block_update_signed_egreso
  BEFORE UPDATE ON fce_egresos
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_egreso();
