-- ============================================================================
-- Migration: 20260429_03_create_fce_periograma
-- Sprint: D2-D6 — Módulo odontológico
-- Aplicado en producción: 2026-04-29 (migration real: create_fce_periograma)
-- NOTA: ya aplicado en producción — reconstruida el 2026-08-02 vía verificación
--   MCP Supabase (auditoría de cumplimiento legal); no existía ningún archivo
--   de definición de esta tabla en el repo (solo el ALTER de 20260506_02_icd_periograma.sql
--   que agrega la columna diagnostico_icd).
-- ADVERTENCIA: el trigger de inmutabilidad reconstruido abajo es el que está
--   REALMENTE VIVO en producción, con un bug conocido: referencia
--   OLD.firmado_en, columna que nunca existió (la columna real es `firmado`
--   boolean + firmado_at). Esto rompe TODO UPDATE a esta tabla hoy. El fix
--   vive en 20260802_01_fix_trigger_periograma_columna_inexistente.sql —
--   aplicar ese archivo INMEDIATAMENTE DESPUÉS de este, no dejar este bug
--   en producción más tiempo del necesario para la revisión humana (regla 15).
-- Requiere: función public.tiene_acceso_clinico(uuid) — ver
--   20260724_01_crear_funcion_tiene_acceso_clinico.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS fce_periograma (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica          uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente         uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro        uuid        NOT NULL REFERENCES fce_encuentros(id),
  datos               jsonb       NOT NULL,
  indice_sangrado     numeric,
  profundidad_media   numeric,
  sitios_patologicos  integer,
  notas               text,
  firmado             boolean     NOT NULL DEFAULT false,
  firmado_at          timestamptz,
  firmado_por         uuid,
  registrado_por      uuid        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  diagnostico_icd     jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_periograma_paciente  ON fce_periograma(id_paciente, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_periograma_clinica   ON fce_periograma(id_clinica);
CREATE INDEX IF NOT EXISTS idx_periograma_encuentro ON fce_periograma(id_encuentro);

ALTER TABLE fce_periograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY acceso_clinico_all ON fce_periograma
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- ⚠️ Versión REALMENTE VIVA en producción a 2026-08-02 — con el bug
-- OLD.firmado_en. Reconstruida tal cual por fidelidad histórica. Ver
-- 20260802_01_fix_trigger_periograma_columna_inexistente.sql para el fix.
CREATE OR REPLACE FUNCTION public.block_update_signed_periograma()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado_en IS NOT NULL AND (
    NEW.datos IS DISTINCT FROM OLD.datos OR
    NEW.diagnostico_icd IS DISTINCT FROM OLD.diagnostico_icd
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un periograma firmado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_block_update_signed_periograma
  BEFORE UPDATE ON fce_periograma
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_periograma();
