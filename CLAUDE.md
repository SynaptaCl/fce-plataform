# CLAUDE.md — FCE Platform (fce-plataform)

> Última revisión: 2026-11-14 (depuración: historial de sprints/changelog salió de este archivo — vive en `git log` y `docs/`). Fuente de verdad para Claude Code; leer antes de cualquier cambio.
> Lo que se puede derivar del código (árbol de carpetas, listas de componentes/actions, columnas) NO se documenta aquí: leer el código o `docs/otros/schema-real.md` / MCP Supabase.

---

## 1. QUÉ ES

**fce-plataform** — Ficha Clínica Electrónica multi-tenant para clínicas chilenas. Next.js App Router + Supabase. Módulos FCE M1–M13. Agenda, pagos y chatbot viven en el repo hermano `synapta`.

Dos repos comparten la DB Supabase `vigyhfpwyxihrjiygfsa` (sa-east-1): `synapta` (landing + admin + agenda + chatbot) y `fce-plataform` (este). Deploy: Vercel.

## 2. DOCUMENTACIÓN

`/docs` está en `.gitignore` (solo 6 archivos trackeados): **puede no existir en otro clon**. Si falta algo, verificar contra el código o la DB.

Orden de lectura: este archivo → `docs/plan-redisenio/00-vision-general.md` → `docs/plan-redisenio/04-criterios-tecnicos.md` → sprint en curso (`docs/plan-redisenio/sprints/`) → `docs/otros/schema-real.md` (o MCP Supabase) → `clinics/<slug>/CLAUDE.md` (nuvident, renata, cenupsi) → `docs/onboarding-clinica.md`.

Sprints recientes con spec propio: `ADJ-1-adjuntos-clinicos.md`, `CI-1*-consentimiento-*.md`, `PRE-1-tarificacion-presupuestos.md`, `docs/AMB-1-ambient-scribe.md`.

## 3. STACK

Next.js 16.2.6 (Turbopack) · React 19.2 · TypeScript strict · Tailwind v4 · `@supabase/ssr` + `supabase-js` · `@anthropic-ai/sdk` · react-hook-form + zod 4 · Tiptap v3 (rich text) · recharts · html2pdf.js · date-fns · motion · lucide-react · `@sentry/nextjs` · `@upstash/ratelimit` + `@upstash/redis` · `sanitize-html` / `isomorphic-dompurify`.

> `AGENTS.md`: Next 16 tiene breaking changes — ante duda leer `node_modules/next/dist/docs/` antes de escribir código.

---

## 4. REGLAS INQUEBRANTABLES

1. `npm run build` = 0 errores después de CADA cambio.
2. **Tokens `kp-*` solo vía CSS vars** con prefijo completo `var(--color-kp-primary)` (NO `--kp-primary`, no resuelve). Nunca Tailwind genéricos ni hex hardcoded. Ver §5.
3. TypeScript strict, sin `any` implícito.
4. RLS habilitado en toda tabla con datos clínicos.
5. Filtrar por `id_clinica` en toda query (el `id_clinica` sale de `requireContext()`).
6. Audit log (`logAudit`) en toda escritura.
7. Contenido médico nunca se inventa: datos confirmados o `[PENDIENTE]`.
8. **Documentos firmados = inmutables** (trigger en DB): SOAP, nota clínica, consentimiento, prescripción, orden de examen, egreso, periograma, informe, ficha estética (+ adendas). Inventario en §8. Única excepción: `fce_presupuestos` (sin trigger; bloqueo solo en application layer).
9. **Hard-stop contraindicaciones** en especialidades con `tieneContraindicaciones: true` — enforcement en servidor, ver §9.
10. Server Components por defecto; `'use client'` solo si es necesario.
11. Seguir sprints en orden; no saltar ni mezclar.
12. NUNCA modificar `registry.ts` para una clínica — usar `clinicas_fce_config`.
13. Especialidades en DB = strings EXACTOS del catálogo (con tilde). Nunca normalizar antes de escribir.
14. `profesionales.auth_id` NO es UNIQUE (1 auth_id → N profesionales). Usar `getProfesionalActivo()` (`src/lib/fce/profesional.ts`, lee cookie `id_profesional_activo`).
15. **Claude Code NO aplica migrations/DDL.** Genera el SQL, lo presenta y espera aprobación humana (DB compartida con `synapta`).
16. Prescripciones inmutables post-firma; snapshots del profesional se capturan al firmar.
17. M10 (plan de intervención) NO es inmutable: documento vivo, sin trigger.
18. Personalización por especialidad = `getEspecialidadConfig(esp)` (`src/lib/modules/especialidad-config.ts`). NUNCA `if (especialidad === '...')` en componentes. *(Deuda conocida: `renderEval()` en `rehab/page.tsx`.)*
19. Validar especialidad antes de INSERT/UPDATE en `profesionales`: usar `crearProfesional`/`actualizarProfesional` de `actions/profesionales.ts`.
20. Imágenes de UI con `next/image` (con `width`/`height`; `priority` solo above-the-fold; `quality={75}`; nuevo origen remoto → `images.remotePatterns` en `next.config.ts`). Excepciones: PdfViews (html2pdf.js) y firma dataURL → `<img>` con `eslint-disable-next-line @next/next/no-img-element`.
21. **`src/proxy.ts`** (Next 16, reemplaza middleware): refresh de sesión, gate optimista de auth en `/dashboard`, CSP con nonce por-request. El nonce+CSP deben ir en los **request headers** (`NextResponse.next({ request: { headers } })`) además del response; si solo van en el response, React no se hidrata y los `<form>` se envían como GET. Headers estáticos (HSTS, X-Frame-Options DENY, etc.) en `next.config.ts` `headers()`.
22. Server Actions usan `requireContext()` / `requireAuth()` (`src/lib/auth.ts`) y `logAudit()` (`src/lib/audit.ts`). Nunca duplicar inline.
23. `logAudit()` nunca lanza (fire-and-forget, fallback `console.error`). PII prohibido en logs: solo UUIDs.
24. `getIdClinica()` de `patients.ts` está **deprecado** → `requireContext()`. Aún lo usan ~10 actions (ver deuda §12).

