-- ============================================================================
-- Migration: 20261114_01_fce_adjuntos
-- Sprint: ADJ-1 — Adjuntos clínicos: imágenes y resultados de examen
-- Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
--
-- Descripción: Tabla transversal fce_adjuntos (NO es ModuleId — mismo criterio
--   que fce_adendas) + bucket privado adjuntos-clinicos. Permite adjuntar
--   imágenes clínicas (JPG/PNG/WEBP ≤8MB) y documentos/PDF (≤15MB) a la ficha
--   del paciente, con vinculación opcional a fce_ordenes_examen (M8).
--
--   Flujo de validación (plan D4):
--     profesional sube        → estado_validacion='validado' (auto-validado)
--     recepcionista/director  → estado_validacion='pendiente' → solo un
--                               profesional puede validar/anular
--
--   DESVIACIÓN DOCUMENTADA vs resto de tablas fce_* (plan D2):
--   created_by guarda auth.users.id del uploader (NO profesionales.id) porque
--   recepcionista/director no tienen fila en profesionales. Se acompaña de
--   created_by_rol para display. validado_por sí es profesionales.id.
--
--   Subida: upload DIRECTO del cliente a Storage (límite body Vercel ~4.5MB
--   hace inviable pasar 15MB por Server Action — plan D3). Las policies del
--   bucket son el gate real de tenancy+rol al INSERT del objeto; la action
--   registrarAdjunto valida magic bytes/tamaño y elimina el objeto si falla.
--
-- Verificado contra prod 2026-11-14 (PostgREST solo-lectura):
--   * fce_adjuntos no existe (sin colisión); FK targets existen.
--   * fce_ordenes_examen.estado_resultados es actualizable post-firma
--     (block_update_signed_orden_examen solo bloquea contenido clínico).
--   * buckets vivos: clinic-assets, fichas-esteticas, documentos-firma,
--     archivos-clinica (synapta) — adjuntos-clinicos sin colisión.
--   * Policy names con prefijo adjuntos_clinicos_obj_*: anti-colisión con
--     policies synapta de nombres desconocidos (un CREATE POLICY colisionante
--     falla ruidosamente en vez de sobrescribir).
--
-- Impacto: tabla + índices + RLS nuevos; bucket + 3 policies en
--   storage.objects. No modifica tablas ni buckets existentes.
-- Rollback:
--   DROP TABLE IF EXISTS fce_adjuntos CASCADE;
--   DELETE FROM storage.buckets WHERE id = 'adjuntos-clinicos';
--   (vaciar el bucket antes de borrarlo)
--
-- ⚠ NO APLICADA (2026-11-14): revisada tras security review; pendiente de aplicar
--   por un humano (CLAUDE.md regla 15; el MCP del entorno no tiene permiso de escritura).
--   Pre-flight: confirmar que el MCP/SQL apunta a vigyhfpwyxihrjiygfsa y
--   revisar policies vivas de storage.objects (ver plan §Verificación).
-- ============================================================================

CREATE TABLE fce_adjuntos (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica              uuid        NOT NULL REFERENCES clinicas(id),
  id_paciente             uuid        NOT NULL REFERENCES pacientes(id),
  id_encuentro            uuid        REFERENCES fce_encuentros(id) ON DELETE SET NULL,
  id_orden_examen         uuid        REFERENCES fce_ordenes_examen(id) ON DELETE SET NULL,
  categoria               text        NOT NULL CHECK (categoria IN ('imagen_clinica','resultado_examen','documento')),
  descripcion             text,
  nombre_archivo_original text        NOT NULL,
  mime_type               text        NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  storage_path            text        NOT NULL UNIQUE,
  tamano_bytes            integer     NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 15728640),
  fecha_documento         date        NOT NULL DEFAULT CURRENT_DATE,
  estado_validacion       text        NOT NULL DEFAULT 'pendiente'
                                      CHECK (estado_validacion IN ('pendiente','validado')),
  validado_por            uuid,       -- profesionales.id (FK deliberadamente sin constraint, convención fce_ficha_estetica_fotos.created_by)
  validado_at             timestamptz,
  anulado                 boolean     NOT NULL DEFAULT false,
  anulado_motivo          text,
  anulado_por             uuid,       -- auth uid del profesional que anuló
  anulado_at              timestamptz,
  created_by              uuid        NOT NULL,  -- ⚠ auth.users.id del uploader (desviación D2)
  created_by_rol          text        NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()  -- app-managed (convención fce_ordenes_examen)
);

CREATE INDEX idx_adjuntos_paciente   ON fce_adjuntos(id_paciente, created_at DESC);
CREATE INDEX idx_adjuntos_orden      ON fce_adjuntos(id_orden_examen) WHERE id_orden_examen IS NOT NULL;
CREATE INDEX idx_adjuntos_pendientes ON fce_adjuntos(id_clinica, estado_validacion) WHERE estado_validacion = 'pendiente';

