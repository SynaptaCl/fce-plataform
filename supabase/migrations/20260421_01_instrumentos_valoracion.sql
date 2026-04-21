-- ============================================================================
-- Migration: 20260421_01_instrumentos_valoracion
-- Sprint: R2
-- Descripción: Crea catálogo universal de instrumentos de valoración clínica
-- Impacto: Tabla nueva, sin afectar tablas existentes
-- Rollback: DROP TABLE IF EXISTS instrumentos_valoracion CASCADE;
-- ============================================================================

CREATE TABLE instrumentos_valoracion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text UNIQUE NOT NULL,
  nombre        text NOT NULL,
  descripcion   text,
  version       text NOT NULL DEFAULT '1.0',

  especialidades text[] NOT NULL,

  tipo_renderer text NOT NULL
    CHECK (tipo_renderer IN ('escala_simple', 'componente_custom')),

  schema_items  jsonb,
  componente_id text,
  interpretacion jsonb,

  activo        boolean NOT NULL DEFAULT true,
  orden         int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instrumentos_valoracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_authenticated"
  ON instrumentos_valoracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_superadmin"
  ON instrumentos_valoracion FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_id = auth.uid() AND rol = 'superadmin' AND activo = true
  ));

COMMENT ON TABLE instrumentos_valoracion IS
  'Catálogo universal de escalas e instrumentos de valoración clínica. Compartido entre clínicas, administrado por Synapta.';
