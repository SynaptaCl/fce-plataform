-- Migration: 20260606_02_fix_rls_tenant_isolation_5_policies
-- Contexto: Auditoría 2026-06-06 identificó fugas cross-tenant en Server Actions.
--   Esta migración corrige las 5 políticas RLS con gaps de tenant isolation.
--   Las actions también fueron hardened con .eq("id_clinica") en el mismo commit.
-- Estado: Aplicada directamente en producción el 2026-06-06.
-- Reemplaza: supabase/migrations/20260601_01_hotfix_rls_tenant_isolation.sql (renombrada a .sql.obsolete)
--
-- Políticas corregidas:
--   1. fce_signos_vitales — SELECT + INSERT (antes USING(true) / WITH CHECK(true))
--   2. fce_notas_soap     — INSERT + UPDATE (antes WITH CHECK(true); UPDATE solo firmado=false sin guard de tenant)
--   3. fce_evaluaciones   — INSERT (antes WITH CHECK(true))
--   4. fce_consentimientos — UPDATE nueva (no existía; signConsentimiento firmaba sin verificar clínica)
--   5. logs_auditoria     — SELECT para authenticated (antes solo actor_id podía leer sus propios logs)

-- ── 1. fce_signos_vitales ─────────────────────────────────────────────────────
ALTER TABLE fce_signos_vitales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_signos_vitales_select ON fce_signos_vitales;
CREATE POLICY fce_signos_vitales_select ON fce_signos_vitales
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

DROP POLICY IF EXISTS fce_signos_vitales_insert ON fce_signos_vitales;
CREATE POLICY fce_signos_vitales_insert ON fce_signos_vitales
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- ── 2. fce_notas_soap ─────────────────────────────────────────────────────────
-- fce_notas_soap no tiene id_clinica — tenant guard via JOIN a fce_encuentros.
ALTER TABLE fce_notas_soap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_soap_insert ON fce_notas_soap;
CREATE POLICY fce_soap_insert ON fce_notas_soap
  FOR INSERT TO authenticated
  WITH CHECK (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

DROP POLICY IF EXISTS fce_soap_update ON fce_notas_soap;
CREATE POLICY fce_soap_update ON fce_notas_soap
  FOR UPDATE TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- ── 3. fce_evaluaciones ───────────────────────────────────────────────────────
-- fce_evaluaciones no tiene id_clinica — mismo patrón que fce_notas_soap.
ALTER TABLE fce_evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_evaluaciones_insert ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_insert ON fce_evaluaciones
  FOR INSERT TO authenticated
  WITH CHECK (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- ── 4. fce_consentimientos UPDATE ─────────────────────────────────────────────
ALTER TABLE fce_consentimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fce_consentimientos_update ON fce_consentimientos;
CREATE POLICY fce_consentimientos_update ON fce_consentimientos
  FOR UPDATE TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- ── 5. logs_auditoria SELECT ──────────────────────────────────────────────────
-- logs_auditoria.id_clinica es nullable; filas sin id_clinica (eventos globales)
-- no son accesibles por tenant — comportamiento intencional.
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_auditoria_select ON logs_auditoria;
CREATE POLICY logs_auditoria_select ON logs_auditoria
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));
