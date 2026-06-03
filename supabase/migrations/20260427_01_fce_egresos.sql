-- ============================================================================
-- Migration: 20260427_01_fce_egresos
-- Sprint: M9 — Egresos clínicos
-- Descripción: Tabla fce_egresos + columna estado_clinico en pacientes
-- Aplicado en producción: 2026-04-27
-- NOTA: ya aplicado en producción — migration reconstruida para versionado
-- ============================================================================

CREATE TABLE IF NOT EXISTS fce_egresos (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica                uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente               uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro              uuid        REFERENCES fce_encuentros(id),
  tipo_egreso               text        NOT NULL
                              CHECK (tipo_egreso IN ('alta_clinica','abandono','derivacion','fallecimiento','otro')),
  diagnostico_egreso        text        NOT NULL,
  resumen_tratamiento       text        NOT NULL,
  estado_al_egreso          text,
  indicaciones_post_egreso  text,
  derivacion_a              text,
  notas                     text,
  firmado                   boolean     NOT NULL DEFAULT false,
  firmado_at                timestamptz,
  firmado_por               uuid        REFERENCES profesionales(id),
  created_by                uuid        NOT NULL REFERENCES profesionales(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  snapshot_equipo_tratante  jsonb
);

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS estado_clinico text;

CREATE INDEX IF NOT EXISTS fce_egresos_id_paciente_idx ON fce_egresos(id_paciente);
CREATE INDEX IF NOT EXISTS fce_egresos_id_clinica_idx  ON fce_egresos(id_clinica);

ALTER TABLE fce_egresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_egresos_select ON fce_egresos
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_egresos_insert ON fce_egresos
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY fce_egresos_update ON fce_egresos
  FOR UPDATE TO authenticated
  USING (
    id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
    AND firmado = false
  );