---

## 5. PALETA

Tokens `kp-*` se inyectan desde `clinicas.config.branding` vía `BrandingInjector` (validación estricta `COLOR_RE`). Los componentes usan siempre `var(--color-kp-*)`; nunca leer `config.branding` directo (usar `config.tokensColor` del provider).

- Estáticos (globals.css): `--color-surface-0/1`, `--color-ink-1/2/3`, `--color-kp-border`.
- Dinámicos por clínica: `--color-kp-primary`, `-accent`, `-success`, `-warning`, `-danger`, `-accent-xs`, `-danger-lt`, `-warning-lt`.
- **Excepción**: `recharts` y `html2pdf.js` no resuelven CSS vars → hex hardcoded (`ProgresoChart`, vistas `*PdfView`).

---

## 6. ARQUITECTURA MULTI-TENANT

```
1. CATÁLOGO (código)       src/lib/modules/registry.ts — 13 módulos (M1–M13), especialidades y modelos
2. CONFIG POR ESPECIALIDAD src/lib/modules/especialidad-config.ts — FUENTE ÚNICA (instrumentos, launchers, secciones, IA, diagnóstico)
3. CONFIG POR SERVICIO     src/lib/modules/servicio-config.ts — instrumentos sugeridos por tipo de cita
4. CONFIGURACIÓN (DB)      clinicas_fce_config — módulos/especialidades activas por clínica
5. GUARDS (runtime)        src/lib/modules/guards.ts — requireModule, assertPuedeFirmar, ActionResult, dbError…
6. UI CONDICIONAL          Sidebar + rutas filtradas por config
```

Cuatro modelos (`ModeloClinico`): `rehabilitacion` (SoapForm + EvalComponent; Kine/Fono/Maso/TO/Podología) · `clinico_general` (NotaClinicaForm + InstrumentosPanel; Medicina, Enfermería, Psico, Nutri, Obstetricia, etc.) · `odontologico` (DentalWorkspace) · `ninguno` (Administración Clínica). Lista y estado (`estable|beta|roadmap`) por especialidad: ver `registry.ts`. **Odontología sigue en `beta`.**

`encuentro/[encuentroId]/page.tsx` redirige a `/rehab` | `/clinico` | `/dental` según `getModeloDeEspecialidad()`. En rehab el profesional puede elegir nota SOAP o nota clínica simple.

---

## 7. MÓDULOS

| ID | Tablas | Estado | Oblig. |
|---|---|:---:|:---:|
| M1_identificacion | `pacientes` | estable | sí |
| M2_anamnesis | `fce_anamnesis`, `fce_signos_vitales` | estable | no |
| M3_evaluacion | `fce_evaluaciones` | estable | no |
| M4_soap | `fce_notas_soap`, `fce_encuentros` | estable | no |
| M5_consentimiento | `fce_consentimientos` | estable | no |
| M6_auditoria | `logs_auditoria` | estable | sí |
| M7_prescripciones | `fce_prescripciones`, `medicamentos`, `medicamentos_presentaciones` | estable | no |
| M8_examenes | `fce_ordenes_examen`, `examenes_catalogo` | beta | no |
| M9_egresos | `fce_egresos` | beta | no |
| M10_plan_intervencion | `fce_planes_intervencion`, `fce_plan_objetivos`, `fce_plan_progreso`, `plantillas_dominios` | beta | no |
| M11_presupuestos | `fce_presupuestos`, `fce_presupuesto_items` | beta | no |
| M12_informes | `fce_informes` | beta | no |
| M13_estetica | `fce_fichas_esteticas`, `fce_ficha_estetica_zonas`, `fce_ficha_estetica_fotos`, `procedimientos_esteticos_catalogo` | beta | no |

