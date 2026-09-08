-- ============================================================================
-- Migration: 20260907_04_fce_adendas_tipo_ficha_estetica
-- Sprint: M13 — Módulo Ficha Estética
-- Descripción: Extiende fce_adendas_tipo_documento_check para aceptar
--   'ficha_estetica' — la ficha estética pasa a ser documento corregible
--   por el mecanismo de adendas existente (mismo patrón que
--   20260828_01_m11_tarificacion_presupuestos.sql agregó 'presupuesto').
-- Impacto: Solo cambia el CHECK constraint, no toca filas existentes.
-- Rollback: revertir a la lista de valores previa (sin 'ficha_estetica').
-- Aplicada 2026-09-07 con aprobación humana explícita en el chat (CLAUDE.md regla 15).
-- ============================================================================

ALTER TABLE fce_adendas DROP CONSTRAINT fce_adendas_tipo_documento_check;
ALTER TABLE fce_adendas ADD CONSTRAINT fce_adendas_tipo_documento_check
  CHECK (tipo_documento IN (
    'soap', 'nota_clinica', 'periograma', 'egreso',
    'prescripcion', 'orden_examen', 'consentimiento', 'presupuesto',
    'ficha_estetica'
  ));
