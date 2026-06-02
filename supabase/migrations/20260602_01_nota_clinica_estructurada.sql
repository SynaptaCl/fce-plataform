-- Migration: 20260602_01_nota_clinica_estructurada
-- Sprint: P2 / Fase 2
-- Descripción: Agrega contenido estructurado jsonb a notas clínicas
-- Impacto: Columna nueva nullable. No afecta notas existentes.
-- Rollback: ALTER TABLE fce_notas_clinicas DROP COLUMN contenido_estructurado;

ALTER TABLE fce_notas_clinicas
  ADD COLUMN IF NOT EXISTS contenido_estructurado jsonb;

COMMENT ON COLUMN fce_notas_clinicas.contenido_estructurado IS
  'Respuestas de las secciones estructuradas según especialidad-config.ts. El campo contenido (text) mantiene el render legible para timeline/PDF.';
