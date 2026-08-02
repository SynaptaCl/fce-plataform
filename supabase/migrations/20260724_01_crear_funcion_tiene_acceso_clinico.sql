-- ============================================================================
-- Migration: 20260724_01_crear_funcion_tiene_acceso_clinico
-- Aplicado en producción: 2026-07-24 (migrations reales:
--   crear_funcion_tiene_acceso_clinico, rls_separacion_acceso_clinico_parte1,
--   rls_separacion_acceso_clinico_parte2)
-- NOTA: ya aplicado en producción — reconstruida el 2026-08-02 vía verificación
--   MCP Supabase (auditoría de cumplimiento legal); no existía en el repo.
--   Reemplaza el patrón get_clinica_ids_for_user() (20260606_01) como
--   mecanismo de RLS para la mayoría de tablas clínicas fce_*. CLAUDE.md y
--   docs/plan-redisenio siguen describiendo get_clinica_ids_for_user() como
--   vigente — desactualizado para las tablas listadas abajo.
--   NOTA DE INCONSISTENCIA: la tabla `pacientes` NO fue migrada a esta
--   función — sigue usando get_clinica_ids_for_user() (policy
--   pacientes_by_clinica). Dos mecanismos de control de acceso conviven.
--   Verificar si es intencional o deuda pendiente.
-- Descripción: tiene_acceso_clinico(p_id_clinica) — true si el usuario
--   autenticado es director/admin/superadmin de esa clínica, O tiene una fila
--   en admin_user_profesionales (vínculo admin_user↔profesional). Reemplaza
--   las policies de fce_notas_soap, fce_egresos, fce_periograma,
--   fce_ordenes_examen, fce_consentimientos, fce_notas_clinicas,
--   fce_evaluaciones, fce_prescripciones, fce_informes, fce_adendas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tiene_acceso_clinico(p_id_clinica uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.auth_id    = (SELECT auth.uid())
      AND au.activo     = true
      AND au.id_clinica = p_id_clinica
      AND (
        au.rol IN ('director', 'admin', 'superadmin')
        OR EXISTS (
          SELECT 1 FROM public.admin_user_profesionales aup
          WHERE aup.id_admin_user = au.id
        )
      )
  );
$function$;

-- fce_notas_soap: policy UPDATE separa USING/WITH CHECK (permite la
-- transición firmado=false → true; el WITH CHECK no exige firmado=false).
DROP POLICY IF EXISTS fce_soap_insert ON fce_notas_soap;
CREATE POLICY fce_soap_insert ON fce_notas_soap
  FOR INSERT TO authenticated
  WITH CHECK (tiene_acceso_clinico(id_clinica));

DROP POLICY IF EXISTS fce_soap_select ON fce_notas_soap;
CREATE POLICY fce_soap_select ON fce_notas_soap
  FOR SELECT TO authenticated
  USING (tiene_acceso_clinico(id_clinica));

DROP POLICY IF EXISTS fce_soap_update ON fce_notas_soap;
CREATE POLICY fce_soap_update ON fce_notas_soap
  FOR UPDATE TO authenticated
  USING (firmado = false AND tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- fce_egresos / fce_periograma / fce_ordenes_examen: policy única FOR ALL.
DROP POLICY IF EXISTS fce_egresos_select ON fce_egresos;
DROP POLICY IF EXISTS fce_egresos_insert ON fce_egresos;
DROP POLICY IF EXISTS fce_egresos_update ON fce_egresos;
CREATE POLICY acceso_clinico_all ON fce_egresos
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY acceso_clinico_all ON fce_periograma
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY acceso_clinico_all ON fce_ordenes_examen
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- fce_consentimientos
DROP POLICY IF EXISTS fce_consentimientos_update ON fce_consentimientos;
CREATE POLICY fce_consentimientos_insert ON fce_consentimientos
  FOR INSERT TO authenticated
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY fce_consentimientos_select ON fce_consentimientos
  FOR SELECT TO authenticated
  USING (tiene_acceso_clinico(id_clinica));

CREATE POLICY fce_consentimientos_update ON fce_consentimientos
  FOR UPDATE TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- fce_notas_clinicas / fce_prescripciones / fce_adendas: policy única FOR ALL.
CREATE POLICY acceso_clinico_all ON fce_notas_clinicas
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY acceso_clinico_all ON fce_prescripciones
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY acceso_clinico_all ON fce_adendas
  FOR ALL TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- fce_evaluaciones
CREATE POLICY fce_evaluaciones_insert ON fce_evaluaciones
  FOR INSERT TO authenticated
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY fce_evaluaciones_select ON fce_evaluaciones
  FOR SELECT TO authenticated
  USING (tiene_acceso_clinico(id_clinica));

CREATE POLICY fce_evaluaciones_update ON fce_evaluaciones
  FOR UPDATE TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

-- fce_informes: firmado bloquea DELETE además de estar cubierto por trigger.
CREATE POLICY informes_insert ON fce_informes
  FOR INSERT TO authenticated
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY informes_select ON fce_informes
  FOR SELECT TO authenticated
  USING (tiene_acceso_clinico(id_clinica));

CREATE POLICY informes_update ON fce_informes
  FOR UPDATE TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY informes_delete ON fce_informes
  FOR DELETE TO authenticated
  USING (tiene_acceso_clinico(id_clinica) AND firmado = false);
