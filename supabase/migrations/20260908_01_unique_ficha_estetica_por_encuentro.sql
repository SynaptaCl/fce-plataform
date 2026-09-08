-- ============================================================================
-- Migration: 20260908_01_unique_ficha_estetica_por_encuentro
-- Sprint: M13 — Módulo Ficha Estética (fix post-revisión final)
-- Descripción: Constraint único en id_encuentro — sin esto, un race de UI
--   (ensureFicha disparado desde múltiples handlers antes de que exista la
--   fila) puede crear filas duplicadas, tras lo cual getFichaEstetica()
--   (.maybeSingle()) falla en cada carga y el workspace queda inutilizable
--   para ese encuentro. Hallazgo de la revisión final de rama (2026-09-08).
-- Impacto: Requiere que no existan duplicados actuales antes de aplicar.
-- Rollback: DROP INDEX IF EXISTS idx_fichas_esteticas_encuentro_unico;
-- Aprobación humana pendiente — NO aplicar sin revisión (CLAUDE.md regla 15).
-- Aplicada 2026-09-08 con aprobación humana explícita en el chat (CLAUDE.md regla 15).
-- ============================================================================

-- Verificación pre-requisito (ejecutar manualmente antes de aplicar si hay dudas):
-- SELECT id_encuentro, count(*) FROM fce_fichas_esteticas GROUP BY id_encuentro HAVING count(*) > 1;

DROP INDEX IF EXISTS idx_fichas_esteticas_encuentro;
CREATE UNIQUE INDEX idx_fichas_esteticas_encuentro_unico ON fce_fichas_esteticas(id_encuentro);
