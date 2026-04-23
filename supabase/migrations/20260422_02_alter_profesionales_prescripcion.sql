-- Migration: 20260422_02_alter_profesionales_prescripcion
-- Sprint: R9
-- Descripción: Agrega campos para habilitar prescripción farmacológica por profesional
-- Impacto: Modifica tabla profesionales — no destructivo (campos nuevos nullable o default false)
-- Rollback:
--   ALTER TABLE profesionales DROP COLUMN IF EXISTS numero_registro;
--   ALTER TABLE profesionales DROP COLUMN IF EXISTS puede_prescribir;
--   ALTER TABLE profesionales DROP COLUMN IF EXISTS tipo_registro;

ALTER TABLE profesionales
  ADD COLUMN IF NOT EXISTS numero_registro  text,         -- Número de registro profesional (SIS para médicos, Colegio para otros)
  ADD COLUMN IF NOT EXISTS tipo_registro    text,         -- 'SIS' | 'Colegio Odontológico' | 'Colegio Químico Farmacéutico' | etc.
  ADD COLUMN IF NOT EXISTS puede_prescribir boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profesionales.numero_registro IS
  'Número oficial de registro del profesional. Para médicos: SIS. Para odontólogos: Colegio. Otros: variable según ley chilena.';

COMMENT ON COLUMN profesionales.puede_prescribir IS
  'Habilita explícitamente al profesional para emitir prescripciones. Default false por seguridad — debe activarse manualmente.';
