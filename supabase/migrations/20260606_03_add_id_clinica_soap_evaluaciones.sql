-- Migration: 20260606_03_add_id_clinica_soap_evaluaciones
-- Contexto: Hardening multi-tenant 2026-06-06.
--   fce_notas_soap y fce_evaluaciones carecían de columna id_clinica directa.
--   Su aislamiento de tenant dependía de JOIN a fce_encuentros en las políticas RLS,
--   lo que dejaba gaps de cross-tenant cuando se usaba serviceClient (bypass RLS).
--   Esta migración agrega id_clinica NOT NULL a ambas tablas con backfill desde
--   fce_encuentros / pacientes, y actualiza las políticas RLS para filtrar directo.
-- Estado: Aplicada directamente en producción el 2026-06-06.
-- Complementa: 20260606_02_fix_rls_tenant_isolation_5_policies.sql

-- ── 1. fce_notas_soap ─────────────────────────────────────────────────────────

ALTER TABLE fce_notas_soap
  ADD COLUMN IF NOT EXISTS id_clinica uuid REFERENCES clinicas(id);

-- Backfill: poblar id_clinica desde el encuentro asociado
UPDATE fce_notas_soap n
SET id_clinica = e.id_clinica
FROM fce_encuentros e
WHERE n.id_encuentro = e.id
  AND n.id_clinica IS NULL;

-- Hacer NOT NULL después del backfill
ALTER TABLE fce_notas_soap
  ALTER COLUMN id_clinica SET NOT NULL;

CREATE INDEX IF NOT EXISTS fce_notas_soap_id_clinica_idx ON fce_notas_soap (id_clinica);

-- Recrear políticas RLS para filtrar directo por id_clinica (sin JOIN)
ALTER TABLE fce_notas_soap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_soap_select ON fce_notas_soap;
CREATE POLICY fce_soap_select ON fce_notas_soap
  FOR SELECT TO authenticated
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

DROP POLICY IF EXISTS fce_soap_insert ON fce_notas_soap;
CREATE POLICY fce_soap_insert ON fce_notas_soap
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

DROP POLICY IF EXISTS fce_soap_update ON fce_notas_soap;
CREATE POLICY fce_soap_update ON fce_notas_soap
  FOR UPDATE TO authenticated
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

-- ── 2. fce_evaluaciones ───────────────────────────────────────────────────────

ALTER TABLE fce_evaluaciones
  ADD COLUMN IF NOT EXISTS id_clinica uuid REFERENCES clinicas(id);

-- Backfill vía encuentro cuando existe
UPDATE fce_evaluaciones ev
SET id_clinica = e.id_clinica
FROM fce_encuentros e
WHERE ev.id_encuentro = e.id
  AND ev.id_clinica IS NULL
  AND ev.id_encuentro IS NOT NULL;

-- Backfill vía paciente para evaluaciones sin encuentro
UPDATE fce_evaluaciones ev
SET id_clinica = p.id_clinica
FROM pacientes p
WHERE ev.id_paciente = p.id
  AND ev.id_clinica IS NULL;

ALTER TABLE fce_evaluaciones
  ALTER COLUMN id_clinica SET NOT NULL;

CREATE INDEX IF NOT EXISTS fce_evaluaciones_id_clinica_idx ON fce_evaluaciones (id_clinica);

ALTER TABLE fce_evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_evaluaciones_select ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_select ON fce_evaluaciones
  FOR SELECT TO authenticated
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

DROP POLICY IF EXISTS fce_evaluaciones_insert ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_insert ON fce_evaluaciones
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

DROP POLICY IF EXISTS fce_evaluaciones_update ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_update ON fce_evaluaciones
  FOR UPDATE TO authenticated
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));