(Estados verificados contra `registry.ts` 2026-11-14.)

**Transversales que NO son `ModuleId`** (no se activan en `clinicas_fce_config`):
- **Adendas** (`fce_adendas`, §13): corrección de documentos firmados.
- **Ambient Scribe (AMB-1)**: grabación → nota. **Apagado**: `AMBIENT_SCRIBE_DISPONIBLE = false` en `especialidad-config.ts` (constante de código, no env var). Bloqueado por temas legales, no técnicos. Spec: `docs/AMB-1-ambient-scribe.md`.
- **Adjuntos clínicos (ADJ-1)**: imágenes/resultados de examen en bucket privado, validación profesional (recepcionista/director suben como `pendiente`), vínculo opcional a orden M8. Código en `actions/adjuntos.ts`, `lib/adjuntos/`, `components/adjuntos/`, ruta `/dashboard/adjuntos`; migration `20261114_01_fce_adjuntos.sql` — **estado de aplicación en prod NO verificado**. Spec: `sprints/ADJ-1-adjuntos-clinicos.md`.
- **Tarificación (PRE-1)**: `lib/tarificacion/` (`resolverPrecio`, `calcular`). Ver precios en §8.

---

## 8. DB — LO NO DERIVABLE DEL CÓDIGO

**Con `id_clinica`**: toda tabla `fce_*` clínica, `pacientes`, `instrumentos_aplicados`, `clinicas_fce_config`. Foreign keys en español con prefijo `id_` (`id_paciente`, `id_encuentro`, `id_clinica`).

**Catálogos globales**: `especialidades_catalogo`, `instrumentos_valoracion`, `medicamentos`, `medicamentos_presentaciones`, `examenes_catalogo`, `plantillas_dominios`.

### Triggers de inmutabilidad (verificado vía MCP 2026-08-02; los de M13 posteriores)

| Tabla | Trigger → función |
|---|---|
| `fce_notas_soap` | `trg_fce_soap_inmutable` → `fn_fce_soap_inmutable()` |
| `fce_notas_clinicas` | `trg_block_update_signed_nota` → `block_update_signed_nota_clinica()` (cubre `icd_codigos`/`icd_version`/`secciones_estructuradas` desde `20260801_01`) |
| `fce_prescripciones` | `trg_block_update_signed_presc` |
| `fce_consentimientos` | `trg_block_update_signed_consent` → `block_update_signed_consentimiento()` (ver abajo) |
| `fce_informes` | `trg_block_update_signed_informe` |
| `fce_adendas` | `trg_block_update_signed_adenda` |
| `fce_egresos` | `trg_block_update_signed_egreso` |
| `fce_periograma` (singular; `fce_periogramas` NO existe) | `trg_block_update_signed_periograma` |
| `fce_ordenes_examen` | `trg_block_update_signed_orden` (`estado_resultados` sigue actualizable post-firma) |
| `fce_fichas_esteticas` / `fce_ficha_estetica_zonas` | `trg_block_update_signed_ficha_estetica` / `trg_block_write_zonas_signed_ficha_estetica` |

Varios triggers/funciones se aplicaron directo en prod sin migration; las del repo en `supabase/migrations/` están reconstruidas (históricas, **no re-ejecutar**).

### Consentimientos (M5)
- Si `firmado=true`, SOLO `updated_at` es mutable. **Revocación append-only**: INSERT de fila nueva `firmado=false` con versión +1 (`revocarConsentimientoGrabacion()`), nunca UPDATE sobre la firmada.
- Hash SHA-256 del contenido canónico `tipo|contenido|id_paciente|id_clinica|firma.data_url|firma.timestamp` + validación de firma PNG 2–500 KB: `src/lib/consentimientos/firma.ts`.
- Solo `profesional` crea `firmado=true` (`assertPuedeFirmar`). Menores: representante legal (nombre/RUT/parentesco) validado server-side e interpolado en `contenido`; declaración "informé al paciente" obligatoria + audit. Label: "Firma electrónica simple".
- CHECK `tipo`: general, menores, teleconsulta, uso_ia, grabacion_ia, procedimiento_estetico.
- **CI-1 decidido: la página pública de firma por token (`/consentimiento/[token]`, sin login, RPC SECURITY DEFINER acotada) vive en ESTE repo.** Spec en `sprints/CI-1*.md`.
- Test: `npm run test:m5-consentimientos`. Hallazgo RLS ambient: `docs/otros/INFORME-BYPASS-RLS-AMBIENT-2026-09-21.md`.

