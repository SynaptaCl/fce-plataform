-- ============================================================================
-- Migration: 20260907_03_storage_bucket_fichas_esteticas
-- Sprint: M13 — Módulo Ficha Estética
-- Descripción: Bucket privado para fotos antes/después/evolución. Primera
--   vez que fce-plataform usa Supabase Storage — no hay precedente en el
--   repo. Path convencional: {id_clinica}/{id_paciente}/{uuid}.{ext}.
--   RLS de storage.objects scoped por el primer segmento del path
--   (id_clinica) usando tiene_acceso_clinico(), mismo criterio que las
--   tablas fce_*.
-- Impacto: Bucket nuevo, políticas nuevas sobre storage.objects — no afecta
--   ningún bucket ni política existente.
-- Rollback: DELETE FROM storage.buckets WHERE id = 'fichas-esteticas';
--   (requiere vaciar el bucket de objetos antes de poder borrarlo)
-- Aprobación humana pendiente — NO aplicar sin revisión (CLAUDE.md regla 15).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('fichas-esteticas', 'fichas-esteticas', false)
ON CONFLICT (id) DO NOTHING;

-- El primer segmento del path (storage.foldername(name)[1]) es id_clinica.
-- (storage.objects.name) = '{id_clinica}/{id_paciente}/{uuid}.{ext}'

CREATE POLICY fichas_esteticas_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fichas-esteticas'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY fichas_esteticas_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fichas-esteticas'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY fichas_esteticas_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fichas-esteticas'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
  );
