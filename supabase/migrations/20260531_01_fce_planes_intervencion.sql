-- ============================================================================
-- Migration: 20260531_01_fce_planes_intervencion
-- Sprint: N1 — Módulo M10 Plan de Intervención
-- Descripción: plantillas_dominios, fce_planes_intervencion, fce_plan_objetivos,
--              fce_plan_progreso, secciones_estructuradas en fce_notas_clinicas,
--              tipo registro_externo en instrumentos_valoracion
-- Aplicado en producción: 2026-05-31
-- NOTA: ya aplicado en producción — migration reconstruida para versionado
-- ============================================================================

-- ── 1. plantillas_dominios ───────────────────────────────────────────────────
-- Catálogo global de plantillas de dominio por condición clínica (ej: TEA, PC).
-- Sin id_clinica — lectura pública para todos los tenants.
-- Sin RLS — tabla de catálogo de solo lectura para roles autenticados.

CREATE TABLE IF NOT EXISTS plantillas_dominios (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  condicion_codigo  text        NOT NULL UNIQUE,
  condicion_label   text        NOT NULL,
  descripcion       text,
  dominios          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Estructura de dominios:
  -- [{ codigo: text, label: text, orden: int, descripcion: text | null }]
  activo            boolean     NOT NULL DEFAULT true,
  orden             integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plantillas_dominios_condicion_codigo_idx
  ON plantillas_dominios(condicion_codigo);
CREATE INDEX IF NOT EXISTS plantillas_dominios_activo_idx
  ON plantillas_dominios(activo);

-- ── 2. fce_planes_intervencion ───────────────────────────────────────────────
-- Documento vivo — M10 NO es inmutable post-firma (no hay trigger de bloqueo).
-- created_by y firmado_por referencian auth.uid() (no profesionales.id).

CREATE TABLE IF NOT EXISTS fce_planes_intervencion (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica            uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente           uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro_origen   uuid        REFERENCES fce_encuentros(id),
  titulo                text        NOT NULL,
  condicion_codigo      text,
  diagnostico           text,
  icd_codigos           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Estructura de icd_codigos: ICDCodeSnap[]
  -- [{ code, title, uri, version, language, addedAt, addedBy }]
  fecha_inicio          date        NOT NULL,
  fecha_revision        date,
  estado                text        NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador', 'activo', 'en_revision', 'cerrado')),
  firmado               boolean     NOT NULL DEFAULT false,
  firmado_at            timestamptz,
  firmado_por           uuid,       -- auth.uid() del profesional que firma
  snapshot_equipo       jsonb,
  created_by            uuid        NOT NULL, -- auth.uid()
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fce_planes_intervencion_id_paciente_idx
  ON fce_planes_intervencion(id_paciente);
CREATE INDEX IF NOT EXISTS fce_planes_intervencion_id_clinica_idx
  ON fce_planes_intervencion(id_clinica);
CREATE INDEX IF NOT EXISTS fce_planes_intervencion_estado_idx
  ON fce_planes_intervencion(estado);

ALTER TABLE fce_planes_intervencion ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_planes_intervencion_select ON fce_planes_intervencion
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_planes_intervencion_insert ON fce_planes_intervencion
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_planes_intervencion_update ON fce_planes_intervencion
  FOR UPDATE TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- ── 3. fce_plan_objetivos ────────────────────────────────────────────────────
-- Objetivos GAS del plan. ON DELETE CASCADE desde fce_planes_intervencion.
-- nivel_basal y nivel_actual: enteros entre -2 y 2 (NivelGAS).

CREATE TABLE IF NOT EXISTS fce_plan_objetivos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica            uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente           uuid        NOT NULL REFERENCES pacientes(id),
  id_plan               uuid        NOT NULL REFERENCES fce_planes_intervencion(id) ON DELETE CASCADE,
  dominio_codigo        text        NOT NULL,
  dominio_label         text        NOT NULL,
  descripcion           text        NOT NULL,
  criterio_logro        text,
  gas_menos_2           text,       -- Descriptor nivel -2
  gas_menos_1           text,       -- Descriptor nivel -1
  gas_0                 text,       -- Descriptor nivel  0 (resultado esperado)
  gas_mas_1             text,       -- Descriptor nivel +1
  gas_mas_2             text,       -- Descriptor nivel +2
  nivel_basal           integer     NOT NULL DEFAULT -1
                          CHECK (nivel_basal BETWEEN -2 AND 2),
  nivel_actual          integer     NOT NULL DEFAULT -1
                          CHECK (nivel_actual BETWEEN -2 AND 2),
  prioridad             text        NOT NULL DEFAULT 'media'
                          CHECK (prioridad IN ('alta', 'media', 'baja')),
  estado                text        NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'logrado', 'reformulado', 'suspendido')),
  responsable_principal text,
  orden                 integer     NOT NULL DEFAULT 0,
  created_by            uuid        NOT NULL, -- auth.uid()
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fce_plan_objetivos_id_plan_idx
  ON fce_plan_objetivos(id_plan);
