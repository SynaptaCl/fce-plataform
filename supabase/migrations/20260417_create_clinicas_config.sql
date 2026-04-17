-- ============================================================================
-- Migration: crear tabla clinicas_config (multi-tenant config)
-- Fecha: 2026-04-17
-- ============================================================================
-- Esta tabla contiene la configuración por clínica: módulos activos,
-- especialidades, branding y overrides granulares.
--
-- IMPORTANTE: Antes de correr esta migration en producción:
--   1. Verificar que la tabla `clinicas` ya existe
--   2. Verificar que `admin_users` ya existe con columna `id_clinica` + `rol`
--   3. Tener UUID de Korporis a mano para el seed final
-- ============================================================================

-- Tabla principal
create table if not exists clinicas_config (
  id_clinica uuid primary key references clinicas(id) on delete cascade,

  nombre_display text not null,
  slug text unique not null,
  logo_url text,

  modulos_activos text[] not null default array['M1_identificacion', 'M6_auditoria']::text[],
  especialidades_activas text[] not null default array[]::text[],

  tokens_color jsonb not null default '{
    "primary": "#006B6B",
    "primary-deep": "#004545",
    "accent": "#00B0A8",
    "accent-md": "#33C4BE",
    "accent-lt": "#D5F5F4",
    "secondary": "#F5A623"
  }'::jsonb,

  config_modulos jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Índices
create index if not exists idx_clinicas_config_slug on clinicas_config(slug);

-- Trigger updated_at
create or replace function set_clinicas_config_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clinicas_config_updated_at on clinicas_config;
create trigger trg_clinicas_config_updated_at
  before update on clinicas_config
  for each row execute function set_clinicas_config_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table clinicas_config enable row level security;

-- SELECT: cualquier usuario autenticado de la clínica puede leer su config
drop policy if exists "leer config de propia clinica" on clinicas_config;
create policy "leer config de propia clinica" on clinicas_config
  for select
  to authenticated
  using (
    exists (
      select 1 from admin_users
      where admin_users.auth_id = auth.uid()
        and admin_users.id_clinica = clinicas_config.id_clinica
    )
  );

-- UPDATE: solo admins de la clínica pueden modificar su config
drop policy if exists "admin modifica config" on clinicas_config;
create policy "admin modifica config" on clinicas_config
  for update
  to authenticated
  using (
    exists (
      select 1 from admin_users
      where admin_users.auth_id = auth.uid()
        and admin_users.id_clinica = clinicas_config.id_clinica
        and admin_users.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1 from admin_users
      where admin_users.auth_id = auth.uid()
        and admin_users.id_clinica = clinicas_config.id_clinica
        and admin_users.rol = 'admin'
    )
  );

-- INSERT: bloqueado para clientes, solo service_role (onboarding via script)
drop policy if exists "insert solo service role" on clinicas_config;
create policy "insert solo service role" on clinicas_config
  for insert
  to authenticated
  with check (false);

-- DELETE: nunca desde el cliente
drop policy if exists "no delete" on clinicas_config;
create policy "no delete" on clinicas_config
  for delete
  to authenticated
  using (false);

-- ============================================================================
-- Comentarios en columnas
-- ============================================================================

comment on table clinicas_config is 'Configuración multi-tenant por clínica: módulos activos, especialidades, branding y overrides.';
comment on column clinicas_config.modulos_activos is 'Array de ModuleId (ver src/lib/modules/registry.ts). Ej: {M1_identificacion, M2_anamnesis, ...}';
comment on column clinicas_config.especialidades_activas is 'Array de EspecialidadId. Solo relevante si M3_evaluacion está activo.';
comment on column clinicas_config.tokens_color is 'Paleta de marca inyectada como CSS vars. Claves esperadas: primary, primary-deep, accent, accent-md, accent-lt, secondary.';
comment on column clinicas_config.config_modulos is 'Overrides granulares por módulo. Ej: {"M2_anamnesis": {"red_flags_obligatorio": true}}';

-- ============================================================================
-- SEED: Korporis
-- ============================================================================
-- REEMPLAZAR '<UUID_KORPORIS>' con el UUID real desde `select id from clinicas where nombre ilike '%korporis%'`
-- Antes de hacerlo, correr el select para confirmar el UUID.
--
-- insert into clinicas_config (
--   id_clinica,
--   nombre_display,
--   slug,
--   modulos_activos,
--   especialidades_activas,
--   tokens_color
-- ) values (
--   '<UUID_KORPORIS>'::uuid,
--   'Korporis Centro de Salud',
--   'korporis',
--   array['M1_identificacion', 'M2_anamnesis', 'M3_evaluacion', 'M4_soap', 'M5_consentimiento', 'M6_auditoria'],
--   array['kinesiologia', 'fonoaudiologia', 'masoterapia'],
--   '{
--     "primary": "#006B6B",
--     "primary-deep": "#004545",
--     "accent": "#00B0A8",
--     "accent-md": "#33C4BE",
--     "accent-lt": "#D5F5F4",
--     "secondary": "#F5A623"
--   }'::jsonb
-- )
-- on conflict (id_clinica) do nothing;
