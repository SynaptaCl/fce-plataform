-- ============================================================================
-- Onboarding: cenupsi
-- Template:   Multidisciplinaria Rehab + Psicología
-- Generado:   2026-06-04T03:16:55.513Z
-- ============================================================================
-- Centro con rehabilitación, psicología y nutrición. Sin habilitación médica para prescribir fármacos ni indicar exámenes.
--
-- ⚠️  IMPORTANTE: Revisar antes de ejecutar.
--     Claude Code NO aplica DDL. Aplique con coordinación del equipo Synapta.
--
-- Notas del template:
-- M7 y M8 NO están activos — sin habilitación para prescripción ni indicación de exámenes.
-- M10 activo: Plan de Intervención con GAS para seguimiento longitudinal (neurodesarrollo).
-- Terapia Ocupacional en estado 'beta' — funcional, requiere revisión clínica formal.
-- Para activar prescripción individual: UPDATE profesionales SET puede_prescribir = true WHERE id = '<id>';
--
-- Permisos por especialidad (aplican a tabla profesionales, NO a clinicas_fce_config):
--   Kinesiología: puede_prescribir=NO, puede_indicar_examenes=NO
--   Fonoaudiología: puede_prescribir=NO, puede_indicar_examenes=NO
--   Psicología: puede_prescribir=NO, puede_indicar_examenes=NO
--   Nutrición: puede_prescribir=NO, puede_indicar_examenes=NO
--   Terapia Ocupacional: puede_prescribir=NO, puede_indicar_examenes=NO
-- ============================================================================

BEGIN;

-- 1. Verificar que la clínica existe antes de modificar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clinicas WHERE slug = 'cenupsi') THEN
    RAISE EXCEPTION 'Clínica con slug "%" no encontrada en tabla clinicas. Verificar slug.', 'cenupsi';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clinicas_fce_config WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'cenupsi')) THEN
    RAISE EXCEPTION 'Clínica "%" no tiene fila en clinicas_fce_config. Crear registro base primero.', 'cenupsi';
  END IF;
END $$;

-- 2. Activar módulos y especialidades
UPDATE clinicas_fce_config
SET
  modulos_activos     = ARRAY[
    'M1_identificacion',
    'M2_anamnesis',
    'M3_evaluacion',
    'M3b_instrumentos',
    'M4_soap',
    'M4b_nota_clinica',
    'M5_consentimiento',
    'M6_auditoria',
    'M9_egresos',
    'M10_plan_intervencion'
  ],
  especialidades_activas = ARRAY[
    'Kinesiología',
    'Fonoaudiología',
    'Psicología',
    'Nutrición',
    'Terapia Ocupacional'
  ]
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'cenupsi');

-- 3. Verificar resultado post-update
SELECT
  c.slug,
  cf.modulos_activos,
  cf.especialidades_activas,
  cf.updated_at
FROM clinicas c
JOIN clinicas_fce_config cf ON cf.id_clinica = c.id
WHERE c.slug = 'cenupsi';

COMMIT;

-- ============================================================================
-- Próximos pasos post-aplicación:
-- 1. Confirmar resultado del SELECT de verificación (paso 3).
-- 2. Activar permisos individuales en profesionales según tabla de arriba.
-- 3. Verificar que el Sidebar muestre los módulos correctos al iniciar sesión.
-- ============================================================================