CREATE INDEX IF NOT EXISTS fce_plan_objetivos_id_paciente_idx
  ON fce_plan_objetivos(id_paciente);
CREATE INDEX IF NOT EXISTS fce_plan_objetivos_id_clinica_idx
  ON fce_plan_objetivos(id_clinica);

ALTER TABLE fce_plan_objetivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_plan_objetivos_select ON fce_plan_objetivos
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_plan_objetivos_insert ON fce_plan_objetivos
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_plan_objetivos_update ON fce_plan_objetivos
  FOR UPDATE TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_plan_objetivos_delete ON fce_plan_objetivos
  FOR DELETE TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- ── 4. fce_plan_progreso ─────────────────────────────────────────────────────
-- Registro de progreso por objetivo (serie temporal de niveles GAS).
-- ON DELETE CASCADE desde fce_plan_objetivos.
-- registrado_por = auth.uid() (no profesionales.id).

CREATE TABLE IF NOT EXISTS fce_plan_progreso (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid        NOT NULL REFERENCES pacientes(id),
  id_objetivo     uuid        NOT NULL REFERENCES fce_plan_objetivos(id) ON DELETE CASCADE,
  id_encuentro    uuid        REFERENCES fce_encuentros(id),
  nivel_gas       integer     NOT NULL
                    CHECK (nivel_gas BETWEEN -2 AND 2),
  observacion     text,
  estrategias     text,
  registrado_por  uuid        NOT NULL, -- auth.uid()
  registrado_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fce_plan_progreso_id_objetivo_idx
  ON fce_plan_progreso(id_objetivo);
CREATE INDEX IF NOT EXISTS fce_plan_progreso_id_paciente_idx
  ON fce_plan_progreso(id_paciente);
CREATE INDEX IF NOT EXISTS fce_plan_progreso_id_clinica_idx
  ON fce_plan_progreso(id_clinica);
CREATE INDEX IF NOT EXISTS fce_plan_progreso_registrado_at_idx
  ON fce_plan_progreso(registrado_at DESC);

ALTER TABLE fce_plan_progreso ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_plan_progreso_select ON fce_plan_progreso
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_plan_progreso_insert ON fce_plan_progreso
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- ── 5. secciones_estructuradas en fce_notas_clinicas ─────────────────────────
-- Columna jsonb para notas clínicas estructuradas por sección (sprint P2).
-- Valor por defecto '{}' — retrocompatible con notas existentes.

ALTER TABLE fce_notas_clinicas
  ADD COLUMN IF NOT EXISTS secciones_estructuradas jsonb DEFAULT '{}'::jsonb;

-- ── 6. tipo_renderer = 'registro_externo' en instrumentos_valoracion ─────────
-- tipo_renderer es una columna TEXT (no enum) — no requiere DDL adicional.
-- El valor 'registro_externo' se almacena como texto libre junto a
-- 'escala_simple' y 'componente_custom' (ver src/types/instrumento.ts).
-- Los instrumentos con este tipo usan RegistroResultadoExterno como renderer
-- y puntaje_total se almacena como NULL en instrumentos_aplicados.
-- Los datos de subescalas se guardan en la columna respuestas (jsonb).
--
-- Instrumentos con tipo_renderer = 'registro_externo' (seed en sprint N1):
--   ADOS-2, CARS-2, Vineland-3, WISC-V, entre otros (neurodesarrollo/psicología).
