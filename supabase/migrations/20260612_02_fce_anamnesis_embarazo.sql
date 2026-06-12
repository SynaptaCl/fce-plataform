-- Sprint N2: Campos de embarazo en fce_anamnesis
-- ⚠️ HARD STOP — NO APLICAR sin confirmación explícita + backup previo
-- ⚠️ Tabla compartida por los tres modelos y los dos repos (synapta, fce-plataform)
--    Mayor riesgo que N1. Requiere coordinación con equipo synapta antes de aplicar.
--
-- Diseño: todo nullable / default false — no interfiere con flujo adulto.
-- La UI de embarazo solo aparece cuando el profesional activa embarazo_activo.

ALTER TABLE fce_anamnesis
  ADD COLUMN IF NOT EXISTS embarazo_activo      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fur                   date,
  ADD COLUMN IF NOT EXISTS semana_gestacional_base int,
  ADD COLUMN IF NOT EXISTS fecha_eval_gestacional  date;

COMMENT ON COLUMN fce_anamnesis.embarazo_activo       IS 'true si la paciente está embarazada al momento de la consulta';
COMMENT ON COLUMN fce_anamnesis.fur                    IS 'Fecha última regla (base para cálculo de semana gestacional)';
COMMENT ON COLUMN fce_anamnesis.semana_gestacional_base IS 'Semana gestacional por ecografía si se conoce (alternativa a FUR)';
COMMENT ON COLUMN fce_anamnesis.fecha_eval_gestacional  IS 'Fecha en que se estableció la semana gestacional base';
