-- Migration: 20260922_01_search_path_trigger_consentimientos
-- Sprint: Fase 0 hotfix consentimientos (follow-up T1)
-- Descripción: fija el search_path de la función de inmutabilidad de
--   consentimientos. Las funciones de trigger sin search_path fijo son
--   señaladas por el linter de Supabase (function_search_path_mutable): un
--   atacante con capacidad de crear objetos podría secuestrar la resolución
--   de nombres dentro de la función. Fijarlo a `public` elimina la ambigüedad.
--
-- Impacto: solo metadatos de la función (ALTER FUNCTION ... SET). No toca
--   datos ni comportamiento del trigger.
-- Rollback: ALTER FUNCTION public.block_update_signed_consentimiento() RESET search_path;
--
-- ⚠️ PENDIENTE DE APLICACIÓN — regla 15 CLAUDE.md: requiere aprobación humana
--   explícita en el chat antes de aplicar contra el proyecto vigyhfpwyxihrjiygfsa.

ALTER FUNCTION public.block_update_signed_consentimiento() SET search_path = public;
