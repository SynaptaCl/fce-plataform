-- Función aditiva: no reemplaza tiene_acceso_clinico(), la extiende para
-- lecturas específicas de plan de intervención / plan de tratamiento / notas
-- administrativas. PENDIENTE APLICAR.
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
