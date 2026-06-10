# Informe de Seguridad HTTP — fce-plataform — 2026-06-10

> Auditoría read-only sobre branch `audit/http-security-fce`. Sin fixes aplicados.
> Alcance: source maps / código cliente, seguridad HTTP, rate limiting.

## 1. RESUMEN EJECUTIVO

1. **Source maps:** configuración correcta — `productionBrowserSourceMaps` no está habilitado (default `false`) y Sentry borra los sourcemaps tras subirlos (`next.config.ts:27`). Build de verificación: ver §2.1.
2. **Credenciales en cliente:** sin hallazgos — ningún secreto hardcodeado, ningún `process.env` no-público referenciado desde código cliente. `.gitignore` cubre `.env*` y el historial git está limpio.
3. **Headers de seguridad: 0 de 7 configurados en código.** No existe `headers()` en `next.config.ts`, ni headers en `src/proxy.ts`, ni `vercel.json`. Solo HSTS llega implícito por la plataforma Vercel.
4. **CORS:** sin configuración explícita (default same-origin). Sin wildcard. Correcto.
5. **Rate limiting: inexistente en todo el repo.** 35 Server Actions sin throttle; 3 llaman a la API de Anthropic.
6. **Riesgo financiero IA:** las acciones con Sonnet 4.6 (`informes-ia.ts`, `copiloto-nota.ts`) no tienen caché ni límite de frecuencia: ~US$0,02–0,035/llamada → **~US$20–35/minuto (~US$1.200–2.100/hora) a 1.000 req/min** por un solo usuario autenticado en loop.
7. **Hallazgo adicional ALTO:** las Server Actions de búsqueda ICD-11/CIF (`diagnostico.ts`, `cif.ts`) **no verifican autenticación** — proxy abierto hacia la API de la OMS con las credenciales `ICD_API_CLIENT_*` de la plataforma.

## 2. SOURCE MAPS Y CÓDIGO CLIENTE

### 2.1 Configuración de source maps

