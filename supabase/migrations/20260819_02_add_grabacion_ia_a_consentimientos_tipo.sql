-- AMB-1 — agrega 'grabacion_ia' al CHECK de fce_consentimientos.tipo
-- APLICADA 2026-08-19 (verificada vía MCP Supabase — versión real
-- 20260819233812_amb1_02_add_grabacion_ia_a_consentimientos_tipo). Aprobación
-- explícita del usuario en el chat ("procede con todas las migraciones
-- necesarias") tras revisar el SQL dos veces. No re-ejecutar.
--
-- HALLAZGO CRÍTICO (verificado vía MCP Supabase 2026-08-19): fce_consentimientos
-- SÍ tiene CHECK constraint en `tipo` — la documentación de AMB-1 (comentarios en
-- lib/ambient/consentimiento.ts, CLAUDE.md de synapta, y el prompt entregado a la
-- sesión de synapta) asumía "tipo, texto libre, sin CHECK constraint". Eso era
-- incorrecto. Constraint real:
--
--   fce_consentimientos_tipo_check
--   CHECK (tipo = ANY (ARRAY['general','menores','teleconsulta','uso_ia']))
--
-- 'grabacion_ia' NO está en la lista. Sin esta migration, TODO INSERT de
-- consentimiento de grabación falla en ambos repos (fce-plataform:
-- crearConsentimientoGrabacionPresencial/revocarConsentimientoGrabacion;
-- synapta: writeConsentimientoGrabacion) — código escrito y verificado por build
-- en ambos lados, pero nunca ejercido contra el schema real hasta esta auditoría.
--
-- Nota: existe 'uso_ia' (migration 20260525103216_add_uso_ia_to_consentimientos_tipo,
-- 2026-05-25) sin ninguna referencia en código de ningún repo — no se reutiliza acá
-- porque cambiar el significado de un valor ya presente en el catálogo de tipos es
-- una decisión de producto, no una corrección técnica. Se agrega 'grabacion_ia'
-- como valor nuevo y separado.

alter table public.fce_consentimientos
  drop constraint if exists fce_consentimientos_tipo_check;

alter table public.fce_consentimientos
  add constraint fce_consentimientos_tipo_check
  check (tipo = ANY (ARRAY['general'::text, 'menores'::text, 'teleconsulta'::text, 'uso_ia'::text, 'grabacion_ia'::text]));
