-- Migration: 20260614_03_create_fce_adendas
-- Sprint: A0
-- Descripción: Tabla de adendas/erratas/anulaciones para documentos firmados.
--   Polimórfica: cubre SOAP, nota_clinica, periograma, egreso, prescripción,
--   orden_examen, consentimiento.
-- Impacto: Tabla nueva, sin afectar existentes.
-- Rollback: DROP TABLE IF EXISTS fce_adendas CASCADE;

CREATE TABLE fce_adendas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid REFERENCES fce_encuentros(id),

  -- Referencia polimórfica al documento original
  tipo_documento  text NOT NULL
    CHECK (tipo_documento IN (
      'soap', 'nota_clinica', 'periograma',
      'egreso', 'prescripcion', 'orden_examen', 'consentimiento'
    )),
  id_documento    uuid NOT NULL,

  -- Tipo de adenda
  tipo_adenda     text NOT NULL
    CHECK (tipo_adenda IN ('adenda', 'errata', 'anulacion')),

  -- Contenido
  motivo          text NOT NULL,
  contenido       text NOT NULL,

  -- Control de ventana temporal (solo para errata)
  -- Si errata se crea >72h después del firmado_at del documento original,
  -- requiere override de director
  override_director   boolean NOT NULL DEFAULT false,
  override_motivo     text,
  override_por        uuid,  -- admin_users.id del director que autorizó

  -- Firma de la adenda (inmutable post-firma, mismo patrón)
  firmado         boolean NOT NULL DEFAULT false,
  firmado_at      timestamptz,
  firmado_por     uuid,

  -- Autoría
  created_by      uuid NOT NULL,  -- profesionales.id
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_adendas_documento ON fce_adendas(tipo_documento, id_documento);
CREATE INDEX idx_adendas_paciente ON fce_adendas(id_paciente, created_at DESC);
CREATE INDEX idx_adendas_clinica ON fce_adendas(id_clinica);

-- RLS
ALTER TABLE fce_adendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select" ON fce_adendas
  FOR SELECT TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY "tenant_isolation_insert" ON fce_adendas
  FOR INSERT TO authenticated
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

CREATE POLICY "tenant_isolation_update" ON fce_adendas
  FOR UPDATE TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));

-- Trigger inmutabilidad post-firma (mismo patrón que las demás)
CREATE OR REPLACE FUNCTION block_update_signed_adenda()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.contenido IS DISTINCT FROM OLD.contenido OR
    NEW.motivo IS DISTINCT FROM OLD.motivo OR
    NEW.tipo_adenda IS DISTINCT FROM OLD.tipo_adenda
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una adenda firmada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_update_signed_adenda
  BEFORE UPDATE ON fce_adendas
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_adenda();

COMMENT ON TABLE fce_adendas IS
  'Adendas, erratas y anulaciones de documentos clínicos firmados.
   Polimórfica: tipo_documento + id_documento referencian al documento original.
   Errata post-72h requiere override de director (override_director=true, override_motivo NOT NULL).
   La adenda misma es firmable e inmutable post-firma.';
