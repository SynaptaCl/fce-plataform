-- Migration: 20260601_02_onboarding_cenupsi_fce_config
-- Sprint: P1 / Fase 5
-- Descripción: Activa módulos y especialidades reales de cenupsi
-- Impacto: UPDATE de 1 fila en clinicas_fce_config
-- Rollback: UPDATE volviendo a [M1_identificacion, M6_auditoria] y []

UPDATE clinicas_fce_config
SET
  modulos_activos = ARRAY[
    'M1_identificacion', 'M2_anamnesis', 'M3_evaluacion', 'M3b_instrumentos',
    'M4_soap', 'M4b_nota_clinica', 'M5_consentimiento', 'M6_auditoria',
    'M9_egresos', 'M10_plan_intervencion'
  ],
  especialidades_activas = ARRAY[
    'Kinesiología', 'Nutrición', 'Psicología', 'Terapia Ocupacional'
  ]
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'cenupsi');
