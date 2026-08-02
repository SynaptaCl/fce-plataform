-- ============================================================================
-- Migration: 20260425_03_fce_ordenes_examen
-- Sprint: M8 — Exámenes
-- Aplicado en producción: 2026-04-24/25 (migrations reales: 20260425_01_examenes_catalogo,
--   20260425_02_alter_profesionales_examenes, 20260425_03_fce_ordenes_examen,
--   20260425_04_seed_modulo_m8)
-- NOTA: ya aplicado en producción — reconstruida el 2026-08-02 vía verificación
--   MCP Supabase (auditoría de cumplimiento legal); no existía ningún archivo
--   de definición de esta tabla en el repo.
-- Descripción: tabla fce_ordenes_examen (M8), folio correlativo por clínica/año,
--   inmutabilidad post-firma vía trigger DB, RLS vía tiene_acceso_clinico().
-- Requiere: función public.tiene_acceso_clinico(uuid) — ver
--   20260724_01_crear_funcion_tiene_acceso_clinico.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS fce_ordenes_examen (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica                  uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente                 uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro                uuid        REFERENCES fce_encuentros(id),
  folio_numero                integer     NOT NULL,
  folio_anio                  integer     NOT NULL,
  folio_display               text,
  examenes                    jsonb       NOT NULL,
  diagnostico_presuntivo      text,
  observaciones                text,
  prioridad                   text        NOT NULL DEFAULT 'normal'
                                 CHECK (prioridad IN ('normal', 'urgente')),
  modo_firma                  text        NOT NULL
                                 CHECK (modo_firma IN ('impresa', 'canvas')),
  firma_canvas                text,
  firmado                     boolean     NOT NULL DEFAULT false,
  firmado_at                  timestamptz,
  firmado_por                 uuid,
  prof_nombre_snapshot        text,
  prof_rut_snapshot           text,
  prof_registro_snapshot      text,
  prof_tipo_registro_snapshot text,
  prof_especialidad_snapshot  text,
  estado_resultados           text        NOT NULL DEFAULT 'pendiente'
                                 CHECK (estado_resultados IN ('pendiente', 'parcial', 'completo')),
  created_by                  uuid        NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_folio_orden_clinica_anio UNIQUE (id_clinica, folio_anio, folio_numero)
);

CREATE INDEX IF NOT EXISTS idx_ord_exam_paciente   ON fce_ordenes_examen(id_paciente, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ord_exam_clinica     ON fce_ordenes_examen(id_clinica);
CREATE INDEX IF NOT EXISTS idx_ord_exam_encuentro   ON fce_ordenes_examen(id_encuentro) WHERE id_encuentro IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ord_exam_firmado_por ON fce_ordenes_examen(firmado_por) WHERE firmado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ord_exam_folio       ON fce_ordenes_examen(folio_display);
CREATE INDEX IF NOT EXISTS idx_ord_exam_estado      ON fce_ordenes_examen(estado_resultados) WHERE estado_resultados <> 'completo';

ALTER TABLE fce_ordenes_examen ENABLE ROW LEVEL SECURITY;

CREATE POLICY acceso_clinico_all ON fce_ordenes_examen
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- Folio correlativo por clínica/año, asignado al INSERT.
CREATE OR REPLACE FUNCTION public.assign_folio_orden_examen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  anio_actual int;
  siguiente_folio int;
BEGIN
  anio_actual := EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Santiago');
  NEW.folio_anio := anio_actual;

  SELECT COALESCE(MAX(folio_numero), 0) + 1 INTO siguiente_folio
  FROM fce_ordenes_examen
  WHERE id_clinica = NEW.id_clinica AND folio_anio = anio_actual;

  NEW.folio_numero := siguiente_folio;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_assign_folio_orden
  BEFORE INSERT ON fce_ordenes_examen
  FOR EACH ROW
  EXECUTE FUNCTION assign_folio_orden_examen();

-- Inmutabilidad post-firma.
CREATE OR REPLACE FUNCTION public.block_update_signed_orden_examen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado = true AND (
    NEW.examenes IS DISTINCT FROM OLD.examenes OR
    NEW.diagnostico_presuntivo IS DISTINCT FROM OLD.diagnostico_presuntivo OR
    NEW.observaciones IS DISTINCT FROM OLD.observaciones OR
    NEW.prioridad IS DISTINCT FROM OLD.prioridad OR
    NEW.firma_canvas IS DISTINCT FROM OLD.firma_canvas
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una orden de examen firmada';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_block_update_signed_orden
  BEFORE UPDATE ON fce_ordenes_examen
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_orden_examen();
