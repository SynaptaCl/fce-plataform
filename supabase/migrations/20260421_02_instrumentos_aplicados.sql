-- ============================================================================
-- Migration: 20260421_02_instrumentos_aplicados
-- Sprint: R2
-- Descripción: Resultados de instrumentos aplicados a pacientes en encuentros
-- Impacto: Tabla nueva, depende de instrumentos_valoracion (M1)
-- Rollback: DROP TABLE IF EXISTS instrumentos_aplicados CASCADE;
-- ============================================================================

CREATE TABLE instrumentos_aplicados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid REFERENCES fce_encuentros(id),
  id_instrumento  uuid NOT NULL REFERENCES instrumentos_valoracion(id),

  respuestas      jsonb NOT NULL,
  puntaje_total   numeric,
  interpretacion  text,

  notas           text,

  aplicado_por    uuid NOT NULL,
  aplicado_at     timestamptz NOT NULL DEFAULT now(),

  mostrar_en_timeline boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instr_apl_paciente  ON instrumentos_aplicados(id_paciente, aplicado_at DESC);
CREATE INDEX idx_instr_apl_clinica   ON instrumentos_aplicados(id_clinica);
CREATE INDEX idx_instr_apl_encuentro ON instrumentos_aplicados(id_encuentro);

ALTER TABLE instrumentos_aplicados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation"
  ON instrumentos_aplicados FOR ALL
  TO authenticated
  USING (id_clinica IN (
    SELECT id_clinica FROM admin_users
    WHERE auth_id = auth.uid() AND activo = true
  ));

COMMENT ON TABLE instrumentos_aplicados IS
  'Resultados de instrumentos de valoración aplicados a pacientes. Puntaje calculado server-side, interpretación snapshoteada al momento de guardar.';
