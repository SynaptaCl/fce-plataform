-- Fix: agrega 'procedimiento_estetico' al CHECK de fce_consentimientos.tipo.
--
-- BUG (reportado 2026-09-21): al intentar crear un "Consentimiento para
-- Procedimiento Estético" desde M5, el INSERT falla con:
--   new row for relation "fce_consentimientos" violates check constraint
--   "fce_consentimientos_tipo_check"
--
-- CAUSA: el módulo M13 Estética (migrations 20260907_01..05) integró el tipo
-- 'procedimiento_estetico' en la app (types/consent.ts, consentSchema en
-- lib/validations.ts, CONSENT_TEMPLATES en ConsentManager.tsx, filtro en
-- EsteticaWorkspace.tsx) pero NUNCA actualizó el CHECK constraint de la BD.
--
-- Constraint real verificado vía MCP Supabase antes de esta migration:
--   CHECK (tipo = ANY (ARRAY['general','menores','teleconsulta','uso_ia','grabacion_ia']))
--
-- Corrección no destructiva: solo amplía el catálogo de valores permitidos.

alter table public.fce_consentimientos
  drop constraint if exists fce_consentimientos_tipo_check;

alter table public.fce_consentimientos
  add constraint fce_consentimientos_tipo_check
  check (tipo = ANY (ARRAY['general'::text, 'menores'::text, 'teleconsulta'::text, 'uso_ia'::text, 'grabacion_ia'::text, 'procedimiento_estetico'::text]));