| Hallazgo | Severidad | Evidencia | Estado |
|---|---|---|---|
| `productionBrowserSourceMaps` no declarado → default `false` (no se sirven `.map` del cliente) | OK (informativo) | `next.config.ts:4-19` (el objeto `nextConfig` solo define `redirects()`) | Correcto |
| Sentry `withSentryConfig` con `sourcemaps.deleteSourcemapsAfterUpload: true` — los `.map` generados para el upload se eliminan del output y no se despliegan | OK (informativo) | `next.config.ts:21-29` | Correcto |
| `widenClientFileUpload: true` — sube más archivos cliente a Sentry; no expone nada al público | OK (informativo) | `next.config.ts:25` | Correcto |
| **No existe init de Sentry** (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.*.config.ts` ausentes); `src/lib/logger.ts:1,19,26` llama a `Sentry.captureException` que será no-op | MEDIA (operacional, no de exposición) | Glob sobre raíz y `src/` sin resultados; único uso en `src/lib/logger.ts` | Observabilidad rota, sin impacto de exposición |

**Build de verificación:** ✅ `npm run build` ejecutado (exit 0); conteo de `.map` bajo `.next/static/`: **0 archivos**. Source maps no expuestos, confirmado empíricamente.

Verificación en producción (reemplazar `[slug]`):

```bash
curl -sI "https://fce.[slug].cl/_next/static/chunks/<chunk>.js.map"   # esperado: 404
```

### 2.2 Secretos en código cliente

| Hallazgo | Severidad | Evidencia | Impacto |
|---|---|---|---|
| Ningún `process.env` no-`NEXT_PUBLIC_` en componentes cliente. Inventario de env vars sensibles: `ANTHROPIC_API_KEY` (`src/app/actions/resumen-ia.ts:75`, `informes-ia.ts:97`, `copiloto-nota.ts:71` — todos `'use server'`), `SUPABASE_SERVICE_ROLE_KEY` (`src/lib/supabase/service.ts:10` — solo server), `ICD_API_CLIENT_ID/SECRET` (`src/lib/icd/client.ts:13-14` — solo server) | OK | Grep `process.env.[A-Z_]+` sobre `src/` (19 ocurrencias, todas auditadas) | Ninguno |
| Sin secretos hardcodeados | OK | Grep `(apiKey\|secret\|token\|password)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]` (case-insensitive) sobre `src/` → 0 matches | Ninguno |
| El único uso de `NODE_ENV` en cliente es inocuo | OK | `src/components/shared/OrdenExamenLauncher.tsx:31` | Ninguno |

### 2.3 Estado de archivos .env

- `.gitignore:35` contiene `.env*` → cubierto.
- En el working tree existen `.env.local` (ignorado) y `.env.local.example`.
- **Historial git:** ✅ verificado — `git log --all --diff-filter=A --oneline -- '*.env*'` → **vacío**. Ningún `.env` commiteado jamás.

## 3. SEGURIDAD HTTP

### 3.1 Headers de seguridad — tabla

No existe función `headers()` en `next.config.ts` (líneas 4-19 solo definen `redirects()`), `src/proxy.ts` no setea ningún header de seguridad (solo cookies de sesión, líneas 15-23), y **no existe `vercel.json` ni `vercel.ts`** en el repo.

| Header | Estado en código | Valor / Nota | Archivo:línea |
|---|---|---|---|
| Strict-Transport-Security | ❌ No configurado | Vercel lo inyecta por plataforma en dominios HTTPS; no controlado por el repo | n/a |
| X-Content-Type-Options | ❌ No configurado | — | n/a |
| X-Frame-Options | ❌ No configurado | La app FCE no debería ser embebible: falta `SAMEORIGIN`/`DENY` | n/a |
| X-XSS-Protection | ❌ No configurado | Header deprecado; baja prioridad, se reporta por completitud | n/a |
| Referrer-Policy | ❌ No configurado | URLs como `/dashboard/pacientes/[id]/...` contienen UUIDs de pacientes que se filtran vía `Referer` a terceros | n/a |
| Permissions-Policy | ❌ No configurado | — | n/a |
| Content-Security-Policy | ❌ No configurado | Sin CSP cualquier XSS tiene vía libre; agravante: cookies de sesión Supabase legibles por JS (§3.3) | n/a |

**Severidad conjunta: ALTA** — plataforma de ficha clínica sin ningún header defensivo definido por el proyecto.

Verificación en producción:

```bash
curl -sI https://fce.[slug].cl/login | grep -iE "strict-transport|x-content-type|x-frame|referrer-policy|permissions-policy|content-security"
```

Nota comparativa: el repo hermano `synapta` sí define `X-Frame-Options: SAMEORIGIN` y `frame-ancestors` en su `next.config.ts`; `fce-plataform` no replicó ese patrón.

### 3.2 CORS

- Grep `Access-Control-Allow-Origin` sobre todo el repo: **0 ocurrencias**.
- No hay route handlers (`route.ts`) en `src/app/` — la app no expone API REST; toda mutación va por Server Actions, que Next.js protege con verificación de `Origin` (same-origin).
- Sin wildcard `*`, sin combinación `credentials + wildcard`. **Estado: correcto por defecto.**

### 3.3 Cookies

| Cookie | Origen | Flags | Evidencia |
|---|---|---|---|
| `id_profesional_activo` (custom) | Server Action `setPerfilActivo` | `httpOnly: true`, `sameSite: "lax"`, `secure` solo en producción, `path: "/"`, `maxAge` 30 días. El valor se valida contra los perfiles del usuario antes de setear (líneas 22-29) — **bien implementada** | `src/app/actions/perfil-selector.ts:31-38` |
| `sb-*` (sesión Supabase) | `@supabase/ssr` vía proxy | Flags delegados a la librería (`src/proxy.ts:20-22`). Por diseño de `@supabase/ssr` estas cookies **no son `httpOnly`**. Riesgo aceptado del stack, pero **se agrava por la ausencia total de CSP (§3.1)**: un XSS puede exfiltrar la sesión clínica completa | `src/proxy.ts:15-23`, `src/lib/supabase/server.ts:5`, `src/lib/supabase/client.ts:5-6` |

Severidad cookies: MEDIA.

### 3.4 Middleware — rutas protegidas vs expuestas

- Existe `src/proxy.ts` (convención Next 16, reemplazo de `middleware.ts`). Matcher: `'/((?!_next/static|_next/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'` (`src/proxy.ts:34-38`) — cubre todas las rutas no estáticas.
- **El proxy NO impone autenticación**: solo refresca el token (`src/proxy.ts:29`) y devuelve la respuesta. No hay redirect para anónimos.
- La protección real vive en **una sola capa de aplicación**: `src/app/dashboard/layout.tsx:23-25` (redirect a `/login` sin user) + `:36-38` (redirect sin fila activa en `admin_users`) + `:44` (`requireAccesoFCE(rol)`). Backstop de datos: RLS (cliente anon con JWT del usuario).

| Superficie | Ruta(s) | Protección | Estado |
|---|---|---|---|
| Raíz | `/` | Redirect según sesión (`src/app/page.tsx:21-27`) | Pública (solo redirige) |
| Login | `/login` | Pública por diseño (`src/app/login/page.tsx`) | Expuesta, sin rate limit propio (depende de límites de Supabase Auth) |
| Dashboard FCE | `/dashboard`, `/dashboard/pacientes/**` (15 páginas), `/dashboard/configuracion/**` | Layout server-side (`dashboard/layout.tsx:16-44`) + RLS | Protegida (capa única en app + RLS) |
| Server Actions | 35 archivos en `src/app/actions/**` | 30/35 archivos llaman `supabase.auth.getUser()`; `configuracion/*` delega en `requireConfigAdmin` (`_shared-server.ts:10`) | Mayoría protegida |
| **Server Actions ICD** | `searchDiagnosticos`, `getEntityDetail` (`src/app/actions/clinico/diagnostico.ts:9-27`) y `searchCIF` (`src/app/actions/rehab/cif.ts:7-22`) | **Ninguna verificación de auth ni de clínica** | **EXPUESTAS — Severidad ALTA**: invocables por cualquier anónimo que construya el POST de Server Action; proxy gratuito hacia la API OMS usando `ICD_API_CLIENT_ID/SECRET` (`src/lib/icd/client.ts:13-14`) |

Riesgo arquitectónico (MEDIA): si mañana se agrega una página fuera de `/dashboard` o un route handler, nace desprotegida porque el proxy no exige sesión.

## 4. RATE LIMITING

### 4.1 Estado

**Inexistente.** Grep case-insensitive de `ratelimit | rate.limit | upstash | throttle | captcha | honeypot | turnstile`: única coincidencia `src/lib/icd/client.ts:77` — que es el *manejo* del 429 de la API de la OMS, no un límite propio. No hay `vercel.json` (sin WAF declarado en repo; si existe configuración de Vercel WAF es por dashboard y debe verificarse aparte).

### 4.2 Endpoints sin protección, por prioridad

| Prioridad | Endpoint (Server Action) | Evidencia | Qué pasa con 1.000 req/min |
|---|---|---|---|
| 1 | `estructurarInforme` — Anthropic `claude-sonnet-4-6`, `max_tokens: 2048`, input hasta 5.000 chars, **sin caché** | `src/app/actions/informes-ia.ts:11,101-106` | Requiere sesión válida, pero un usuario en loop genera ~US$35/min. Sin freno alguno |
| 2 | `estructurarNota` — Anthropic `claude-sonnet-4-6`, `max_tokens: 1024`, **sin caché** | `src/app/actions/copiloto-nota.ts:13,75-79` | ~US$20/min por usuario autenticado |
| 3 | `generarResumenIA` — Anthropic `claude-haiku-4-5-20251001`, `max_tokens: 2048`, con caché por `contexto_hash` | `src/app/actions/resumen-ia.ts:13,79-84` (caché: `:56-72`) | La caché solo mitiga repeticiones del MISMO paciente sin datos nuevos; iterando pacientes el costo es ~US$10-15/min |
| 4 | `searchDiagnosticos` / `getEntityDetail` / `searchCIF` — **sin auth** (§3.4) | `src/app/actions/clinico/diagnostico.ts:9-27`, `src/app/actions/rehab/cif.ts:7-22` | Agotamiento de cuota OMS para toda la plataforma (el 429 de `icd/client.ts:76-78` rompe la búsqueda de diagnósticos para TODAS las clínicas); abuso anónimo como proxy |
| 5 | `/login` (Supabase `signInWithPassword`) | `src/app/login/page.tsx:34-37` | Credential stuffing limitado solo por los rate limits propios de Supabase Auth |
| 6 | Acciones de escritura clínica (anamnesis, encuentros, prescripciones, egresos, etc. — 30 archivos con `getUser()`) | `src/app/actions/**` | Con sesión válida: inserción masiva de basura clínica y crecimiento de `logs_auditoria`. Riesgo de integridad, no de acceso |

### 4.3 Análisis de costo IA

Supuestos de precio (lista pública Anthropic; **verificar contra factura actual**): Sonnet ≈ US$3/MTok input, US$15/MTok output; Haiku 4.5 ≈ US$1/MTok input, US$5/MTok output.

- `estructurarInforme` (peor caso): input ~1.400 tokens ≈ US$0,004; output 2.048 tokens ≈ US$0,031 → **~US$0,035/llamada**. A 1.000 req/min: **~US$35/min ≈ US$2.100/hora ≈ US$50.000/día**.
- `estructurarNota`: output cap 1.024 → **~US$0,02/llamada** → ~US$20/min.
- `generarResumenIA`: contexto clínico completo (varios miles de tokens input, `src/lib/ia/prompt.ts:20+`) + 2.048 output → ~US$0,01-0,02/llamada con Haiku; caché reduce solo el caso repetido idéntico.

Único freno existente: validación de longitud de input (`informes-ia.ts:62-67`, `copiloto-nota.ts:49-51`) — limita el costo POR llamada, no la frecuencia.

### 4.4 Top 3 a proteger (mecanismo sugerido, sin código)

1. **Las 3 acciones IA**: límite por `user.id` (token bucket, p. ej. Upstash Ratelimit: 5-10 llamadas/min y tope diario por clínica) + spend limit en la API key de Anthropic.
2. **Acciones ICD** (`diagnostico.ts`, `cif.ts`): primero exigir auth (corrección raíz), luego límite por usuario para proteger la cuota OMS compartida.
3. **`/login` y superficie general**: Vercel WAF / Firewall rules (rate limit por IP en `/login`) + revisar rate limits de Supabase Auth; opcionalmente Turnstile en login.

## 5. PRIORIZACIÓN GLOBAL

| # | Acción | Severidad | Justificación |
|---|---|---|---|
| 1 | Exigir autenticación y pertenencia a clínica en las Server Actions ICD (`diagnostico.ts`, `cif.ts`) | ALTA | Único endpoint invocable por anónimos; consume credenciales y cuota OMS compartida |
| 2 | Definir headers de seguridad (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy estricta, Permissions-Policy, HSTS explícito) vía `headers()` en `next.config.ts` o `src/proxy.ts` | ALTA | 0 de 7 configurados en una plataforma de ficha clínica; Referrer-Policy además filtra UUIDs de pacientes; CSP es el mitigante clave dado que las cookies Supabase son legibles por JS |
| 3 | Rate limiting por usuario en las 3 acciones IA + spend limit en la API key de Anthropic | ALTA | Riesgo financiero directo: ~US$2.100/hora con una sola sesión comprometida o un loop accidental de UI |
| 4 | Gate de autenticación en `src/proxy.ts` (redirect de anónimos fuera de `/login`) | MEDIA | Defensa en profundidad; previene que futuras rutas nazcan expuestas |
| 5 | Verificaciones pendientes en producción: `curl -sI https://fce.[slug].cl/login` para validar headers reales; confirmar/crear configuración de Vercel WAF; spend limit en console.anthropic.com | MEDIA | Cierran la evidencia que requiere acceso a producción/dashboards |