### Roles (`admin_users.rol`, fuente autoritativa; nunca `profesionales`)
`superadmin`, `director`, `admin`, `profesional`, `recepcionista`. Rol `coordinador`: cancelado.
- **Escribir y firmar en la ficha: solo `profesional`** (`ROLES_QUE_PUEDEN_ESCRIBIR` / `ROLES_QUE_PUEDEN_FIRMAR`).
- `admin`/`director`/`superadmin`: **lectura** del timeline clínico completo (`soloLectura`: sin lanzar encuentro, adendas ni reingreso) + configuración de profesionales/servicios + auditoría. Excepción: crean/editan **pacientes** (M1, dato demográfico; `assertPuedeGestionarPacientes`).
- Layout bloquea para ellos `consentimiento|encuentro|egreso` (formularios). `/anamnesis` abre en solo lectura (`<fieldset disabled>` + `assertPuedeEscribir`).
- Errata/anulación de una nota: exclusivo del autor (`created_by`); errata ≤72 h (§13).
- Recepcionista NO accede a FCE.
- RLS: `20260929_01` (aplicada 2026-09-30) y `20261002_01` (aplicada, verificada vía MCP 2026-10-08, no figura en historial de `apply_migration`). SELECT vía `tiene_acceso_clinico`, escritura vía `es_profesional_clinico()` (exige `rol='profesional'` + vínculo en `admin_user_profesionales`). `pacientes` sin policy DELETE.
- Test: `npm run test:roles-admin-solo-lectura` — **pendiente actualizarlo** a la regla 2026-10-02.

### RLS — `tiene_acceso_clinico(p_id_clinica)`
True si `admin_users.rol IN (director, admin, superadmin)` de esa clínica, o hay fila en `admin_user_profesionales`. Lo usan: soap, egresos, periograma, ordenes_examen, consentimientos, notas_clinicas, evaluaciones, prescripciones, informes, adendas, odontograma(+historial), plan_tratamiento(+items), M13 (fichas/zonas/fotos; bucket `fichas-esteticas` filtra por primer segmento del path = `id_clinica`).

**Sin resolver**: `pacientes` sigue en `get_clinica_ids_for_user()` (policy `pacientes_by_clinica`). Dos primitivas conviven; no confirmado si es intencional — no tocar sin decidir.
Las `fce_*` tienen `relforcerowsecurity=false` (solo `admin_users`/`profesionales`/`admin_user_profesionales` tienen FORCE RLS): `service_role`/dueño bypasean RLS, igual que `createServiceClient()` (uso deliberado).

### Precios/servicios — dueño `synapta` (NO DDL desde acá)
- `servicios`, `profesional_servicios`, `prestaciones_catalogo`, `profesional_prestaciones`: synapta escribe; este repo solo lee. **Excepción deliberada**: `actions/configuracion/servicios.ts` escribe SOLO `activo`, `id_profesional`, `id_servicio` en `profesional_servicios`.
- `procedimientos_catalogo` eliminada (→ `prestaciones_catalogo`). `profesional_servicios` ya no tiene precios; solo `duracion_override_min` (NULL = `servicios.duracion_default_min`).
- Sync precio por trigger bidireccional `servicios.precio_local` ↔ `prestaciones_catalogo.precio_base`.
- `prestaciones_catalogo.precio_base` = CLP entero, precio final al público. M11 y `resolverPrecio()` leen SOLO `prestaciones_catalogo`/`profesional_prestaciones`, nunca `servicios.precio_local`.
- `citas.id_profesional_servicio` → `profesional_servicios.id` (no `servicios.id`); nombre vía `lib/servicios/nombre-servicio.ts` (test `test:encuentro-servicio`).
- Clínica `incluyeme`: 10 servicios sin filas en `profesional_servicios` A PROPÓSITO — no es bug.
- De otros repos SOLO READ: `citas`, `disponibilidad`, `pagos`, `conversaciones`.

### Medicamentos
`medicamentos` (nivel DCI; `validado_clinicamente=false` = aviso en UI, no bloquea) + `medicamentos_presentaciones` (marca/lab; `bioequivalente` NULL = sin dato, **nunca** tratar como "no bioequivalente"; excluir `estado='descontinuado'`). `medicamentos_catalogo` = LEGACY, sin lecturas en código.

### Otras tablas con particularidades
- `fce_antropometria`: dato vivo, NO inmutable. `fce_anamnesis` tiene columnas gestacionales (`embarazo_activo`, `fur`, `semana_gestacional_base`, `fecha_eval_gestacional`).
- `fce_signos_vitales.id_clinica` es NULLABLE (rows legacy NULL; `.eq("id_clinica", X)` las excluye). `fce_notas_soap` tiene `id_clinica` NOT NULL, `created_by`, `updated_at`.
- `profesionales`: flags `puede_prescribir`, `puede_indicar_examenes`, `puede_estetica` (default false; se activan por clínica).
- `logs_auditoria`: `tipo_evento` (ver `TipoEvento` en `lib/audit.ts`; incluye `ia_ambient`, `consent_grabacion_otorgado/revocado`, aplicados por `20260819_03`) + `session_id`.

