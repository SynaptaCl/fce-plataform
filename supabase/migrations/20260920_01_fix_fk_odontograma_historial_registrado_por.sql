-- ============================================================================
-- Migration: 20260920_01_fix_fk_odontograma_historial_registrado_por
-- Sprint: fix (Sentry FCE-PLATAFORM-1)
-- Descripción: `fce_odontograma_historial.registrado_por` (uuid NOT NULL) nunca
--   tuvo FK hacia `profesionales`. `getHistorialPieza()` en
--   src/app/actions/dental/odontograma.ts usa el embed PostgREST
--   `profesionales!registrado_por(nombre)`, que requiere la FK para resolver
--   la relación en el schema cache. Sin ella, PostgREST devuelve PGRST200
--   ("Could not find a relationship...") en cada llamada — reportado por
--   Sentry (org synapta-spa, proyecto fce-plataform, issue FCE-PLATAFORM-1,
--   4 ocurrencias desde 2026-09-12) al abrir el historial de una pieza en
--   /dashboard/pacientes/[id]/encuentro/[encuentroId]/dental.
-- Verificado 2026-09-20 vía MCP Supabase: 0 filas con registrado_por
--   huérfano (sin match en profesionales) — constraint aplica sin conflicto.
-- Rollback: ALTER TABLE fce_odontograma_historial
--   DROP CONSTRAINT fce_odontograma_historial_registrado_por_fkey;
-- Aplicada 2026-09-20 con aprobación humana explícita en el chat (CLAUDE.md regla 15).
-- ============================================================================

ALTER TABLE fce_odontograma_historial
  ADD CONSTRAINT fce_odontograma_historial_registrado_por_fkey
  FOREIGN KEY (registrado_por) REFERENCES profesionales(id);
