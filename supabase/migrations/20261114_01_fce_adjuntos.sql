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
-- ⚠ PENDIENTE DE APROBACIÓN HUMANA (CLAUDE.md regla 15). Claude genera, NO aplica.
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
-- La parte delicada: recepcionista escribe sin acceso clínico. SELECT le
-- permite ver SOLO sus propios pendientes (minimización PHI); INSERT exige
-- miembro activo de la clínica con rol autorizado; UPDATE/DELETE quedan en
-- tenancy clínico — el gate fino de rol (solo profesional valida/anula;
-- hard delete solo pendientes) vive en los server actions.

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
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_id = auth.uid()
        AND au.activo = true
        AND au.id_clinica = id_clinica
        AND au.rol IN ('profesional','recepcionista','director')
    )
  );

CREATE POLICY adjuntos_update ON fce_adjuntos
  FOR UPDATE TO authenticated
  USING (tiene_acceso_clinico(id_clinica))
  WITH CHECK (tiene_acceso_clinico(id_clinica));

CREATE POLICY adjuntos_delete ON fce_adjuntos
  FOR DELETE TO authenticated
  USING (
    tiene_acceso_clinico(id_clinica)
    OR (created_by = auth.uid() AND estado_validacion = 'pendiente')
  );

-- ── Bucket privado con límites (defense in depth — mismo patrón que
--    documentos-firma): Storage rechaza tamaño/MIME antes de que la action
--    valide magic bytes. Path: {id_clinica}/{id_paciente}/{uuid}.{ext} ──────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('adjuntos-clinicos', 'adjuntos-clinicos', false, 15728640,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Lectura/descarga y borrado de objetos: acceso clínico por primer segmento
-- del path (id_clinica), mismo criterio que fichas_esteticas_*. La
-- recepcionista NO pasa este gate (deliberado: ve metadatos de sus
-- pendientes, no los archivos, hasta que un profesional valida).

CREATE POLICY adjuntos_clinicos_obj_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'adjuntos-clinicos'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
  );

-- Gate real de la subida directa del cliente (plan D3): tenant + rol.

CREATE POLICY adjuntos_clinicos_obj_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'adjuntos-clinicos'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_id = auth.uid()
        AND au.activo = true
        AND au.id_clinica = (storage.foldername(name))[1]::uuid
        AND au.rol IN ('profesional','recepcionista','director')
    )
  );

CREATE POLICY adjuntos_clinicos_obj_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'adjuntos-clinicos'
    AND tiene_acceso_clinico((storage.foldername(name))[1]::uuid)
  );
