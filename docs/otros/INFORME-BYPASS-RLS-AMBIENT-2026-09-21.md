# Informe — Auditoría RLS del flujo de consentimiento Ambient (AMB-1 F1)

> Fecha: 2026-09-22 · Auditor: Claude Code · Repo: `fce-plataform` (commit `9fcdaab`)
> Contexto: Fase 0 hotfix M5, tarea T4. Proyecto DB: `vigyhfpwyxihrjiygfsa`.

## 1. Pregunta que originó la auditoría

> "Verifica si `crearConsentimientoGrabacionPresencial` usa service role o cliente admin para saltarse RLS. `tiene_acceso_clinico` bloquea a la recepcionista, así que si hoy funciona es por bypass."

## 2. Metodología

1. Inspección de `src/app/actions/ambient/consentimiento.ts` (cliente DB usado y su cadena de autenticación).
2. Grep repo-wide de `createServiceClient` (src, ts/tsx) para mapear todos los usos de service role.
3. Verificación del schema real vía MCP Supabase: policies RLS de `fce_consentimientos` en producción (`pg_policies`).
4. Contraste contra el criterio de aceptación F1 de `docs/AMB-1-ambient-scribe.md` ("La recepcionista puede escribir consentimiento **sin** obtener acceso a FCE").

## 3. Hallazgo principal: NO existe bypass — el flujo de recepcionista nunca funcionó

**`crearConsentimientoGrabacionPresencial` NO usa service role.** Usa `requireContext()` de `src/lib/auth.ts`, que retorna el cliente SSR con el **JWT del usuario logueado** — sujeto por completo a RLS.

Verificación de las policies reales en prod (2026-09-22, `pg_policies`):

| Policy | Comando | Expresión |
|---|---|---|
| `fce_consentimientos_select` | SELECT | `tiene_acceso_clinico(id_clinica)` |
| `fce_consentimientos_insert` | INSERT | `WITH CHECK tiene_acceso_clinico(id_clinica)` |
| `fce_consentimientos_update` | UPDATE | `USING/WITH CHECK tiene_acceso_clinico(id_clinica)` |

`tiene_acceso_clinico()` retorna `false` para recepcionista (solo director/admin/superadmin o admin_user vinculado a profesional). Por lo tanto:

> **Todo INSERT de consentimiento hecho por una recepcionista falla en RLS con un error genérico de DB (`dbError` → "Ocurrió un error al procesar la solicitud").**

El criterio F1 de AMB-1 ("la recepcionista puede escribir consentimiento") **nunca estuvo funcional en este repo**. No es un bypass encubierto: es una funcionalidad anunciada en la documentación del sprint que RLS impide silenciosamente.

## 4. Por qué no se detectó antes

- Los tests de AMB-1 (`scripts/test-sprint-amb1.ts`) son de **funciones puras sin DB** — validan `esConsentimientoGrabacionVigente` y gating por especialidad, nunca el INSERT con JWT de recepcionista.
- El header de la action decía "requireContext() solo exige admin_users activo" — cierto para la autenticación, pero omitía que la **RLS de la tabla** rechaza el INSERT después. El comentario documentaba la intención del diseño, no el comportamiento real.
- `npm run build` no ejercita la DB (mismo patrón del hallazgo 0.1 de AMB-1: el CHECK de `tipo` también pasó builds y fallaba solo en runtime).

## 5. Usos reales de service role (mapa completo, sin bypass en consentimientos)

| Archivo | Uso | Riesgo |
|---|---|---|
| `src/app/actions/ambient/generar-nota.ts:164` | generación nota IA (F3) | revisado — no toca consentimientos en escritura |
| `src/app/actions/resumen-ia.ts:85` | caché Resumen IA | idem |
| `src/app/actions/copiloto-nota.ts:114` | copiloto escritura | idem |
| `src/app/actions/informes-ia.ts:148` | copiloto informes | idem |

`consimiento_tokens` (AMB-1, 0 filas) tiene RLS sin policies = solo service role por diseño — correcto para canje server-side de la página pública futura.

## 6. Corrección aplicada (Fase 0, commit `9fcdaab`)

1. **Gate explícito**: `assertPuedeFirmar(rol as Rol)` en `crearConsentimientoGrabacionPresencial` — solo rol `profesional` puede crear una fila con `firmado=true`. El rechazo ahora es inmediato y con mensaje accionable ("Solo un profesional puede registrar... La recepcionista solo podrá enviar la solicitud al paciente (CI-1)"), no un error genérico post-RLS.
2. Null-check de `profesionalId` (antes insertaba `created_by: null` silenciosamente).
3. Validación de firma compartida (`validarFirmaDataUrl`).
4. Header de la action reescrito documentando el hallazgo + `TODO(CI-1)`.
5. Criterio F1 corregido: **"la recepcionista puede enviar la solicitud (link/QR), nunca firmar"** — pendiente reflejarlo en `docs/AMB-1-ambient-scribe.md` (agendado en CI-1 §10).

## 7. Implicancia para CI-1

La decisión de que el consentimiento firmado nunca se origine en sesión del staff ya estaba alineada con la RLS real — el sistema de permisos siempre lo impidió para recepcionistas; faltaba impedirlo también para director/admin (hecho en Fase 0 con el gate) y reemplazar el flujo por el canal del paciente (CI-1).

## 8. Clasificación

- **Severidad original estimada (pre-auditoría)**: crítica (posible bypass).
- **Severidad real**: media — sin exposición de datos ni escritura no autorizada (RLS contiene todo); el riesgo era de **documentación que promete una funcionalidad inexistente** y de experiencia degradada (error genérico a recepcionistas).
- **Estado**: cerrado en Fase 0 + CI-1 para el flujo definitivo.
