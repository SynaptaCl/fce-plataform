-- Forzar RLS en tablas criticas de autenticacion/profesional
-- Antes: relrowsecurity=true pero relforcerowsecurity=false (owner/superuser saltan RLS)
-- Despues: FORCE => ninguna sesion (incluido owner) evade las policies
-- Las policies service_role (service_all = true) conservan acceso total, sin impacto operativo.

ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profesionales FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_profesionales FORCE ROW LEVEL SECURITY;
