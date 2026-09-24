-- Amplía el CHECK de admin_users.rol para incluir 'coordinador'.
-- PENDIENTE APLICAR — verificar el nombre real de la constraint contra prod
-- antes de ejecutar (asumido admin_users_rol_check, nombre por defecto de Postgres).
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_rol_check;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_rol_check
  CHECK (rol IN ('superadmin', 'director', 'admin', 'profesional', 'recepcionista', 'coordinador'));
