-- Migration: 20260614_02_refactor_logs_auditoria
-- Sprint: A0
-- Descripción: Extiende logs_auditoria con tipo_evento y session_id.
--   No rompe inserción existente (campos nullable o con default).
-- Impacto: ALTER TABLE, CREATE INDEX.
-- Rollback:
--   ALTER TABLE logs_auditoria DROP COLUMN IF EXISTS tipo_evento, DROP COLUMN IF EXISTS session_id;
--   DROP INDEX IF EXISTS idx_audit_actor_fecha;
--   DROP INDEX IF EXISTS idx_audit_tipo_evento;

-- tipo_evento: semántica de la acción en FCE (separado de canal_contacto que es de citas)
ALTER TABLE logs_auditoria
  ADD COLUMN IF NOT EXISTS tipo_evento text
    CHECK (tipo_evento IN (
      'create', 'update', 'delete', 'sign',
      'read_ficha', 'export_pdf', 'export_epicrisis',
      'create_adenda', 'create_errata', 'create_anulacion',
      'errata_post_ventana', 'login',
      'ia_copiloto', 'ia_resumen', 'ia_informe',
      'config_update'
    ));

-- session_id para correlacionar acciones de una misma visita
ALTER TABLE logs_auditoria
  ADD COLUMN IF NOT EXISTS session_id text;

-- Índices para queries de auditoría
CREATE INDEX IF NOT EXISTS idx_audit_actor_fecha
  ON logs_auditoria(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_tipo_evento
  ON logs_auditoria(tipo_evento, created_at DESC)
  WHERE tipo_evento IS NOT NULL;

COMMENT ON COLUMN logs_auditoria.tipo_evento IS
  'Tipo semántico del evento en FCE. Separado de canal (canal_contacto) que aplica a citas/leads.';
COMMENT ON COLUMN logs_auditoria.session_id IS
  'ID de sesión para correlacionar acciones de una misma visita del usuario.';
