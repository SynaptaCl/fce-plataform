-- Migration: 20260606_01_version_get_clinica_ids_for_user
-- Contexto: La función get_clinica_ids_for_user(uuid) se usa en políticas RLS de
--   fce_notas_soap, fce_evaluaciones, fce_egresos y fce_planes_intervencion,
--   pero nunca estuvo versionada en el repositorio. Esta migración la registra
--   para que 'supabase db push' no falle en entornos nuevos o resets de BD.
-- Estado: Aplicada directamente en producción el 2026-06-06 (post-auditoría).

CREATE OR REPLACE FUNCTION get_clinica_ids_for_user(user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT id_clinica
  FROM admin_users
  WHERE auth_id = user_id
    AND activo = true
    AND id_clinica IS NOT NULL;
$$;
