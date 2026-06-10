-- 20260610_01_m11_presupuestos.sql
-- M11: Presupuestos clínicos
-- Migration already applied in production 2026-06-10

CREATE TABLE IF NOT EXISTS fce_presupuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica uuid NOT NULL REFERENCES clinicas(id),
  id_paciente uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro uuid REFERENCES fce_encuentros(id),
  id_profesional uuid NOT NULL REFERENCES profesionales(id),
  titulo text NOT NULL,
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado')),
  notas text,
  firmado boolean NOT NULL DEFAULT false,
  firmado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fce_presupuesto_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_presupuesto uuid NOT NULL REFERENCES fce_presupuestos(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario integer NOT NULL CHECK (precio_unitario >= 0),
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fce_presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fce_presupuesto_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_presupuestos" ON fce_presupuestos
  USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));

CREATE POLICY "tenant_isolation_presupuesto_items" ON fce_presupuesto_items
  USING (id_presupuesto IN (
    SELECT id FROM fce_presupuestos
    WHERE id_clinica = ANY(get_clinica_ids_for_user(auth.uid()))
  ));