---

## 9. PATRONES CRÍTICOS

**Auth**: siempre `supabase.auth.getUser()`; nunca `getSession()` (no valida JWT).

**Actions clínicas**:
```typescript
const { supabase, user, idClinica, rol, profesionalId, especialidad } = await requireContext();
await logAudit({ supabase, actorId: user.id, accion: "firmar_nota_clinica", tipoEvento: "sign",
  tablaAfectada: "fce_notas_clinicas", registroId, idClinica, idPaciente });
```

**Errores DB (SEC-1)**: nunca `error.message` raw al cliente → `return dbError("<action>", error, { id_clinica })` (`guards.ts`; detalle solo a `log()`). Excepciones: mensajes Zod de validación; errores de negocio humanizados en `mapKnownDbError()`.

**`ActionResult<T>`**: `{success:true,data}|{success:false,error}` — se importa de `guards.ts` (no existe en `@/types`).

**PII hacia Anthropic (SEC-1, Ley 21.719)**: todo texto pasa por `seudonimizarTexto(text, pii)` (`lib/ia/sanitize-pii.ts`, PII vía `fetchPiiPaciente()`) en un choke point único por action. `sanitizeRutFromText` sola NO basta.

**Hard-stop contraindicaciones (regla 9)**: `lib/anamnesis/red-flags.ts` (`RED_FLAG_DEFS`, `getContraindicacionesActivas()`) es la fuente única, usada por `RedFlagsChecklist` (UI) y por `signSoapNote`/`signNotaClinica` (bloqueo real en servidor antes de firmar, si `getEspecialidadConfig(esp).tieneContraindicaciones`). Aplica a Masoterapia y Odontología (Podología es `roadmap`).

**Especialidad**: escribir a DB el string crudo (`"Kinesiología"`); normalizar solo en variable separada para routing.

**`getEspecialidadConfig`**: campos clave — `secciones: SeccionNota[]` (campos tipados `texto_largo|texto_corto|select|multi_select|escala|fecha|booleano`), `tieneCalculoIMC`, `tieneAntropometria` (solo Nutrición), `tieneCopilotoIA`, `tieneResumenIA`, `tieneAmbientScribe`, `tieneContraindicaciones`, `diagnostico?: DiagnosticoConfig`. Launchers condicionados: `puede_prescribir` → `PrescripcionLauncher`; `puede_indicar_examenes` → `OrdenExamenLauncher`; M13 + `puede_estetica` → `EsteticaLauncher`. Códigos de instrumento correctos: `wisc5`, `corah_ansiedad`, `sensory_profile`.

**Fechas / Santiago**: `new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" })` (ver también `lib/dates.ts`, `test:dates`).

**Paciente**: todos los campos nullable → `patient.nombre ?? "Sin registro"`; nombre completo con `.filter(Boolean).join(" ")`.

**PDF**: `html2pdf.js` solo con `await import("html2pdf.js")` (import estático rompe SSR). En `*PdfView`/`buildPdfHtml()` usar `escapeHtml()` (`lib/utils.ts`) sobre todo dato dinámico.

**Rich text (RTE)**: campos narrativos (SOAP S/O/P/tareas, nota `contenido`/`plan`, secciones `texto_largo`) guardan HTML. Server actions SIEMPRE `sanitizeRichText()` (`lib/sanitize.ts`) antes de INSERT/UPDATE (whitelist `p,br,strong,em,u,ul,ol,li,h2,h3,blockquote`, cero atributos). Render: `isRichTextHtml()` → `dangerouslySetInnerHTML` (seguro porque se sanitiza al escribir) o `pre-wrap`. IA recibe `stripHtml()`; salida de IA en texto plano → `textoPlanoAHtml()`. Campos planos (motivo, diagnóstico) no se sanitizan. NO agregar `@tiptap/extension-underline` (StarterKit v3 ya lo trae). JSONB de evaluaciones: `sanitizeJsonbStrings` en write-path.

**Nutrición (cálculos biológicos)**: usar `pacientes.sexo_registral` (M/F) — NUNCA `identidad_genero` — para z-score OMS y Atalah. Si falta `sexo_registral` o `fecha_nacimiento` en modo pediátrico/gestacional → degradar a adulto IMC simple con aviso (nunca lanzar). Pliegues (% grasa) solo modo adulto. Funciones puras en `lib/nutricion/`. Datasets OMS LMS y bandas Atalah: `PENDIENTE_CLINICA` (§12).

