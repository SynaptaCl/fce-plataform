-- ============================================================================
-- Migration: 20260421_03_fce_notas_clinicas
-- Sprint: R2
-- Descripción: Notas clínicas libres para modelo clinico_general (equivalente a fce_notas_soap para rehab)
-- Impacto: Tabla nueva + trigger de inmutabilidad post-firma
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_block_update_signed_nota ON fce_notas_clinicas;
--   DROP FUNCTION IF EXISTS block_update_signed_nota_clinica();
--   DROP TABLE IF EXISTS fce_notas_clinicas CASCADE;
-- ============================================================================

CREATE TABLE fce_notas_clinicas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid NOT NULL REFERENCES fce_encuentros(id),

  motivo_consulta text,
  contenido       text NOT NULL,

  diagnostico     text,
  cie10_codigos   text[],

  plan            text,
  proxima_sesion  text,

  firmado         boolean NOT NULL DEFAULT false,
  firmado_at      timestamptz,
  firmado_por     uuid,

  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_clin_paciente  ON fce_notas_clinicas(id_paciente, created_at DESC);
CREATE INDEX idx_notas_clin_clinica   ON fce_notas_clinicas(id_clinica);
CREATE INDEX idx_notas_clin_encuentro ON fce_notas_clinicas(id_encuentro);

CREATE OR REPLACE FUNCTION block_update_signed_nota_clinica()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.contenido <> OLD.contenido OR
    NEW.motivo_consulta IS DISTINCT FROM OLD.motivo_consulta OR
    NEW.diagnostico IS DISTINCT FROM OLD.diagnostico OR
    NEW.plan IS DISTINCT FROM OLD.plan
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una nota clínica firmada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_update_signed_nota
  BEFORE UPDATE ON fce_notas_clinicas
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_nota_clinica();

ALTER TABLE fce_notas_clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation"
  ON fce_notas_clinicas FOR ALL
  TO authenticated
  USING (id_clinica IN (
    SELECT id_clinica FROM admin_users
    WHERE auth_id = auth.uid() AND activo = true
  ));

COMMENT ON TABLE fce_notas_clinicas IS
  'Notas clínicas libres del modelo clinico_general. Inmutables post-firma (trigger). Equivalente a fce_notas_soap para el modelo rehabilitacion.';
