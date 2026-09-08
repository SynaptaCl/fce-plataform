-- ============================================================================
-- Migration: 20260907_01_fce_fichas_esteticas
-- Sprint: M13 — Módulo Ficha Estética (facial/corporal)
-- Descripción: Tablas nuevas para el módulo transversal de estética:
--   cabecera del acto (fce_fichas_esteticas), detalle por zona tratada
--   (fce_ficha_estetica_zonas), catálogo global de procedimientos
--   (procedimientos_esteticos_catalogo) y registro fotográfico
--   (fce_ficha_estetica_fotos). Inmutable post-firma como
--   SOAP/prescripciones — trigger bloquea UPDATE de la cabecera y de
--   cualquier zona asociada una vez firmado=true.
--   fce_ficha_estetica_fotos se incluye aquí (no diferida a una migration
--   posterior) porque es la tabla en la que escribe el server action de
--   subida a Storage (tarea posterior del mismo sprint) — evita tener que
--   amender esta migration in-place una vez aprobada/aplicada.
-- Impacto: Tablas nuevas, no afecta ninguna tabla existente.
-- Rollback: DROP TABLE IF EXISTS fce_ficha_estetica_zonas CASCADE;
--           DROP TABLE IF EXISTS fce_ficha_estetica_fotos CASCADE;
--           DROP TABLE IF EXISTS fce_fichas_esteticas CASCADE;
--           DROP TABLE IF EXISTS procedimientos_esteticos_catalogo CASCADE;
-- Requiere: función public.tiene_acceso_clinico(uuid) — ya aplicada
--   (20260724_01_crear_funcion_tiene_acceso_clinico.sql).
-- Aplicada 2026-09-07 con aprobación humana explícita en el chat (CLAUDE.md regla 15).
-- ============================================================================

CREATE TABLE fce_fichas_esteticas (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica              uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente             uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro            uuid        NOT NULL REFERENCES fce_encuentros(id),
  created_by              uuid        NOT NULL,
  tipo_ficha              text        NOT NULL CHECK (tipo_ficha IN ('facial','corporal','mixta')),
  motivo                  text,
  observaciones_generales text,
  firmado                 boolean     NOT NULL DEFAULT false,
  firmado_at              timestamptz,
  firmado_por             uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fichas_esteticas_paciente  ON fce_fichas_esteticas(id_paciente, created_at DESC);
CREATE INDEX idx_fichas_esteticas_clinica   ON fce_fichas_esteticas(id_clinica);
CREATE INDEX idx_fichas_esteticas_encuentro ON fce_fichas_esteticas(id_encuentro);

ALTER TABLE fce_fichas_esteticas ENABLE ROW LEVEL SECURITY;

CREATE POLICY acceso_clinico_all ON fce_fichas_esteticas
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE TABLE fce_ficha_estetica_zonas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ficha_estetica   uuid        NOT NULL REFERENCES fce_fichas_esteticas(id) ON DELETE CASCADE,
  region              text        NOT NULL CHECK (region IN ('facial','corporal')),
  zona_codigo         text        NOT NULL,
  id_procedimiento    uuid,
  producto_comercial  text,
  lote                text,
  dosis               numeric,
  unidad_dosis        text,
  tecnica             text,
  observaciones       text
);

CREATE INDEX idx_ficha_estetica_zonas_ficha ON fce_ficha_estetica_zonas(id_ficha_estetica);

ALTER TABLE fce_ficha_estetica_zonas ENABLE ROW LEVEL SECURITY;

-- RLS de zonas via join a la cabecera (misma clínica que la ficha padre).
CREATE POLICY acceso_clinico_zonas ON fce_ficha_estetica_zonas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fce_fichas_esteticas f
      WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
        AND tiene_acceso_clinico(f.id_clinica)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fce_fichas_esteticas f
      WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
        AND tiene_acceso_clinico(f.id_clinica)
    )
  );

CREATE TABLE procedimientos_esteticos_catalogo (
  id                                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                              text        NOT NULL,
  categoria                           text        NOT NULL CHECK (categoria IN (
                                        'toxina_botulinica','relleno_ac_hialuronico','laser',
                                        'peeling','radiofrecuencia','mesoterapia','otro'
                                      )),
  descripcion                        text,
  contraindicaciones_clave           text[]      NOT NULL DEFAULT '{}',
  requiere_consentimiento_especifico boolean     NOT NULL DEFAULT true,
  id_clinica                         uuid        REFERENCES clinicas(id),
  activo                             boolean     NOT NULL DEFAULT true
);

CREATE INDEX idx_procedimientos_esteticos_clinica ON procedimientos_esteticos_catalogo(id_clinica);