**ICD-11**: `lib/icd/` (OAuth2 WHO, token cacheado en memoria, rate-limit con `checkRateLimit`). `ICDCodeSnap` (`code,title,uri,version,language,addedAt,addedBy`) obligatorio al guardar. Notas usan `icd_codigos` (array) + `icd_version`; periograma usa `diagnostico_icd` (objeto único). Diagnóstico condicional por especialidad vía `DiagnosticoConfig {tipo:'icd11_mms'|'ninguno', label, mostrarCIE10?, chaptersFilter?}`: solo Medicina General y Odontología (Psicología con `chaptersFilter:'06'`); el submit no envía campos ICD si `mostrarICD=false`; notas firmadas históricas con ICD se muestran readonly "Diagnóstico registrado (histórico)". `chaptersFilter` viaja config → form → `DiagnosticoSearch` → `buscarDiagnostico` (con fallback client-side por prefijo de código). CIF/ICF: `actions/rehab/cif.ts`, `CifSearch`.

**Logging**: `log()` de `lib/logger.ts` (nunca `console.error` directo); `info|warn|error` (error → Sentry); solo UUIDs, nada de PII ni narrativa clínica.

---

## 10. UX

- **Sidebar** con modos expandido/rail/oculto, persistido en `localStorage` (ver `components/layout/Sidebar.tsx`).
- **PatientHeader**: slots `primaryAction`, `statusBadge`. En workspaces va en `<div className="sticky top-0 z-20">`; badges con `--color-kp-warning`/`-success` y `color:#fff`.
- **Firma**: `FirmarHeaderButton` (rehab/clinico, scroll a `#signature-section`); dental usa tabs → `FirmarDentalButton` dispara un evento que `DentalWorkspace` escucha.
- **ActionBar**: chips de navegación de la ficha; muestra/oculta según módulos activos (`useClinicaConfig()`).
- **ProfesionalSelector** (TopBar): badge de especialidad; dropdown si N>1 perfiles; cookie `id_profesional_activo` (httpOnly, lax, 30 días).
- **Dashboard**: vista Hoy/Mañana con alcance por rol. Sesión expira por inactividad (PC compartido). Auth único con Synapta (recuperación de contraseña redirige a Synapta).

---

## 11. COMANDOS Y COMMITS

```bash
npm run dev | build | lint
npm run test:<nombre>     # lista completa en package.json "scripts" (tsx, la mayoría sin DB)
npm run onboard:clinica   # CLI onboarding
```
Tests clave: `test:sprint-sec1`, `test:sprint-rte`, `test:sprint-d7`, `test:sprint-m13`, `test:m5-consentimientos`, `test:roles-admin-solo-lectura`, `test:resumen-ia-incremental`, `test:sprint-pre1`, `test:sprint-adj1`, `test:sprint-amb1`. Los conteos de checks no se versionan aquí: correr y leer.

Commits: `feat|fix(sprint-xx)(scope): descripción`. Scopes: `clinico, rehab, dental, shared, registry, guards, branding, icd, timeline, docs, layout, nutricion, lint, ...`. Terminar con las líneas de atribución que indique el entorno.

---

## 12. CONTEXTO SENSIBLE Y DEUDA

**Clínicas**: contexto por clínica en `clinics/<slug>/CLAUDE.md` (respetar sus módulos activos). **Cenupsi** es banco de pruebas técnico, NO cliente confirmado: no pedir datos reales ni inventar datos de profesionales. Qué clínicas están en producción real: **no verificado aquí** — los CLAUDE.md por clínica (p. ej. Renata) pueden estar desactualizados; confirmar con el humano.

