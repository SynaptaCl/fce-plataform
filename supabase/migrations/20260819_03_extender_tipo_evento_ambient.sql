-- AMB-1 — agrega los tipo_evento nuevos al CHECK de logs_auditoria
-- APLICADA 2026-08-19 (verificada vía MCP Supabase — versión real
-- 20260819233819_amb1_03_extender_tipo_evento_ambient). Aprobación explícita
-- del usuario en el chat ("procede con todas las migraciones necesarias") tras
-- revisar el SQL dos veces. No re-ejecutar.
--
-- Verificado vía MCP Supabase 2026-08-19: logs_auditoria.tipo_evento es un CHECK
-- constraint (no enum nativo), sin 'ia_ambient' / 'consent_grabacion_otorgado' /
-- 'consent_grabacion_revocado':
--
--   logs_auditoria_tipo_evento_check
--   CHECK (tipo_evento = ANY (ARRAY['create','update','delete','sign','read_ficha',
--     'export_pdf','export_epicrisis','create_adenda','create_errata',
--     'create_anulacion','errata_post_ventana','login','ia_copiloto','ia_resumen',
--     'ia_informe','config_update']))
--
-- src/lib/audit.ts (fce-plataform) ya declara estos 3 valores en el tipo TS
-- TipoEvento — logAudit() es fire-and-forget (regla del propio helper), así que
-- sin esta migration esas llamadas fallan en el INSERT y se loguean a
-- console.error sin romper el flujo clínico, pero AMB-1 pierde su rastro de
-- auditoría real hasta que se aplique. synapta ya trabajó el mismo problema
-- usando 'create' como valor más cercano existente (lib/consent/grabacion.ts).

alter table public.logs_auditoria
  drop constraint if exists logs_auditoria_tipo_evento_check;

alter table public.logs_auditoria
  add constraint logs_auditoria_tipo_evento_check
  check (tipo_evento = ANY (ARRAY[
    'create'::text, 'update'::text, 'delete'::text, 'sign'::text,
    'read_ficha'::text, 'export_pdf'::text, 'export_epicrisis'::text,
    'create_adenda'::text, 'create_errata'::text, 'create_anulacion'::text,
    'errata_post_ventana'::text, 'login'::text,
    'ia_copiloto'::text, 'ia_resumen'::text, 'ia_informe'::text,
    'config_update'::text,
    'ia_ambient'::text, 'consent_grabacion_otorgado'::text, 'consent_grabacion_revocado'::text
  ]));