ALTER TABLE procedimientos_esteticos_catalogo ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de visibilidad que medicamentos: catálogo global (id_clinica IS NULL)
-- visible a todos los authenticated; catálogo propio de clínica solo a esa clínica.
CREATE POLICY select_catalogo_global_o_propio ON procedimientos_esteticos_catalogo
  FOR SELECT TO authenticated
  USING (id_clinica IS NULL OR tiene_acceso_clinico(id_clinica));

-- Escritura restringida a admin/director/superadmin de la clínica dueña del
-- registro (NO tiene_acceso_clinico, que también admite cualquier profesional
-- con fila en admin_user_profesionales) — mismo criterio que
-- manage_catalogo_clinica en medicamentos_catalogo (20260422_01), porque este
-- catálogo es de la misma clase de sensibilidad (contraindicaciones_clave,
-- requiere_consentimiento_especifico son contenido clínico).
CREATE POLICY escritura_catalogo_propio ON procedimientos_esteticos_catalogo
  FOR INSERT TO authenticated
  WITH CHECK (
    id_clinica IS NOT NULL AND id_clinica IN (
      SELECT id_clinica FROM admin_users
      WHERE auth_id = auth.uid()
        AND rol IN ('admin', 'director', 'superadmin')
        AND activo = true
    )
  );

CREATE POLICY actualizacion_catalogo_propio ON procedimientos_esteticos_catalogo
  FOR UPDATE TO authenticated
  USING (
    id_clinica IS NOT NULL AND id_clinica IN (
      SELECT id_clinica FROM admin_users
      WHERE auth_id = auth.uid()
        AND rol IN ('admin', 'director', 'superadmin')
        AND activo = true
    )
  )
  WITH CHECK (
    id_clinica IS NOT NULL AND id_clinica IN (
      SELECT id_clinica FROM admin_users
      WHERE auth_id = auth.uid()
        AND rol IN ('admin', 'director', 'superadmin')
        AND activo = true
    )
  );

-- ── Inmutabilidad post-firma ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.block_update_signed_ficha_estetica()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado = true AND (
    NEW.motivo IS DISTINCT FROM OLD.motivo OR
    NEW.observaciones_generales IS DISTINCT FROM OLD.observaciones_generales OR
    NEW.tipo_ficha IS DISTINCT FROM OLD.tipo_ficha
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una ficha estética firmada';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_block_update_signed_ficha_estetica
  BEFORE UPDATE ON fce_fichas_esteticas
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_ficha_estetica();

-- Zonas de una ficha firmada tampoco se pueden insertar/actualizar/borrar —
-- mismo patrón que trg_block_write_items_signed_presupuesto (20260828_01).
CREATE OR REPLACE FUNCTION public.block_write_zonas_signed_ficha_estetica()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  ficha_firmada boolean;
BEGIN
  SELECT firmado INTO ficha_firmada
  FROM fce_fichas_esteticas
  WHERE id = COALESCE(NEW.id_ficha_estetica, OLD.id_ficha_estetica);

  IF ficha_firmada = true THEN
    RAISE EXCEPTION 'No se pueden modificar las zonas de una ficha estética firmada';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_block_write_zonas_signed_ficha_estetica
  BEFORE INSERT OR UPDATE OR DELETE ON fce_ficha_estetica_zonas
  FOR EACH ROW EXECUTE FUNCTION block_write_zonas_signed_ficha_estetica();

-- ── Registro fotográfico (antes/después/evolución) ─────────────────────────
-- Incluida en esta misma migration (y no diferida a una posterior, como
-- planteaba originalmente el borrador del sprint) porque el server action
-- de subida a Storage de una tarea posterior escribe filas aquí. Esta
-- migration termina con un gate de aprobación humana (CLAUDE.md regla 15)
-- antes de aplicarse — una vez aprobada/aplicada, enmendarla in-place para
-- agregar una tabla habría sido incorrecto.

CREATE TABLE fce_ficha_estetica_fotos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ficha_estetica uuid        REFERENCES fce_fichas_esteticas(id) ON DELETE SET NULL,
  id_paciente       uuid        NOT NULL REFERENCES pacientes(id),
  id_clinica        uuid        NOT NULL REFERENCES clinicas(id),
  tipo              text        NOT NULL CHECK (tipo IN ('antes','despues','evolucion')),
  storage_path      text        NOT NULL,
  region            text        CHECK (region IN ('facial','corporal')),
  zona_codigo       text,
  tomada_at         timestamptz NOT NULL,
  created_by        uuid        NOT NULL
);

CREATE INDEX idx_fichas_esteticas_fotos_paciente ON fce_ficha_estetica_fotos(id_paciente, tomada_at DESC);
CREATE INDEX idx_fichas_esteticas_fotos_ficha    ON fce_ficha_estetica_fotos(id_ficha_estetica);

ALTER TABLE fce_ficha_estetica_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY acceso_clinico_fotos ON fce_ficha_estetica_fotos
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));