**Deuda técnica** (prioridad):
- **Alta** — Validación clínica pendiente: seed MNA/MUST/SGA; datasets OMS LMS (`oms-lms/*.json`) y bandas Atalah en `PENDIENTE_CLINICA` antes de activar modo pediátrico/gestacional; `procedimientos_esteticos_catalogo` (9 genéricos); `examenes_catalogo` (115 filas sin `codigo_fonasa`/`nivel_fonasa`/`valores_referencia`).
- **Alta** — Odontología/D8: sin verificación manual en navegador (timeline dental, adenda periograma, launchers M7/M8, firma unificada, hard-stop). Condición previa a cualquier piloto dental.
- **Alta** — RIA-1: probar end-to-end firmando 2+ evoluciones (migration `20261016_01` aplicada) y medir tokens reales (`resumen_ia_generado` en logs).
- **Media** — `pacientes` en `get_clinica_ids_for_user()` vs resto en `tiene_acceso_clinico()` (§8).
- **Media** — `getIdClinica()` deprecado aún en ~10 actions (anamnesis, instrumentos, plan-intervencion, consentimiento, egresos, encuentros, patients, dental/odontograma, plan-tratamiento, procedimientos) → migrar a `requireContext()`.
- **Media** — Repo de migrations desincronizado con prod (objetos creados sin archivo); hacer pase de reconciliación completo. Verificar estado de aplicación de `20260828_03`, `20261114_01` y demás recientes.
- **Media** — `test:roles-admin-solo-lectura` desactualizado; ~210 medicamentos / 360 presentaciones sin validación QF; instrumentos con `validado:false` (catálogo ~35); aviso no-bloqueante de consentimiento faltante en M13 no implementado; plan M10 fuera del contexto del Resumen IA; `renderEval()` (regla 18); UX: modal de selección de perfil al primer ingreso, gestión de `puede_prescribir`/`puede_indicar_examenes` en panel.
- **Media** — ADJ-1 hallazgo: `uploadFotoFicha` (M13) sube vía Server Action (límite body 1 MB Next / ~4.5 MB Vercel) → fotos de celular probablemente fallan; migrar a upload directo desde cliente.
- **Baja** — Umbrales de cintura ATP-III/OMS caucásicos; `medicamentos_catalogo` legacy (DROP pendiente); `estado_resultados` de órdenes (lo cubre ADJ-1); inyección `.or()` PostgREST en catálogos globales; periograma sin guard `id_clinica` en capa app (solo RLS); `cache_control` del prompt de Resumen IA probablemente no activa; comparación Sonnet vs Haiku del Resumen IA (Fase 2) sin hacer; sección Contexto de `TerapiaOcupacionalEval` sin `observaciones_contexto`; `fce_signos_vitales` tipos TS stale (id_clinica sí existe).
- **Pendiente de producto** — R1 (`renderEval` → config), activar config Nuvident en producción, A1.2 (adendas a egreso/prescripción/orden/consentimiento), A2 (`/dashboard/auditoria` con filtros + export PDF firmado).

---

## 13. ADENDAS (`fce_adendas`)

Corrige/complementa un documento firmado **sin alterarlo** (Ley 20.584 / Decreto 41). Tabla polimórfica: `tipo_documento` + `id_documento` (soap, nota_clinica, periograma, egreso, prescripcion, orden_examen, consentimiento, ficha_estetica); `tipo_adenda` = adenda | errata | anulacion; inmutable post-firma. **UI actual**: soap + nota_clinica + periograma (resto: A1.2).

| Tipo | Quién | Ventana |
|---|---|---|
| adenda | profesional con acceso al paciente | siempre |
| errata | autor original (`created_by`) | ≤72 h desde `firmado_at`; pasada la ventana solo adenda de complemento |
| anulación | autor original | siempre |

Decisión 2026-09-29, confirmada en `actions/adendas.ts`: **sin override de director/admin** (`override_*` se guardan en `false/null`; las columnas siguen en la tabla pero no se usan).

`crearAdenda({ tipoDocumento, idDocumento, idPaciente, tipoAdenda, motivo, contenido, overrideMotivo? })` revalida firma, autoría y ventana 72 h en servidor (el cálculo en cliente es solo UX). Auditoría: `create_adenda | create_errata | create_anulacion` (`errata_post_ventana` ya no se emite sin override). La nota original nunca se edita ni borra; la anulación la marca visualmente.

---

## 14. IA

Modelos: `claude-sonnet-4-6` (Resumen IA, Informes, Copiloto con upgrade, AMB-1) · `claude-haiku-4-5-20251001` (Copiloto Escritura; sube a Sonnet ante falla de formato/error, `lib/ia/copiloto-nota/llamar-modelo.ts`). **No cambiar el modelo del Resumen IA sin revisión médica del prompt.** Rate limit: `iaRateLimit()` (`lib/rate-limit.ts`, Upstash, fail-open): 6/min resumen, 10/min copiloto, 10/min informes; tope por clínica 30/min para resumen por evento. Toda IA: seudonimizar PII (§9), audit con `tipoEvento` `ia_*`.

