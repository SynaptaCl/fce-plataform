-- ============================================================================
-- Migration: 20260907_02_puede_estetica_profesionales
-- Sprint: M13 — Módulo Ficha Estética
-- Descripción: Flag de permiso individual puede_estetica en profesionales,
--   mismo patrón que puede_prescribir/puede_indicar_examenes. Activado
--   manualmente por clínica — false por defecto.
-- Impacto: ALTER TABLE aditivo, no rompe filas existentes (default false).
-- Rollback: ALTER TABLE profesionales DROP COLUMN puede_estetica;
-- Aprobación humana pendiente — NO aplicar sin revisión (CLAUDE.md regla 15).
-- ============================================================================

ALTER TABLE profesionales
  ADD COLUMN puede_estetica boolean NOT NULL DEFAULT false;
