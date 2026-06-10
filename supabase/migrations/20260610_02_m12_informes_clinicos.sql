-- 20260610_02_m12_informes_clinicos.sql
-- M12: Informes Clínicos
-- Migration already applied in production 2026-06-10

CREATE TABLE IF NOT EXISTS fce_informes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica uuid NOT NULL REFERENCES clinicas(id),
  id_paciente uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro uuid REFERENCES fce_encuentros(id),
  id_profesional uuid NOT NULL REFERENCES profesionales(id),
  tipo text NOT NULL CHECK (tipo IN ('isapre', 'colegio', 'laboral', 'judicial', 'otro')),
  destinatario text,
  titulo text NOT NULL,
  contenido text NOT NULL DEFAULT '',
  firmado boolean NOT NULL DEFAULT false,
  firmado_at timestamptz,
  firmado_por uuid REFERENCES profesionales(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fce_informes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_informes" ON fce_informes
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

-- Trigger to block updates on signed informes
CREATE OR REPLACE FUNCTION block_update_signed_informe()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.firmado = true THEN
    RAISE EXCEPTION 'No se puede modificar un informe firmado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_update_signed_informe
  BEFORE UPDATE ON fce_informes
  FOR EACH ROW EXECUTE FUNCTION block_update_signed_informe();
