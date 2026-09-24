-- Función aditiva: no reemplaza tiene_acceso_clinico(), la extiende para
-- lecturas específicas de plan de intervención / plan de tratamiento / notas
-- administrativas. PENDIENTE APLICAR.
--
-- CAVEAT operativo (hallazgo revisión 2026-09-23): tiene_acceso_clinico()
-- devuelve true para cualquier admin_users con fila en admin_user_profesionales,
-- SIN mirar el rol. Si una cuenta coordinador llegara a tener fila en
-- admin_user_profesionales, obtendría acceso clínico completo (SOAP,
-- consentimientos, prescripciones, etc.) por esa vía, no por esta función.
-- Regla de onboarding: NUNCA vincular un admin_users con rol='coordinador'
-- en admin_user_profesionales.
CREATE OR REPLACE FUNCTION public.puede_ver_plan_coordinador(p_id_clinica uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tiene_acceso_clinico(p_id_clinica)
  OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_id = auth.uid()
      AND rol = 'coordinador'
      AND id_clinica = p_id_clinica
      AND activo = true
  );
$$;