### Resumen IA (RIA-1)
- **Visualizar no cuesta tokens**: `obtenerResumenVigente` lee la última versión (`fce_resumenes_ia_versiones`, append-only; `fce_resumenes_ia` = puntero). Solo firmar una evolución (`programarResumenIA()` → `after()`, nunca bloquea la firma) o el botón "Actualizar" (`generarResumenIA`, completa) llaman a Anthropic. Único camino de generación: `actualizarResumen()` en `lib/ia/resumen/generar.ts`.
- Disparan: `signSoapNote`, `signNotaClinica`, `createQuickNote`, `signEgreso`, `firmarPlanIntervencion`/`actualizarPlanIntervencion`, `crearAdenda`.
- **Incremental vs completa** (`decidirModo`, `lib/ia/resumen/decision.ts`): completa si no hay versión previa, tras 5 incrementales (`MAX_INCREMENTALES`), si cambió `hash_contexto_base`, si desapareció una evolución cubierta, si lo nuevo no cabe (solo entran las 10 últimas notas) o si el evento la fuerza (`alta`, `cambio_plan`, `edicion_evolucion`=errata/anulación, `adenda`, `manual`). Sin novedades → `sin_cambios` (0 tokens).
- `hash_contexto_base`: anamnesis, medicación, exámenes, instrumentos, alertas, demográfico. Excluye signos vitales agregados y contadores de días.
- Gating por evento: solo si ya hay resumen o ≥2 evoluciones firmadas, y `tieneResumenIA`.
- Contexto: solo evoluciones **firmadas** + adendas/erratas/anulaciones firmadas (`extraerAdendas`, sección crítica: si falla, no se genera). Lecturas con cliente del usuario (RLS); `service_role` solo para escribir versiones/puntero/audit.
- Si falla: no se escribe nada; la última versión sigue vigente y la UI marca `desactualizado`. `contexto_incompleto`: automático no genera; manual genera pero no persiste.
- Medición: `log('info', { action:'resumen_ia_generado', tipo, motivo, modelo, tokens_* })`.
- Tests: `test:resumen-ia-incremental`, `test:resumen-ia-parcial`.
- **Disclaimers (texto literal, no modificar)** — Modal: "Este resumen fue generado automáticamente a partir de los registros clínicos disponibles en el sistema. Es una herramienta de apoyo para el profesional tratante y no constituye un diagnóstico médico, recomendación terapéutica ni reemplaza el juicio clínico del profesional responsable de la atención." Tooltip: "Síntesis de antecedentes — No reemplaza el juicio clínico".

### Copiloto de escritura (notas)
`estructurarNota()` (bullets ≤5000 chars → prosa) en `CopilotoNotaButton`/`CopilotoNotaPanel`. `type="button"` en todos los botones del panel (están dentro de un `<form>`); `getBullets` se lee al click; audit obligatorio con `createServiceClient()` incluso si se descarta; sin caché; botón controlado por `tieneCopilotoIA`. Disclaimer (literal): "Borrador generado por IA a partir de los apuntes ingresados. Debe ser revisado y editado por el profesional responsable antes de firmar."

---

## 15. M10 — PLAN DE INTERVENCIÓN

Documento vivo (sin trigger de inmutabilidad; firma = aprobación para informes, sigue editable). Activación por clínica: `array_append(modulos_activos, 'M10_plan_intervencion')` en `clinicas_fce_config` — lo ejecuta un operador Synapta, no Claude (ver `sprints/N1-neurodesarrollo-activacion.md`). GAS: `NivelGAS = -2..+2`, 0 = resultado esperado; `nivel_actual` se denormaliza desde el último `fce_plan_progreso`. `EstadoPlanIntervencion` ("borrador|activo|en_revision|cerrado") ≠ `EstadoPlan` dental. Instrumentos `tipo_renderer='registro_externo'` (ADOS-2, CARS-2, Vineland, WISC-V): no calculan puntaje; `interpretacion = respuestas.clasificacion`. Todas las escrituras: `assertModuleEnabled(config,'M10_plan_intervencion')` + `logAudit`.

**`secciones_estructuradas` (jsonb en `fce_notas_clinicas`) — CRÍTICO**: conviven dos formas: campos M10 como strings PLANOS en la raíz (`conductas_observadas`, `participacion_cuidador`, `estrategias`, `asistencia`) y secciones P2 como objetos anidados `{[seccionId]:{[campoId]:valor}}`. `NotaClinicaForm` inicializa cada estado SOLO con sus claves (`extraerCamposM10`/`extraerSeccionesP2`) y fusiona ambos al guardar; todo consumidor (pdf-renderer, timeline cards) debe manejar ambas formas.

---

## 16. VARIABLES DE ENTORNO

```bash
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         # solo server
ANTHROPIC_API_KEY                 # solo server
ICD_API_CLIENT_ID / ICD_API_CLIENT_SECRET   # WHO, solo server
KV_REST_API_URL / KV_REST_API_TOKEN         # Upstash (rate limit), solo server
NEXT_PUBLIC_SENTRY_DSN            # público
SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT   # solo CI/Vercel (sourcemaps)
```

## 17. OBSERVABILIDAD

Sentry (`@sentry/nextjs`): `instrumentation.ts` + `sentry.{client,server,edge}.config.ts` + `withSentryConfig` en `next.config.ts`. Org `synapta-spa`, project `fce-plataform`. Sin `SENTRY_AUTH_TOKEN` → `disable: true` (el build no cae); `deleteSourcemapsAfterUpload: true`. `tracesSampleRate` 0.1 prod / 1.0 dev. Logging estructurado: ver §9.

## 18. RECURSOS

Supabase `vigyhfpwyxihrjiygfsa` (sa-east-1) · Vercel · repo hermano `synapta` · clínicas: `clinics/{nuvident,renata,cenupsi}/CLAUDE.md`.