COMMENT ON TABLE fce_adjuntos IS
  'Adjuntos clínicos transversales (imágenes y resultados de examen). created_by = auth.users.id (D2). Solo adjuntos validados y no anulados aparecen en timeline/PDF.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Revisión de seguridad 2026-11-14 (antes de aplicar):
--   * INSERT: `au.id_clinica = id_clinica` sin calificar era una tautología
--     (cross-tenant). Ahora califica, exige created_by = auth.uid(), paciente
--     de la misma clínica, path canónico y que solo un profesional inserte
--     como 'validado'.
--   * UPDATE/DELETE: ya no basta tiene_acceso_clinico (incluía admin/director,
--     que son solo lectura por decisión 2026-09-29). UPDATE = es_profesional_clinico;
--     DELETE = solo pendientes (uploader o profesional).
--   * Storage: la recepcionista NO pasa tiene_acceso_clinico, pero la action
--     registrarAdjunto descarga el objeto (magic bytes) y limpia si falla, y
--     ella borra sus pendientes → se le permite solo SUS objetos (owner_id)
--     en su clínica; los de adjuntos validados no se borran por esa vía.

ALTER TABLE fce_adjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY adjuntos_select ON fce_adjuntos
  FOR SELECT TO authenticated
  USING (
    tiene_acceso_clinico(id_clinica)
    OR (created_by = auth.uid() AND estado_validacion = 'pendiente' AND anulado = false)
  );

CREATE POLICY adjuntos_insert ON fce_adjuntos
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND anulado = false
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_id = auth.uid()
        AND au.activo = true
        AND au.id_clinica = fce_adjuntos.id_clinica
        AND au.rol IN ('profesional','recepcionista','director')
    )
    AND EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = fce_adjuntos.id_paciente
        AND p.id_clinica = fce_adjuntos.id_clinica
    )
    AND storage_path LIKE (id_clinica::text || '/' || id_paciente::text || '/%')
    AND (
      (estado_validacion = 'pendiente' AND validado_por IS NULL AND validado_at IS NULL)
      OR es_profesional_clinico(id_clinica)
    )
  );

-- Validar / anular: solo profesional (admin/director son solo lectura).
CREATE POLICY adjuntos_update ON fce_adjuntos
  FOR UPDATE TO authenticated
  USING (es_profesional_clinico(id_clinica))
  WITH CHECK (es_profesional_clinico(id_clinica));

-- Hard delete: solo pendientes (uploader o profesional). Los validados se anulan, no se borran.
CREATE POLICY adjuntos_delete ON fce_adjuntos
  FOR DELETE TO authenticated
  USING (
    estado_validacion = 'pendiente'
    AND (created_by = auth.uid() OR es_profesional_clinico(id_clinica))
  );

-- ── Bucket privado con límites (defense in depth — mismo patrón que
--    documentos-firma). Path: {id_clinica}/{id_paciente}/{uuid}.{ext} ───────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('adjuntos-clinicos', 'adjuntos-clinicos', false, 15728640,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- El objeto se puede borrar por su uploader solo si no está registrado como
-- validado. SECURITY DEFINER porque la recepcionista no ve filas validadas.
CREATE OR REPLACE FUNCTION public.adjunto_objeto_eliminable(p_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM fce_adjuntos
    WHERE storage_path = p_path AND estado_validacion <> 'pendiente'
  );
$$;

-- SELECT: acceso clínico, o el propio uploader dentro de su clínica
-- (necesario para que registrarAdjunto valide magic bytes).
CREATE POLICY adjuntos_clinicos_obj_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'adjuntos-clinicos'
    AND (
      tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
      OR (
        owner_id = (SELECT auth.uid())::text
        AND EXISTS (
          SELECT 1 FROM admin_users au
          WHERE au.auth_id = auth.uid() AND au.activo = true
            AND au.id_clinica = (storage.foldername(name))[1]::uuid
        )
      )
    )
  );

-- INSERT (subida directa del cliente, plan D3): tenant + rol por admin_users.
-- No usa tiene_acceso_clinico: excluiría a la recepcionista (flujo de diseño).
CREATE POLICY adjuntos_clinicos_obj_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'adjuntos-clinicos'
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_id = auth.uid()
        AND au.activo = true
        AND au.id_clinica = (storage.foldername(name))[1]::uuid
        AND au.rol IN ('profesional','recepcionista','director')
    )
  );

-- DELETE: profesional de la clínica, o el uploader de un objeto no validado.
CREATE POLICY adjuntos_clinicos_obj_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'adjuntos-clinicos'
    AND (
      es_profesional_clinico((storage.foldername(name))[1]::uuid)
      OR (
        owner_id = (SELECT auth.uid())::text
        AND public.adjunto_objeto_eliminable(name)
        AND EXISTS (
          SELECT 1 FROM admin_users au
          WHERE au.auth_id = auth.uid() AND au.activo = true
            AND au.id_clinica = (storage.foldername(name))[1]::uuid
        )
      )
    )
  );
