-- Migration: 20260601_01_hotfix_rls_tenant_isolation
-- Sprint: P1 / Fase 0
-- Descripción: Cierra fuga cross-tenant en fce_notas_soap, fce_evaluaciones y profesionales
-- Impacto: Solo políticas RLS. No toca datos ni estructura.
-- Rollback: recrear las políticas con USING(true) (NO recomendado)

-- 1. fce_notas_soap — filtrar via JOIN a fce_encuentros
DROP POLICY IF EXISTS fce_soap_select ON fce_notas_soap;
CREATE POLICY fce_soap_select ON fce_notas_soap FOR SELECT TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 2. fce_evaluaciones — SELECT
DROP POLICY IF EXISTS fce_evaluaciones_select ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_select ON fce_evaluaciones FOR SELECT TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 3. fce_evaluaciones — UPDATE
DROP POLICY IF EXISTS fce_evaluaciones_update ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_update ON fce_evaluaciones FOR UPDATE TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 4. profesionales — eliminar lectura pública sin auth
DROP POLICY IF EXISTS public_read_profesionales_activos ON profesionales;
-- profesionales_by_clinica ya cubre el SELECT autenticado por clínica.
