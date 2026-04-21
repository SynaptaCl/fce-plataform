-- ============================================================================
-- Migration: 20260421_04_add_enfermeria_catalogo
-- Sprint: R2
-- Descripción: Agrega Enfermería al catálogo de especialidades
-- Impacto: INSERT en especialidades_catalogo. Sin este registro el trigger de
--          fce_encuentros/fce_evaluaciones rechaza especialidad='Enfermería'.
-- Rollback: DELETE FROM especialidades_catalogo WHERE codigo = 'Enfermería';
-- ============================================================================

INSERT INTO especialidades_catalogo (codigo, label, activa, orden)
VALUES ('Enfermería', 'Enfermería', true, 11)
ON CONFLICT (codigo) DO UPDATE SET activa = true, label = EXCLUDED.label;
