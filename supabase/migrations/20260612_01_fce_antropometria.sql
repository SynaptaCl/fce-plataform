-- Sprint N1: Tabla de antropometría nutricional
-- ⚠️ HARD STOP — aplicar SOLO con confirmación explícita + backup previo
--
-- Patrón RLS: get_clinica_ids_for_user() (vigente desde 20260606_02)

CREATE TABLE fce_antropometria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid REFERENCES fce_encuentros(id),

  -- básico (siempre)
  peso_kg         numeric NOT NULL CHECK (peso_kg > 0 AND peso_kg < 400),
  talla_cm        numeric NOT NULL CHECK (talla_cm > 0 AND talla_cm < 260),
  imc             numeric,
  clasificacion   text,
  modo            text NOT NULL DEFAULT 'adulto' CHECK (modo IN ('adulto','pediatrico','gestacional')),

  -- circunferencias (opcional)
  circ_cintura_cm numeric CHECK (circ_cintura_cm IS NULL OR circ_cintura_cm > 0),
  circ_cadera_cm  numeric CHECK (circ_cadera_cm IS NULL OR circ_cadera_cm > 0),
  riesgo_cintura  text,

  -- composición corporal (solo modo adulto)
  pliegues        jsonb,           -- { biceps, triceps, subescapular, suprailiaco, pecho, abdomen, muslo, axilar_medio } mm
  formula_grasa   text,            -- snapshot de la ecuación usada
  perc_grasa      numeric,
  masa_magra_kg   numeric,

  -- pediátrico (N2)
  zscore_imc      numeric,
  zscore_peso     numeric,
  zscore_talla    numeric,
  percentil_imc   numeric,

  -- gestacional (N2)
  semana_gestacional     int,
  imc_pregestacional     numeric,
  rango_ganancia_min     numeric,
  rango_ganancia_max     numeric,

  observaciones   text,
  registrado_por  uuid NOT NULL,   -- profesionales.id
  registrado_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_antrop_paciente  ON fce_antropometria(id_paciente, registrado_at DESC);
CREATE INDEX idx_antrop_clinica   ON fce_antropometria(id_clinica);
CREATE INDEX idx_antrop_encuentro ON fce_antropometria(id_encuentro);

ALTER TABLE fce_antropometria ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_antropometria_all ON fce_antropometria
  FOR ALL TO authenticated
  USING  (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())))
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));
