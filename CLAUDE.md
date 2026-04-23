# CLAUDE.md — FCE Platform (fce-plataform)

> Última actualización: 2026-04-23
> Actualizado tras sesión: Sprint R10 completado. UI prescripciones M7: 8 componentes en components/shared/ (PrescripcionLauncher+Form+MedicamentoSelector+Card+Editor+IndicacionGeneralEditor+FirmaPanel+List), server action prescripciones.ts con validación ordenada (schema→módulo→rol→puede_prescribir→encuentro→snapshot→folio), PrescripcionLauncher integrado en clinico/page.tsx y rehab/page.tsx. 43/43 tests, build+lint 0 errores. Módulo M7 prescripciones: 4 migrations generadas (pendientes aplicar en Supabase), registry M7 + tipos Prescripcion/MedicamentoCatalogo + helper buscarMedicamentos, 53/53 tests, build + lint 0 errores. Fix colateral: 4 errores de lint pre-existentes en EvaluacionTimeline, InstrumentoLauncher, InstrumentosPanel + eslint.config.mjs ignora .worktrees. Korporis migrado al flujo de encuentro explícito: rehab/page.tsx con SoapForm+EvalComponent, components/rehab/ (6 componentes), actions/rehab/soap.ts + evaluacion.ts, rutas legacy evolucion/evaluacion eliminadas, redirects 302 en next.config.ts, test-sprint-r7.ts 33/33. Build 0 errores.
> Este documento es la fuente de verdad para Claude Code. Leerlo antes de cualquier cambio.

---

Este repo está en proceso de rediseño multi-modelo (rehab + clínico general).
Antes de cualquier cambio, leer:
- `docs/plan-redisenio/00-vision-general.md`
- `docs/plan-redisenio/04-criterios-tecnicos.md`
- El sprint en curso: `docs/plan-redisenio/sprints/R{N}-*.md`

Sprints en orden: R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8.


## 1. QUÉ ES ESTE PROYECTO

**fce-plataform** es la evolución multi-tenant del FCE original de Korporis. Es un repositorio Next.js que implementa una **Ficha Clínica Electrónica genérica** capaz de servir a múltiples clínicas chilenas desde una sola base de código y una sola base de datos Supabase.

**Origen**: este repo es una **copia ajustada** de `korporis-fce`, refactorizado para ser parametrizable por clínica mediante:
- Registry de módulos en código (`src/lib/modules/registry.ts`)
- Configuración por clínica en DB (`clinicas_fce_config`)
- Catálogo universal de especialidades (`especialidades_catalogo`)

**Alcance**: cubre SOLO los módulos FCE (M1–M6). Agenda, pagos, chatbot y recordatorios viven en otros repos del ecosistema Synapta.

**Estado**: en construcción — Sprints legacy 0-4 completados. Plan de rediseño multi-modelo en curso (R1–R8). Sprints R2, R3 y R4 completados. Próximo: R5 (sistema de instrumentos).

---

## 2. ECOSISTEMA DE REPOSITORIOS

Hay **3 repos** compartiendo la misma DB Supabase `Synapta Product` (ref `vigyhfpwyxihrjiygfsa`):

| Repo | Rol actual | Dominio | Estado |
|---|---|---|---|
| `synapta` | Landing + onboarding + chatbot + panel admin + agenda | synapta.cl | Producción |
| `korporis-fce` | FCE legacy de Korporis (original) | fce.korporis.cl | Producción · será reemplazado por fce-plataform en R7-R8 |
| `fce-plataform` | **Este repo** — FCE genérico multi-clínica | fce.<slug>.cl (futuro) | En construcción |

**Crítico**: este repo SOLO gestiona módulos FCE. No agregar funcionalidad de agenda, pagos, chatbot o recordatorios aquí — eso pertenece a los otros repos.

**Fecha objetivo de migración Korporis → fce-plataform**: Sprint R7-R8 del plan de rediseño.

---

## 3. DOCUMENTACIÓN DE REFERENCIA

Leer EN ESTE ORDEN antes de implementar:

1. `CLAUDE.md` (este archivo) — reglas, patrones, arquitectura
2. `docs/plan-redisenio/00-vision-general.md` — visión del rediseño multi-modelo
3. `docs/plan-redisenio/04-criterios-tecnicos.md` — reglas no negociables
4. `docs/plan-redisenio/sprints/R{N}-*.md` — sprint en curso
5. `docs/schema-real.md` — mapa completo del schema actual de Synapta Product
6. `clinics/<slug>/CLAUDE.md` — contexto específico por clínica (korporis, nuvident, renata)

**Documentos legacy heredados** de korporis-fce (si aún existen en el repo):

6. `docs/plan-fce-korporis.md` — plan original FCE (fases, modelo de datos)
7. `docs/diseno-integral-fce.md` — requisitos clínicos y legales (Decreto 41, Ley 20.584, CIF, FHIR)
8. `docs/korporis-modelo.md` — tokens de color, datos confirmados cliente Korporis
9. `docs/korporis-informe.md` — informe del cliente (servicios, precios)

---

## 4. STACK TÉCNICO

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.3 |
| Lenguaje | TypeScript strict | ^5 |
| Estilos | Tailwind CSS v4 | ^4 |
| Backend / Auth / DB | Supabase | `@supabase/ssr ^0.10.2` · `@supabase/supabase-js ^2.103.0` |
| Deploy | Vercel | — |
| Formularios | react-hook-form + zod | ^7 · ^4 |
| UI / Animación | lucide-react · motion/react | ^1.8 · ^12 |
| Fechas | date-fns | ^4 |
| PDF | html2pdf.js | ^0.14 |
| Estilos merge | tailwind-merge · clsx | ^3 · ^2 |
| Testing | tsx (scripts de integración) | última |

---

## 5. PALETA DE COLORES — DINÁMICA DESDE DB

En la plataforma multi-tenant **los tokens `kp-*` NO son constantes**. Se inyectan como CSS variables desde el branding de cada clínica al montar el dashboard layout.

**Fuente en DB**: `clinicas.config.branding` (jsonb) — compartido con synapta-web y el chatbot, así la marca es consistente en todas las superficies.

**Claves esperadas en branding**:
```
navy           → maps to --kp-primary       (headings, fondos oscuros)
navy_deep      → maps to --kp-primary-deep  (Hero/sidebar)
primary        → maps to --kp-accent        (CTAs, botones, iconos)
primary_hover  → maps to --kp-primary-hover (hover de CTAs)
light_bg       → maps to --kp-accent-lt     (fondo de badges)
accent         → maps to --kp-secondary     (complementario)
logo_url       → imagen del logo
clinic_initials → iniciales para avatar fallback
clinic_short_name → nombre corto para UI
```

El mapeo vive en `src/lib/modules/registry.ts` (`mapBrandingToTokens()`).

**Tokens adicionales que NO vienen del branding** (siguen en globals.css como constantes):
```
surface-0        #F1F5F9   Fondo base
surface-1        #FFFFFF   Cards
surface-dark     #0B1120   Secciones oscuras
ink-1            #1E293B   Texto enfatizado
ink-2            #475569   Cuerpo
ink-3            #94A3B8   Secundario
ink-4            #CBD5E1   Placeholders
kp-border        #E2E8F0   Bordes estándar
kp-border-md     #CBD5E1   Bordes con mayor contraste
```

**Regla crítica**: componentes usan siempre `var(--kp-*)`. Nunca `text-teal-500`, nunca hex hardcoded. Nunca leer directamente `config.branding` en componentes — siempre vía `config.tokensColor` del provider.

---

## 6. 13 REGLAS INQUEBRANTABLES

1. **`npm run build` = 0 errores** después de CADA sprint/fase. No se avanza con build roto.
2. **Tokens `kp-*` solo vía CSS variables** — nunca colores Tailwind genéricos (`bg-teal-500` ❌), nunca hex hardcoded.
3. **TypeScript strict** — sin `any` implícitos. `any` explícito solo en helpers internos de logging.
4. **RLS habilitado en TODAS las tablas** que tocan datos de clínica.
5. **Filtrar por `id_clinica`** en toda query de datos clínicos (multi-tenant). Usar `getIdClinica(supabase, user.id)`.
6. **Audit log en toda operación de escritura** (tabla `logs_auditoria`).
7. **Contenido médico nunca se inventa** — datos confirmados o `[PENDIENTE]`.
8. **SOAP firmado = inmutable** (no editable después de firma).
9. **Hard-stop contraindicaciones** obligatorio antes de iniciar sesión de especialidades con `tieneContraindicaciones: true` (Masoterapia, Odontología, Podología).
10. **Server Components por defecto**, `'use client'` solo cuando sea necesario (formularios con estado, canvas de firma, etc.).
11. **Seguir los sprints en orden** (`docs/sprints.md`). No saltar. No mezclar.
12. **NUNCA modificar `registry.ts` para "adaptar a una clínica"** — el registry es universal. Para deshabilitar módulos en una clínica, se edita `clinicas_fce_config`.
13. **Especialidades en DB usan strings EXACTOS** con tilde y capitalización (`Kinesiología`, `Fonoaudiología`, `Masoterapia`, `Odontología`, etc.). El registry las tipa así, la tabla `especialidades_catalogo` las valida vía trigger, el código NUNCA escribe versiones normalizadas a DB.
14. **`profesionales.auth_id` NO tiene UNIQUE constraint.** Un auth_id puede mapear a N profesionales (médico con múltiples especialidades). Nunca usar `.eq('auth_id', userId).single()` sobre `profesionales` — puede retornar múltiples filas. Usar el helper `getProfesionalActivo()` de `src/lib/fce/profesional.ts`.
15. **Claude Code NO aplica migrations ni DDL sobre Supabase.** Genera los archivos SQL en `supabase/migrations/`, los presenta para revisión, y espera. Las migrations se aplican manualmente vía MCP Supabase o dashboard.
16. **Las prescripciones son inmutables post-firma.** Mismo patrón que SOAP y nota clínica. El trigger `trg_block_update_signed_presc` en `fce_prescripciones` bloquea UPDATE de campos clínicos cuando `firmado=true`. Los snapshots del profesional (nombre, RUT, registro, tipo, especialidad) se capturan en el momento de firma para garantizar integridad histórica.

---

## 7. ARQUITECTURA MULTI-TENANT EN 4 CAPAS

```
┌──────────────────────────────────────────────────────────┐
│ 1. CATÁLOGO (código, inmutable en runtime)               │
│    src/lib/modules/registry.ts                           │
│    - MODULE_REGISTRY: 6 módulos M1-M6                    │
│    - ESPECIALIDADES_REGISTRY: 10 especialidades          │
│    - mapBrandingToTokens(), validateConfig(), getDependentes() │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 2. CONFIGURACIÓN (Supabase, editable por admin+)         │
│    - Tabla clinicas_fce_config (módulos + especialidades)│
│    - Tabla especialidades_catalogo (10 filas activas)    │
│    - Lectura: clinicas.config.branding (solo READ)       │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 3. GUARDS (runtime)                                      │
│    src/lib/modules/guards.ts                             │
│    - requireModule()           → notFound()              │
│    - requireEspecialidad()     → notFound()              │
│    - requireAccesoFCE(rol)     → redirect(/login)        │
│    - assertModuleEnabled()     → ActionResult            │
│    - assertPuedeEscribir(rol)  → ActionResult            │
│    - assertPuedeFirmar(rol)    → ActionResult            │
│    - assertPuedeConfigurar(rol)→ ActionResult            │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 4. UI CONDICIONAL                                        │
│    - Sidebar filtra por modulosActivos                   │
│    - PatientActionNav filtra tabs por módulos activos    │
│    - BrandingInjector inyecta --color-kp-* desde DB     │
│    - Rutas de módulos inactivos → 404                    │
│    - Config FCE se gestiona desde synapta-admin (otro repo) │
└──────────────────────────────────────────────────────────┘
```

---

## 8. ESTRUCTURA DEL PROYECTO

```
src/
├── app/
│   ├── layout.tsx                        → Root layout (globals.css, fuentes)
│   ├── page.tsx                          → Redirect a /dashboard
│   ├── login/page.tsx                    → Login con Supabase Auth (Client Component)
│   ├── admin/                            → (Sprint 4) UI admin para config FCE
│   │   └── configuracion/page.tsx
│   └── dashboard/
│       ├── layout.tsx                    → Auth guard + ClinicaSessionProvider + BrandingInjector
│       ├── page.tsx                      → Dashboard principal (agenda diaria)
│       └── pacientes/
│           ├── page.tsx                  → Listado de pacientes (vista_pacientes_clinicos)
│           ├── nuevo/page.tsx            → Crear nuevo paciente (M1)
│           └── [id]/
│               ├── page.tsx              → Ficha resumen (redirige a /anamnesis)
│               ├── anamnesis/page.tsx    → M2: Anamnesis + Red Flags + Signos Vitales
│               ├── consentimiento/page.tsx → M5: Consentimiento informado + firma canvas
│               ├── auditoria/page.tsx    → M6: Auditoría (solo admin+)
│               ├── exportar-pdf/page.tsx → Exportar ficha a PDF
│               ├── fhir/page.tsx         → Vista FHIR R4
│               ├── editar/page.tsx       → Editar datos paciente (M1)
│               └── encuentro/[encuentroId]/
│                   ├── page.tsx          → Redirect al modelo correspondiente
│                   ├── rehab/page.tsx    → Modelo rehabilitación: SoapForm + EvalComponent (R7)
│                   └── clinico/page.tsx  → Modelo clínico general: NotaClinicaForm + InstrumentosPanel (R4)
│   └── actions/                          → Server Actions (lógica de negocio)
│       ├── patients.ts                   → CRUD pacientes, helpers auth/contexto
│       ├── anamnesis.ts                  → Anamnesis + signos vitales
│       ├── consentimiento.ts             → Consentimientos + firma canvas
│       ├── auditoria.ts                  → Logs auditoría (solo admin+)
│       ├── timeline.ts                   → Timeline clínico + resumen paciente
│       ├── exportar-pdf.ts               → Fetch completo para generación PDF
│       ├── encuentros.ts                 → createEncuentro (R3) — walk-in + check-in
│       ├── rehab/                        ← Acciones modelo rehabilitación (R7)
│       │   ├── soap.ts                   → getSoapNotes, upsertSoapNote, signSoapNote, getOrCreateEncounter
│       │   └── evaluacion.ts             → getEvaluaciones, upsertEvaluacion
│       └── clinico/
│           └── nota-clinica.ts           → getNotaClinica, upsertNotaClinica, signNotaClinica (R4)
├── components/
│   ├── ui/                               → Átomos: Button, Input, Card, Badge, Select,
│   │                                        Textarea, AlertBanner, SignatureBlock,
│   │                                        LoadingSpinner, LoadingPage
│   ├── layout/                           → Sidebar, TopBar, DashboardShell,
│   │                                        PatientHeader, BrandingInjector
│   ├── modules/                          → Módulos clínicos M1–M6 (NO rehab, NO clinico):
│   │   ├── PatientForm.tsx               → M1: Formulario identificación
│   │   ├── PatientList.tsx               → Lista pacientes con filtros
│   │   ├── AnamnesisForm.tsx             → M2: Anamnesis
│   │   ├── RedFlagsChecklist.tsx         → M2: Red flags clínicas
│   │   ├── VitalSignsPanel.tsx           → M2: Signos vitales
│   │   ├── OdontologiaEval.tsx           → M3: Evaluación odonto (futuro, para Nuvident)
│   │   ├── ClinicalTimeline.tsx          → M4/resumen: Timeline clínico
│   │   ├── SummaryPanel.tsx              → Panel resumen paciente
│   │   ├── ConsentManager.tsx            → M5: Gestor consentimientos
│   │   ├── AuditTimeline.tsx             → M6: Timeline auditoría
│   │   ├── AgendaTable.tsx               → Dashboard: Agenda diaria (lee vistas)
│   │   ├── FhirPreview.tsx               → Vista FHIR R4
│   │   └── PdfExportView.tsx             → Vista para exportación PDF
│   ├── rehab/                            ← Componentes modelo rehabilitación (R7)
│   │   ├── SoapForm.tsx                  → Formulario SOAP + firma
│   │   ├── CifMapper.tsx                 → Clasificación CIF
│   │   ├── KinesiologiaEval.tsx          → Evaluación kinesiología
│   │   ├── FonoaudiologiaEval.tsx        → Evaluación fonoaudiología
│   │   ├── MasoterapiaEval.tsx           → Evaluación masoterapia + hard-stop
│   │   ├── GenericEval.tsx               → Evaluación genérica (otras especialidades)
│   │   └── index.ts                      → Barrel exports
│   ├── clinico/                          ← Componentes modelo clinico_general (R4+)
│   │   ├── NotaClinicaForm.tsx           → Formulario nota clínica + firma + readOnly
│   │   └── InstrumentosPanel.tsx         → Panel lateral de instrumentos de valoración
│   └── shared/
│       ├── BodyMap.tsx                   → Mapa corporal interactivo
│       ├── EncuentroLauncher.tsx         → Botón iniciar atención (R3) — client component
│       └── ScaleSlider.tsx               → Escalas numéricas (dolor, función)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     → createBrowserClient (Client Components)
│   │   ├── server.ts                     → createServerClient con cookies
│   │   └── types.ts                      → Database type stub
│   ├── modules/                          ← Core de multi-tenant
│   │   ├── registry.ts                   → Catálogo inmutable + validaciones + mapBrandingToTokens + ModeloClinico
│   │   ├── config.ts                     → getClinicaConfig() con cliente inyectable
│   │   ├── guards.ts                     → requireModule, assertModuleEnabled, etc.
│   │   ├── modelos.ts                    → getModeloDeEspecialidad, getRutaEncuentro, getModulosDelModelo (R3)
│   │   └── provider.tsx                  → ClinicaSessionProvider + useClinicaSession
│   ├── constants.ts                      → Constantes clínica, Especialidad, Rol, PREVISIONES
│   ├── utils.ts                          → cn(), calculateAge(), formatRut (display)
│   ├── run-validator.ts                  → cleanRut, validateRut, formatRut
│   ├── validations.ts                    → Schemas Zod
│   ├── permissions.ts                    → canWrite(), canAccessFCE(), canSignSOAP()
│   ├── audit.ts                          → createAuditEntry() helper
│   └── fhir-mapper.ts                    → Mapeador FHIR R4
├── hooks/                                → (reservado)
├── types/
│   ├── index.ts                          → Re-exports
│   ├── patient.ts                        → Patient, PacienteClinico, CitaAgenda
│   ├── encounter.ts                      → Encounter
│   ├── anamnesis.ts                      → Anamnesis, VitalSigns
│   ├── evaluation.ts                     → Evaluation
│   ├── soap.ts                           → SoapNote
│   ├── consent.ts                        → Consent
│   ├── audit.ts                          → AuditEntry, AuditAction
│   ├── cif.ts                            → CIF types
│   ├── practitioner.ts                   → Practitioner
│   ├── nota-clinica.ts                   → NotaClinica (fce_notas_clinicas) (R4)
│   └── html2pdf.d.ts                     → Type declaration para html2pdf.js
clinics/
├── korporis/CLAUDE.md                    → Contexto Korporis
├── nuvident/CLAUDE.md                    → Contexto Nuvident
└── renata/CLAUDE.md                      → Contexto Renata — clínica piloto modelo clinico_general (R4)
docs/
├── plan-multi-tenant.md                  → Arquitectura v2
├── sprints.md                            → Roadmap 5 sprints
├── schema-real.md                        → Schema de Synapta Product
├── sprint-1-report.md                    → Reporte Sprint 1 (completado)
└── [documentos legacy heredados]
scripts/
├── test-sprint-1.ts                      → Tests de integración del Sprint 1 (8 casos)
└── onboard-clinica.ts                    → CLI para agregar clínicas nuevas
supabase/
└── migrations/
    ├── 20260417_01_especialidades_catalogo.sql  → Catálogo + trigger
    └── 20260417_02_clinicas_fce_config.sql      → Config FCE + RLS + seed
```

---

## 9. MÓDULOS CLÍNICOS (M1–M6)

| ID | Label | Tablas DB | Requiere especialidad | Obligatorio |
|---|---|---|:---:|:---:|
| M1_identificacion | Identificación de paciente (Decreto 41 MINSAL) | `pacientes` | no | **sí** |
| M2_anamnesis | Anamnesis + Red Flags + Signos Vitales | `fce_anamnesis`, `fce_signos_vitales` | no | no |
| M3_evaluacion | Evaluación por especialidad | `fce_evaluaciones` | **sí** | no |
| M4_soap | Evolución SOAP + CIF Mapper | `fce_notas_soap`, `fce_encuentros` | **sí** | no |
| M5_consentimiento | Consentimiento informado (Ley 20.584) | `fce_consentimientos` | no | no |
| M6_auditoria | Auditoría (append-only) | `logs_auditoria` | no | **sí** |
| M7_prescripciones | Prescripciones e Indicaciones | `fce_prescripciones`, `medicamentos_catalogo` | no | no |

**Dependencias**: M2 → M1 · M3 → M2 · M4 → M3 · M5 → M1 · M6 → M1 · M7 → M1

---

## 10. ESPECIALIDADES (10 en catálogo)

Todas las especialidades listadas aquí están en `especialidades_catalogo` con `activa=true`.

| Código (EXACTO en DB) | tieneContraindicaciones | tieneEscalaFuncional | Estado |
|---|:---:|:---:|---|
| Kinesiología | no | sí | estable |
| Fonoaudiología | no | sí | estable |
| Masoterapia | **sí** (hard-stop) | no | estable |
| Administración Clínica | no | no | estable |
| Odontología | **sí** (hard-stop) | no | beta (para Nuvident) |
| Medicina General | no | no | roadmap |
| Psicología | no | no | roadmap |
| Nutrición | no | no | roadmap |
| Terapia Ocupacional | no | sí | roadmap |
| Podología | **sí** (hard-stop) | no | roadmap |

---

## 11. ARQUITECTURA SUPABASE — INTERACCIÓN COMPLETA CON DB

### 11.1 Clientes Supabase

| Archivo | Función exportada | Cuándo usar |
|---|---|---|
| `src/lib/supabase/client.ts` | `createClient()` | Client Components (`'use client'`). Usa `createBrowserClient` de `@supabase/ssr`. Ejemplo: login page, firma canvas. |
| `src/lib/supabase/server.ts` | `createClient()` (async) | Server Components, Server Actions, layouts. Usa `createServerClient` con cookies de Next.js. **Siempre `await createClient()`**. |

**Regla crítica**: en Server Components y layouts usar siempre `supabase.auth.getUser()` (verifica JWT con servidor), **NUNCA** `supabase.auth.getSession()` (solo lee cookie local, no valida).

### 11.2 Flujo de autenticación

```
[/login/page.tsx]          → createBrowserClient → supabase.auth.signInWithPassword()
                             → Supabase escribe cookie de sesión en el browser
[dashboard/layout.tsx]     → createServerClient → supabase.auth.getUser()
                             → Si no autenticado → redirect("/login")
                             → Si rol === "recepcionista" → redirect("/login?error=sin-acceso")
                             → Fetch admin_users + clinicas_fce_config
                             → <ClinicaSessionProvider> envuelve el árbol
                             → <BrandingInjector> inyecta CSS vars de tokensColor
[Server Actions]           → createServerClient → supabase.auth.getUser()
                             → requireAuth() interno en cada action
```

### 11.3 Tablas Supabase — schema real de Synapta Product

#### Tablas de identidad y configuración

| Tabla | Descripción | Columnas clave | RLS |
|---|---|---|:---:|
| `auth.users` | Usuarios Supabase Auth | `id` (uuid) | N/A |
| `admin_users` | Vincula auth.uid con clínica y rol | `auth_id`, `id_clinica`, `rol` (superadmin\|director\|admin\|profesional\|recepcionista), `nombre`, `email`, `activo` | Sí |
| `profesionales` | Datos del profesional clínico | `id`, `auth_id`, `id_clinica`, `nombre`, `especialidad` (texto libre — NO usar para filtros FCE), `rut`, `color_agenda`, `activo`, `es_agendable`, `recibe_notificaciones` | Sí |
| `clinicas` | Configuración de la clínica | `id`, `nombre`, `slug` (unique), `config` (jsonb enorme con branding, chatbot, booking_flow, etc.), `plan`, `status`, `activa` | Sí |
| `clinicas_fce_config` | **Config FCE específica** | `id_clinica` (PK/FK), `modulos_activos` (text[]), `especialidades_activas` (text[]), `config_modulos` (jsonb) | Sí |
| `especialidades_catalogo` | **Catálogo universal FCE** | `codigo` (PK), `label`, `activa`, `orden` | Sí (SELECT público autenticados) |
| `pacientes` | Ficha de identificación del paciente (M1) | `id`, `id_clinica`, `nombre`, `apellido_paterno`, `apellido_materno`, `rut`, `fecha_nacimiento`, `direccion` (jsonb), `prevision` (jsonb), `contacto_emergencia` (jsonb), todos nullable excepto `id`, `updated_at` | Sí |

#### Tablas FCE

| Tabla | Descripción | `id_clinica` | Trigger valida especialidad |
|---|---|:---:|:---:|
| `fce_encuentros` | Sesión clínica (check-in o walk-in) | ✅ | **sí** (contra especialidades_catalogo) |
| `fce_anamnesis` | Historia clínica del paciente (M2) — 1 por paciente | ✅ | no |
| `fce_signos_vitales` | Registro de signos vitales (M2) | nullable (requerido en nuevos) | no |
| `fce_evaluaciones` | Evaluación clínica por especialidad (M3) | ❌ (filtrar vía JOIN) | **sí** |
| `fce_notas_soap` | Notas SOAP + CIF (M4) | ❌ (filtrar vía JOIN) | no |
| `fce_consentimientos` | Consentimientos informados (M5) | ✅ | no |
| `instrumentos_valoracion` | Catálogo universal de instrumentos clínicos (R2) | N/A (compartido) | no |
| `instrumentos_aplicados` | Resultados de instrumentos aplicados a pacientes (R2) | ✅ | no |
| `fce_notas_clinicas` | Notas clínicas libres modelo clinico_general (R2) | ✅ | no (trigger inmutabilidad post-firma) |
| `fce_prescripciones` | Prescripciones e indicaciones módulo M7 (R9) | ✅ | no (trigger inmutabilidad + folio correlativo) |
| `medicamentos_catalogo` | Catálogo universal de medicamentos para autocompletado (R9) | N/A (global) | no |

#### Tablas de auditoría, agenda y vistas

| Tabla / Vista | Descripción |
|---|---|
| `logs_auditoria` | Registro append-only. Campos: `actor_id`, `actor_tipo` (admin\|profesional\|bot\|sistema\|paciente), `accion`, `tabla_afectada`, `registro_id`, `id_clinica` (nullable), `id_paciente` (nullable, con índice) |
| `vista_pacientes_clinicos` | Vista: pacientes con datos de última atención. **Filtrar siempre por `id_clinica`** |
| `vista_agenda_diaria` | Vista: citas del día con datos de paciente y profesional. Incluye `id_encuentro`, `encuentro_status` |

#### Tablas de otros repos (NO tocar desde fce-plataform)

```
citas, disponibilidad, plantillas_horario, recordatorio_logs  → synapta (agenda)
pagos                                                          → synapta (Stripe/MP)
conversaciones, sesiones_chat                                  → synapta (chatbot)
tickets, ticket_mensajes                                       → synapta-admin (soporte)
```

Si FCE necesita consultar una cita (ej: qué cita originó un encuentro), usar FK `fce_encuentros.id_cita` → `citas.id` pero **solo READ**. Nunca INSERT/UPDATE sobre estas tablas desde este repo.

### 11.4 Roles (admin_users.rol check constraint)

```
superadmin       Synapta staff con acceso cross-clínica
director         Dueño/responsable clínico
admin            Administrador de clínica (gestiona equipo, config)
profesional      Kinesiólogo, fono, maso, dentista, etc. — firma SOAP
recepcionista    Agenda y atención — NO accede a FCE
```

**Control de acceso FCE** (ver `src/lib/modules/registry.ts`):
- `ROLES_CON_ACCESO_FCE`: superadmin, director, admin, profesional
- `ROLES_QUE_PUEDEN_ESCRIBIR`: superadmin, director, admin, profesional
- `ROLES_QUE_PUEDEN_FIRMAR`: solo profesional
- `ROLES_QUE_CONFIGURAN`: superadmin, director, admin

### 11.5 Schema `fce_notas_soap` (columnas exactas)

```
id, id_encuentro, id_paciente,
subjetivo, objetivo, analisis_cif, plan,
intervenciones, tareas_domiciliarias, proxima_sesion,
firmado, firmado_at, firmado_por, created_at
```

**NO tiene**: `created_by`, `updated_at`, `id_clinica`. El autor queda en `firmado_por` al firmar. Notas inmutables una vez firmadas.

### 11.6 Schema `fce_evaluaciones` (columnas exactas)

```
id, id_encuentro, id_paciente, especialidad, sub_area,
data, contraindicaciones_certificadas, created_by, created_at
```

**NO tiene**: `id_clinica`. La columna `especialidad` es validada por trigger contra catálogo.

### 11.6b Schema `instrumentos_valoracion` (columnas exactas, R2)

```
id, codigo (UNIQUE), nombre, descripcion, version,
especialidades (text[]), tipo_renderer ('escala_simple'|'componente_custom'),
schema_items (jsonb), componente_id, interpretacion (jsonb),
activo, orden, created_at, updated_at
```

**RLS**: SELECT cualquier autenticado, manage solo superadmin. Catálogo compartido entre clínicas.

### 11.6c Schema `instrumentos_aplicados` (columnas exactas, R2)

```
id, id_clinica, id_paciente, id_encuentro (nullable),
id_instrumento (FK instrumentos_valoracion),
respuestas (jsonb), puntaje_total (numeric), interpretacion (text),
notas, aplicado_por, aplicado_at,
mostrar_en_timeline (boolean, default true), created_at
```

**Tiene `id_clinica`**. RLS: tenant isolation. Puntaje e interpretación se calculan server-side.

### 11.6d Schema `fce_notas_clinicas` (columnas exactas, R2)

```
id, id_clinica, id_paciente, id_encuentro,
motivo_consulta, contenido (NOT NULL),
diagnostico, cie10_codigos (text[]),
plan, proxima_sesion,
firmado, firmado_at, firmado_por,
created_by, created_at, updated_at
```

**Tiene `id_clinica`**. RLS: tenant isolation. Trigger `trg_block_update_signed_nota` bloquea UPDATE de campos clínicos cuando `firmado=true`.

### 11.7 RLS — solo las tablas CON `id_clinica` la requieren en INSERT

Obtener con `getIdClinica(supabase, user.id)`. Si retorna null → hard-fail con mensaje al usuario, no insertar.

### 11.8 `admin_users` — lookup de id_clinica + rol

Patrón canónico:

```typescript
const { data } = await supabase
  .from("admin_users")
  .select("id_clinica, rol, nombre, activo")
  .eq("auth_id", userId)
  .eq("activo", true)
  .single();
```

### 11.9 `clinicas_fce_config` — lectura con helper del paquete v2

```typescript
import { getClinicaConfig } from "@/lib/modules/config";

const config = await getClinicaConfig(idClinica, supabase);
// config = { idClinica, nombreDisplay, slug, clinicInitials, logoUrl,
//            modulosActivos, especialidadesActivas, tokensColor, configModulos, updatedAt }
// o null si no existe
```

**Firma refactorizada en Sprint 1** (opción B): acepta cliente Supabase inyectable. Por defecto usa el cliente SSR de cookies.

### 11.10 Migrations aplicadas (documentación histórica)

Las tablas YA EXISTEN en Synapta Product. **NUNCA usar `apply_migration` ni DDL sin coordinación explícita con el usuario humano.**

| Archivo | Qué hace | Estado |
|---|---|---|
| `20260411_create_fce_consentimientos.sql` (heredado de korporis-fce) | Crea `fce_consentimientos` con RLS | Aplicado antes de este repo |
| `20260411_add_id_paciente_auditoria.sql` (heredado) | Agrega `id_paciente` a `logs_auditoria` + índice | Aplicado antes de este repo |
| `20260417_01_especialidades_catalogo.sql` | Catálogo + trigger + reemplaza check viejo | Aplicado 2026-04-17 |
| `20260417_02_clinicas_fce_config.sql` | Config FCE + RLS + seed Korporis/Nuvident | Aplicado 2026-04-17 |
| `20260421_01_instrumentos_valoracion.sql` | Catálogo universal de instrumentos clínicos + RLS | Aplicado 2026-04-21 (R2) |
| `20260421_02_instrumentos_aplicados.sql` | Resultados de instrumentos aplicados + RLS tenant + 3 índices | Aplicado 2026-04-21 (R2) |
| `20260421_03_fce_notas_clinicas.sql` | Notas clínicas modelo clinico_general + trigger inmutabilidad + RLS | Aplicado 2026-04-21 (R2) |
| `20260421_04_add_enfermeria_catalogo.sql` | INSERT Enfermería en especialidades_catalogo | Aplicado 2026-04-21 (R2) |
| `20260421_05_seed_instrumentos.sql` | 10 instrumentos: 8 escala_simple + 2 componente_custom (Braden y EVA validados) | Aplicado 2026-04-21 (R2) |
| `20260422_01_medicamentos_catalogo.sql` | Catálogo universal de medicamentos (módulo M7) + RLS + índices + GIN full-text | Pendiente aplicar (R9) |
| `20260422_02_alter_profesionales_prescripcion.sql` | ALTER profesionales: agrega numero_registro, tipo_registro, puede_prescribir | Pendiente aplicar (R9) |
| `20260422_03_fce_prescripciones.sql` | Tabla prescripciones + folio correlativo (trigger + advisory lock) + inmutabilidad + RLS | Pendiente aplicar (R9) |
| `20260422_04_seed_modulo_m7.sql` | UPDATE clinicas_fce_config: activa M7 en Renata y Nuvident | Pendiente aplicar (R9) |

---

## 12. PATRONES DE CÓDIGO CONSOLIDADOS

### 12.1 Campos nullable en Patient

Todos los campos del tipo `Patient` son `string | null`. Patrón de display:

```typescript
patient.nombre ?? "Sin registro"
patient.rut ?? "—"
patient.prevision?.tipo ?? "Sin registro"
patient.direccion?.region ?? "Sin registro"

// fullName null-safe
[patient.nombre, patient.apellido_paterno, patient.apellido_materno]
  .filter(Boolean).join(" ")
```

### 12.2 calculateAge — acepta null

```typescript
// src/lib/utils.ts
calculateAge(fecha: Date | string | null | undefined): number | null

// Display:
const age = calculateAge(patient.fecha_nacimiento);
age !== null ? `${age} años` : "Sin registro"
```

### 12.3 formatRut — acepta null

```typescript
// src/lib/run-validator.ts — exports:
cleanRut, validateRut, formatRut
// (aliases: cleanRun, validateRun, formatRun para compatibilidad)
formatRut(null)  // → "—"
```

### 12.4 logAudit — patrón canónico en server actions

```typescript
async function logAudit(
  supabase: any, userId: string,
  accion: string, tablaAfectada: string, registroId: string,
  idClinica?: string | null, idPaciente?: string | null
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional", // admin | profesional | bot | sistema | paciente
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch { /* no bloquea el flujo principal */ }
}
```

### 12.5 requireAuth — patrón en cada server action

```typescript
async function requireAuth() {
  const supabase = await createClient();  // server client con cookies
  const { data: { user }, error } = await supabase.auth.getUser(); // NO getSession()
  if (error || !user) redirect("/login");
  return { supabase, user };
}
```

### 12.6 ActionResult — tipo de respuesta estándar

```typescript
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### 12.7 Fetch paralelo con Promise.all

Siempre usar `Promise.all` para queries independientes en Server Actions:

```typescript
const [idClinica, profesionalId] = await Promise.all([
  getIdClinica(supabase, user.id),
  getProfesionalId(supabase, user.id),
]);
```

### 12.8 Zona horaria Santiago

Siempre usar `America/Santiago` para fechas comparadas con la DB:

```typescript
const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
// → "YYYY-MM-DD"
```

### 12.9 Especialidad — NO normalizar antes de escribir a DB

⚠️ **Bug detectado en korporis-fce y fixeado**: el patrón histórico normalizaba `"Kinesiología"` → `"kinesiologia"` para hacer matching con el tipo TS. Pero el string normalizado se escribía a `fce_encuentros.especialidad` y `fce_evaluaciones.especialidad`, lo cual el trigger del catálogo rechaza.

**Patrón correcto** (aplicado en korporis-fce, pendiente de replicar aquí según sprint):

```typescript
// profesionales.especialidad en DB: "Kinesiología" (con tilde)
const rawEsp = prof.especialidad as string;

// Valor para DB — SIN normalizar, EXACTAMENTE como está en especialidades_catalogo.codigo
const especialidadDB = rawEsp;

// Valor normalizado SOLO para lookups internos del tipo TS o routing
const especialidadInternal = rawEsp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// INSERT a fce_encuentros o fce_evaluaciones usa SIEMPRE especialidadDB
await supabase.from("fce_encuentros").insert({
  especialidad: especialidadDB,  // ✅ correcto
  // especialidad: especialidadInternal,  // ❌ incorrecto, trigger lo rechaza
  ...
});
```

**Regla**: nunca escribir un string normalizado a `especialidad` de cualquier tabla FCE. Siempre usar el codigo exacto del catálogo.

### 12.10 Patrón canónico — `dashboard/layout.tsx` (Sprint 2+)

```typescript
import { requireAccesoFCE } from "@/lib/modules/guards";
import { getClinicaConfig } from "@/lib/modules/config";
import { ClinicaSessionProvider } from "@/lib/modules/provider";
import type { Rol } from "@/lib/modules/registry";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  // Fetch admin_users (rol autoritativo) + profesionales (display) en paralelo
  const [adminRes, profesionalRes] = await Promise.all([
    supabase.from("admin_users")
      .select("id_clinica, rol, nombre, activo")
      .eq("auth_id", user.id).single(),
    supabase.from("profesionales")
      .select("nombre, especialidad")
      .eq("auth_id", user.id).maybeSingle(),
  ]);

  const adminRow = adminRes.data;
  if (!adminRow || !adminRow.activo) redirect("/login?error=sin-perfil");

  const rol = adminRow.rol as Rol;
  requireAccesoFCE(rol); // redirect si recepcionista

  const config = await getClinicaConfig(adminRow.id_clinica, supabase);
  if (!config) redirect("/login?error=sin-config");

  return (
    <ClinicaSessionProvider session={{ config, rol, userId: user.id }}>
      {children}
    </ClinicaSessionProvider>
  );
}
```

**Notas críticas**:
- `rol` se lee SIEMPRE de `admin_users.rol`, nunca de `profesionales.rol` (esa columna no existe).
- `requireAccesoFCE` usa el tipo `Rol` del registry (5 valores). NO usar `canAccessFCE` de `permissions.ts` (usa el tipo viejo con `"recepcion"`).
- `profesionales` se fetcha solo para datos de display (nombre, especialidad para sidebar). El `id_clinica` y el `rol` autorizativo vienen de `admin_users`.

### 12.11 Guard de módulo en ruta (Sprint 2+)


```typescript
import { requireModule } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";

export default async function AnamnesisPage({ params }: ...) {
  const { config } = await getClinicaConfigFromSession();
  requireModule(config, "M2_anamnesis"); // notFound() si inactivo
  // ... resto del fetch y render
}
```

**Patrón aplicado en Sprint 2**:
- `anamnesis/page.tsx` → `requireModule(config, "M2_anamnesis")`
- `evaluacion/page.tsx` → `requireModule(config, "M3_evaluacion")`
- `evolucion/page.tsx` → `requireModule(config, "M4_soap")`
- `consentimiento/page.tsx` → `requireModule(config, "M5_consentimiento")`
- `auditoria/page.tsx` → `requireModule(config, "M6_auditoria")`

**`getClinicaConfigFromSession()`** hace su propio fetch (auth + admin_users + clinicas_fce_config). Es independiente del layout — los Server Components en page.tsx no reciben datos del layout directamente.

### 12.12 Router de encuentro por modelo (R3)

`getModeloDeEspecialidad` y `getRutaEncuentro` viven en `src/lib/modules/modelos.ts`.

```typescript
import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";

// Al crear un encuentro, determinar ruta de destino:
const modelo = getModeloDeEspecialidad(especialidad); // → "rehabilitacion" | "clinico_general" | "ninguno"
const url = getRutaEncuentro(modelo, patientId, encuentroId);
// → /dashboard/pacientes/{id}/encuentro/{enc}/rehab
// → /dashboard/pacientes/{id}/encuentro/{enc}/clinico
```

`createEncuentro` (en `src/app/actions/encuentros.ts`) es el punto de entrada desde `EncuentroLauncher`. Realiza walk-in o check-in y retorna `{ encuentroId, modelo }`.

### 12.13 Nota clínica (R4) — patrón de server actions

Las acciones para `fce_notas_clinicas` están en `src/app/actions/clinico/nota-clinica.ts`:

```typescript
// Una nota por encuentro (relación 1:1)
const result = await getNotaClinica(encuentroId);          // maybeSingle
const result = await upsertNotaClinica(encuentroId, patientId, formData); // INSERT o UPDATE si no firmada
const result = await signNotaClinica(notaId, patientId);   // firma + finaliza encuentro
```

**Invariantes críticas**:
- `upsertNotaClinica` hace upsert por `id_encuentro` (no por `id`) — un encuentro tiene max 1 nota.
- `signNotaClinica` actualiza `fce_notas_clinicas.firmado=true` + `fce_encuentros.status='finalizado'` en la misma acción.
- El trigger DB `trg_block_update_signed_nota` bloquea UPDATE de campos clínicos post-firma a nivel de DB.
- `NotaClinicaForm` recibe `readOnly=true` cuando `nota.firmado=true` o `encuentro.status='finalizado'`.

---

## 13. CONTROL DE ACCESO

### 13.1 Guards en código (`src/lib/modules/guards.ts`)

| Función | Uso | Retorna |
|---|---|---|
| `requireModule(config, moduleId)` | Server Component | throw `notFound()` si inactivo |
| `requireEspecialidad(config, esp)` | Server Component | throw `notFound()` si inactiva |
| `requireAccesoFCE(rol)` | Layout/Server Component | `redirect("/login")` si sin acceso |
| `assertModuleEnabled(config, moduleId)` | Server Action | `ActionResult<never>` con error |
| `assertPuedeEscribir(rol)` | Server Action | `ActionResult<never>` con error |
| `assertPuedeFirmar(rol)` | Server Action | `ActionResult<never>` con error |
| `assertPuedeConfigurar(rol)` | Server Action (admin only) | `ActionResult<never>` con error |

### 13.2 Permisos legacy (`src/lib/permissions.ts`, heredado de korporis-fce)

```typescript
// Roles: "profesional" | "recepcion" | "admin" (VIEJO — usar los 5 de registry.ts)
// Especialidades: "kinesiologia" | "fonoaudiologia" | "masoterapia" (VIEJO — normalizado)

canWrite(ctx, moduloEspecialidad)     // admin: cualquier; profesional: solo su esp
canAccessFCE(ctx)                     // recepcion = false; resto = true (¡BUG: usa "recepcion" no "recepcionista"!)
canSignSOAP(ctx, moduloEspecialidad)  // solo profesional de esa especialidad
```

⚠️ **`canAccessFCE` de `permissions.ts` NO debe usarse en código nuevo.** Usa `"recepcion"` (valor viejo) en lugar de `"recepcionista"` (valor real de DB). Desde Sprint 2, el layout usa `requireAccesoFCE(rol)` de `guards.ts`.

Este archivo convive hasta que los server actions que lo usan sean migrados (Sprint 3+).

---

## 14. FLUJO DE DATOS POR SERVER ACTION

### 14.1 `patients.ts` — CRUD pacientes y helpers de contexto

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `requireAuth()` | `auth.users` | — | `getUser()`, redirect si falla |
| `getIdClinica(supabase, userId)` | `admin_users` | — | `.eq("auth_id", userId).single()` — null = hard-fail |
| `getProfesionalId(supabase, authId)` | `profesionales` | — | `.eq("auth_id", authId).maybeSingle()` |
| `getUserContext(supabase, userId)` | `admin_users` + `profesionales` | — | Fetch paralelo. **OJO**: normaliza especialidad para uso interno. NO escribir el valor normalizado a DB. |
| `getPatients()` | `admin_users`, `vista_pacientes_clinicos` | — | Filtra por `id_clinica`, ordena por `ultima_atencion` desc |
| `getAgendaDiaria()` | `admin_users`, `profesionales`, `vista_agenda_diaria` | — | Filtra por clínica + fecha Santiago |
| `getPatientById(id)` | `pacientes` | `logs_auditoria` | Audit: accion="read" |
| `createPatient(formData)` | `admin_users` | `pacientes`, `logs_auditoria` | Valida Zod, formatea RUT. Error 23505 = RUT duplicado |
| `updatePatient(id, formData)` | — | `pacientes`, `logs_auditoria` | Actualiza `updated_at`, formatea RUT |

### 14.2 `anamnesis.ts` — M2

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getAnamnesis(patientId)` | `fce_anamnesis` | — | `.maybeSingle()` |
| `upsertAnamnesis(patientId, formData)` | `fce_anamnesis`, `admin_users`, `profesionales` | `fce_anamnesis`, `logs_auditoria` | Busca existente → UPDATE o INSERT. INSERT agrega `created_by` + `id_clinica` |
| `getLatestVitalSigns(patientId)` | `fce_signos_vitales` | — | Último por `recorded_at` desc |
| `saveVitalSigns(patientId, formData)` | `profesionales` | `fce_signos_vitales`, `logs_auditoria` | `id_encuentro: null` en M2 |

### 14.3 `actions/rehab/evaluacion.ts` — M3 (rehab)

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getEvaluaciones(patientId)` | `fce_evaluaciones` | — | Todas, desc |
| `upsertEvaluacion(patientId, especialidad, subArea, data)` | `fce_evaluaciones`, `profesionales` | `fce_evaluaciones`, `logs_auditoria` | Upsert por `(id_paciente, especialidad, sub_area)`. **`especialidad` debe ser el código EXACTO del catálogo**. `id_clinica` ausente (tabla no la tiene). `data` es jsonb libre |

### 14.4 `actions/rehab/soap.ts` — M4 (rehab)

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getSoapNotes(patientId)` | `fce_notas_soap` | — | Todas, desc por `created_at` |
| `upsertSoapNote(patientId, formData, noteId?)` | `profesionales`, `admin_users`, `fce_encuentros`, `fce_notas_soap` | `fce_encuentros`, `fce_notas_soap`, `logs_auditoria` | Si `noteId`: UPDATE (si no firmado). Si no: llama `getOrCreateEncounter` |
| `signSoapNote(noteId, patientId)` | `profesionales`, `fce_notas_soap` | `fce_notas_soap`, `fce_encuentros`, `logs_auditoria` | `firmado=true`, `firmado_por=profesionales.id`. Cambia `fce_encuentros.status` a "finalizado" |
| `getOrCreateEncounter(...)` | `fce_encuentros` | `fce_encuentros` | 1) Busca encuentro "planificado" con `id_cita` de hoy. 2) Si no, crea walk-in "en_progreso". **`especialidad` debe ser código EXACTO del catálogo** |

**Lógica de encuentros**:
- Check-in por agenda → encuentra `fce_encuentros.status="planificado"` con `id_cita`, transiciona a `"en_progreso"`
- Walk-in (sin agenda) → inserta nuevo encuentro `status="en_progreso"`, `id_cita=null`
- Al firmar SOAP → el encuentro pasa a `status="finalizado"`

### 14.5 `consentimiento.ts` — M5

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getConsentimientos(patientId)` | `fce_consentimientos` | — | Todos, desc |
| `createConsentimiento(patientId, formData)` | `fce_consentimientos`, `admin_users`, `profesionales` | `fce_consentimientos`, `logs_auditoria` | Auto-versiona por `tipo`: `nextVersion = max + 1` |
| `signConsentimiento(consentId, patientId, firmaDataUrl)` | `profesionales` | `fce_consentimientos`, `logs_auditoria` | Valida `data:image/`. Escribe `firma_paciente` + `firma_profesional`. Solo si `firmado = false` |

### 14.6 `auditoria.ts` — M6

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getAuditLogs(filter)` | `admin_users`, `logs_auditoria` | — | `requireAdmin()`: verifica rol admin+ o redirect. Máx 200 registros. Filtros: `id_paciente`, `accion`, `desde/hasta` |

### 14.9 `prescripciones.ts` — M7 (R10)

| Función | Tablas leídas | Tablas escritas | Notas |
|---|---|---|---|
| `getPrescripcionesByPatient(patientId)` | `fce_prescripciones` | — | RLS filtra por tenant. Orden `created_at` desc |
| `getPrescripcionById(prescripcionId)` | `fce_prescripciones` | — | `.single()`. Error si no existe |
| `searchMedicamentos(query)` | `medicamentos_catalogo` | — | Proxy de `buscarMedicamentos`. Mínimo 2 chars |
| `createAndSignPrescripcion(input)` | `admin_users`, `fce_encuentros`, `profesionales` | `fce_prescripciones`, `logs_auditoria` | Validación ordenada: schema → módulo → rol → puede_prescribir → encuentro → snapshot → INSERT firmado=true |

**Orden de validación en `createAndSignPrescripcion`**:
1. `PrescripcionInputSchema.safeParse(input)` — schema primero
2. `admin_users` fetch → `idClinica` + `rol` (fuente autoritativa)
3. `assertModuleEnabled(config, "M7_prescripciones")`
4. `assertPuedeFirmar(rol)` — guard de rol
5. `getProfesionalActivo(supabase, user.id, idClinica)` + check `puede_prescribir`
6. Validación de encuentro (3 checks)
7. `buildProfesionalSnapshot(profesional)` → snapshot del profesional
8. INSERT con `id_clinica: idClinica` (de admin_users, NO de profesional)
9. `logAudit` + `revalidatePath`

### 14.10 `timeline.ts` — timeline clínico unificado

Fetch en paralelo de 5 tablas: `fce_notas_soap`, `fce_evaluaciones`, `fce_signos_vitales`, `fce_consentimientos`, `fce_anamnesis`. Luego batch lookup de nombres en `profesionales`. Construye `TimelineEntry[]` + `PatientSummary`.

### 14.8 `exportar-pdf.ts` — datos completos para PDF

Fetch en paralelo de: `pacientes`, `admin_users`, `fce_anamnesis`, `fce_signos_vitales`, `fce_evaluaciones` (últimas 5), `fce_notas_soap` (últimas 3), `fce_consentimientos`, `clinicas` (branding). Registra `accion="exportar_ficha"` en `logs_auditoria`.

---

## 15. HELPERS DE CONTEXTO REUTILIZABLES

### 15.1 En `patients.ts` (heredados de korporis-fce)

```typescript
export async function getIdClinica(supabase, userId): Promise<string | null>
export async function getProfesionalId(supabase, authId): Promise<string | null>
export async function getUserContext(supabase, userId): Promise<UserContext | null>
```

### 15.2 En `src/lib/modules/` (nuevos del paquete v2)

```typescript
// config.ts
export async function getClinicaConfig(idClinica, supabase?): Promise<ClinicaConfig | null>
export async function getClinicaConfigFromSession(): Promise<ClinicaConfig | null>
export function isModuleEnabled(config, moduleId): boolean
export function isEspecialidadEnabled(config, codigo): boolean

// registry.ts
export function mapBrandingToTokens(branding): FceTokens
export function validateConfig(modulos, especialidades): { ok, errores }
export function getDependentes(moduleId): ModuleId[]

// guards.ts
export function requireModule(config, moduleId): void  // throws notFound
export function requireEspecialidad(config, codigo): void
export function requireAccesoFCE(rol): void
export function assertModuleEnabled(config, moduleId): ActionResult
// + assertPuedeEscribir, assertPuedeFirmar, assertPuedeConfigurar

// provider.tsx
export function ClinicaSessionProvider({ session, children })
export function useClinicaSession(): ClinicaSession  // hook
```

### 15.3 En `src/lib/fce/profesional.ts` (nuevo en Sprint post-4)

```typescript
// Retorna todos los perfiles del usuario para una clínica, ordenados por created_at ASC
export async function getProfesionalesDelUsuario(
  supabase: SupabaseClient, authId: string, idClinica?: string
): Promise<ProfesionalPerfil[]>

// Retorna el perfil activo (primero por created_at). Retorna null si no tiene perfil.
// TODO(fase-2): agregar selector de perfil activo en UI
export async function getProfesionalActivo(
  supabase: SupabaseClient, authId: string, idClinica?: string
): Promise<ProfesionalPerfil | null>
```

Siempre pasar `idClinica` cuando se llama desde dentro del dashboard para evitar
confusión entre clínicas si el usuario tiene perfiles en múltiples clínicas.

---

## 16. CONVENCIONES DB — FUENTE DE VERDAD

**No cambiar sin verificar schema real vía MCP.**

### 16.1 Tabla `pacientes`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna identificación: `rut` (NO `run`)
- Todos los campos son `nullable` — usar `?? "Sin registro"` en display

### 16.2 Tabla `profesionales`
- Columna nombre: `nombre` (singular, NO `nombres`)
- Columna apellidos: **NO existe** `apellidos` — solo `nombre` completo (ver schema-real.md)
- Columna especialidad: **texto libre sin validación**. Ej: Korporis tiene `"Kinesiología"`, Nuvident tiene `"Odontología general y estética"`. **NO usar este campo para filtros FCE** — usar catálogo.

### 16.2b Tabla `clinicas` — columna `tipo_clinica` (nueva)

La tabla `clinicas` tiene ahora una columna `tipo_clinica text` (nullable). Valores actuales:
- Korporis: `multidisciplinaria_rehabilitacion`
- Nuvident: `dental`

Otros valores posibles: `medicina_general`, `psicologia`, `nutricion`, `kinesiologia`, `odontologia`, etc.

Esta columna se usa en synapta-admin para:
- Clonar config JSONB de una clínica template del mismo tipo
- Clasificar clínicas en la lista

**NO confundir con `config.especialidad`** (string descriptivo libre) ni con `config.chatbot.tipo_clinica` (dato legacy dentro del jsonb — la columna real es la fuente de verdad ahora).

### 16.3 Foreign keys — siempre en español con prefijo `id_`

```
id_paciente      (NO patient_id)
id_encuentro     (NO encounter_id)
id_profesional   (NO practitioner_id)
id_clinica       (NO clinic_id)
```

### 16.4 Tabla `logs_auditoria` — campos exactos

```
actor_id         (NO user_id)
actor_tipo       "profesional" | "admin" | "sistema" | "bot" | "paciente"
accion           (NO action)
tabla_afectada   (NO resource_type)
registro_id      (NO resource_id)
id_paciente      uuid nullable — FK (índice: idx_auditoria_id_paciente)
id_clinica       uuid nullable
```

### 16.5 Tablas FCE — columna `id_clinica`

```
CON id_clinica:    pacientes, fce_anamnesis, fce_encuentros, fce_consentimientos, clinicas_fce_config, instrumentos_aplicados, fce_notas_clinicas, fce_prescripciones
CON id_clinica NULLABLE:  fce_signos_vitales (requerido en nuevos INSERTs), medicamentos_catalogo (null = catálogo global)
SIN id_clinica:    fce_evaluaciones, fce_notas_soap, instrumentos_valoracion (catálogo compartido)
```

NO agregar `id_clinica` a tablas que no la tienen — provoca error de columna inexistente. Para filtrar estas tablas por tenant, JOIN con `fce_encuentros.id_clinica` o `pacientes.id_clinica`.

### 16.6 `fce_consentimientos` — RLS policies

```sql
-- SELECT: cualquier usuario autenticado puede leer
-- INSERT: cualquier usuario autenticado puede crear
-- UPDATE: solo el creador puede actualizar (y solo si firmado = false)
USING (firmado = false AND created_by = auth.uid())
```

---

## 17. FLUJO DE TRABAJO CON MÚLTIPLES CLÍNICAS

### 17.1 Cuando Claude Code trabaja en la plataforma (general)

Lee este `CLAUDE.md` raíz. Trabaja sobre el catálogo y helpers. No toca config de ninguna clínica específica.

### 17.2 Cuando Claude Code trabaja "para" una clínica específica

Existen CLAUDE.md por clínica en `clinics/<slug>/CLAUDE.md`. Si el usuario dice "estoy trabajando en Korporis ahora":

1. Leer `clinics/korporis/CLAUDE.md`
2. Respetar los módulos activos de esa clínica
3. NO implementar módulos desactivados
4. Si el usuario pide algo de un módulo inactivo, responder:
   > "El módulo M7_agenda no está habilitado para Korporis según su configuración en `clinicas_fce_config`. ¿Quieres activarlo primero?"

### 17.3 Onboarding de clínica nueva

**Método principal**: wizard de synapta-admin (`/synapta-admin/nueva-clinica`)
- Paso 1: Datos de la clínica (nombre, slug, tipo, plan, contacto)
- Paso 2: Usuario admin (nombre, email, contraseña auto-generada)
- Paso 3: Profesionales (nombre, especialidad via dropdown del catálogo, duración, color)
- Paso 4: Resumen + confirmación
- Paso 5: Config FCE default (auto-INSERT de M1 + M6 en `clinicas_fce_config`)

El wizard crea en cascada: `clinicas` → `auth.users` → `admin_users` → `profesionales` → `clinicas_fce_config`. Con rollback automático si falla algún paso.

**Configuración FCE post-onboarding**: desde `/synapta-admin/[slug]/fce` el operador puede activar/desactivar módulos y especialidades.

**Método backup**: CLI `npm run onboard-clinica` para operaciones masivas o emergencias.

---

## 18. COMANDOS

```bash
npm run dev              # Desarrollo local (Turbopack)
npm run build            # Build producción (0 errores obligatorio)
npm run lint             # Linting
npm run test:sprint-1    # Tests de integración Sprint 1 (8 casos)
npm run test:sprint-r7   # Tests de regresión Sprint R7: Korporis + Renata (33 checks)
npm run onboard-clinica  # CLI para agregar clínica nueva (post Sprint 4)
```

---

## 19. CONVENCIÓN DE COMMITS

```
feat(registry): agregar módulo M7_agenda
feat(config): helper getClinicaConfig
feat(korporis): migrar a multi-tenant
feat(sprint-1): catálogo FCE + helpers validados contra DB real
feat(sprint-2): provider FCE + guards de módulos en layout y rutas
fix(sidebar): render condicional por módulos activos
refactor(branding): mover tokens kp-* a CSS vars dinámicas
sql: migration clinicas_fce_config
docs(sprints): marcar sprint 1 como completado
```

Prefijos de scope útiles: `(registry)`, `(config)`, `(guards)`, `(branding)`, `(korporis)`, `(nuvident)`, `(sprint-N)`.

---

## 20. ⚠️ CONTEXTO SENSIBLE

### 20.1 Korporis en producción

**NO TOCAR el repo original `korporis-fce`** (`fce.korporis.cl`). Este repo (`fce-plataform`) está separado a propósito.

Korporis se migrará en Sprint R7-R8. Hasta entonces, vive en su repo original y ESTE repo NO afecta esa producción. Cambios destructivos aquí son relativamente seguros **mientras las tablas FCE en DB sigan vacías** (hoy 0 filas).

**Cuando llegue Sprint R7-R8** (migración Korporis → plataforma):
1. Coordinación explícita con el usuario humano
2. Backup de DB Supabase completo
3. Deploy a staging primero
4. Smoke test con cuenta real
5. Switch de DNS `fce.korporis.cl` al nuevo deploy
6. Repo viejo `korporis-fce` → read-only archive

**No hacer nada de R7-R8 sin que el usuario lo pida explícitamente.**

### 20.2 DB compartida con otros repos

Synapta Product es compartido por 3 repos (synapta, korporis-fce, fce-plataform). Si este repo hace DDL (migration) sobre tablas que comparten otros repos:

- **Claude Code NO aplica migrations** — genera SQL, presenta para revisión, y espera. Las migrations se aplican vía MCP Supabase o dashboard manual.
- **Confirmar con usuario** antes de aplicar
- **Revisar qué otros repos usan esa tabla** (ver CLAUDE.md de synapta si existe, o preguntar)
- **Usar Supabase MCP** para SELECT de verificación antes y después

**Cambios recientes en DB (aplicados desde repo synapta, 2026-04-19):**
- `profesionales.auth_id` ya **no tiene UNIQUE constraint** — soporta médicos con múltiples especialidades (1 auth_id → N profesionales)
- Nueva tabla `admin_user_profesionales` (junction N:N entre `admin_users` y `profesionales`) — este repo **NO la lee ni la escribe**, es dominio exclusivo de synapta-admin
- Triggers en la junction sincronizan `profesionales.auth_id` automáticamente cuando synapta-admin vincula usuarios

### 20.3 Bug de normalización de especialidad

El repo korporis-fce tenía un bug que escribía strings normalizados a DB. El trigger nuevo del catálogo lo rechaza. **Claude Code corrigió el bug en korporis-fce en sesión previa.**

Este repo es copia de korporis-fce ANTES del fix → **tiene el mismo bug latente**. El fix se aplica en Sprint R1 (limpieza de Korporis-isms).

**Si un sprint toca un server action que escribe a `fce_encuentros.especialidad` o `fce_evaluaciones.especialidad`**: aplicar el mismo fix que korporis-fce (separar `rawEsp` para DB del `especialidadInternal` normalizado para routing).

---

## 21. ESTADO ACTUAL DEL PROYECTO

### Sprints legacy (completados)

| Sprint | Repo | Estado | Commit | Qué logró |
|---|---|---|---|---|
| Sprint 0 — Preparación | fce-plataform | ✅ | — | Repo inicializado, paquete v2 aplicado, DB migrations aplicadas |
| Sprint 1 — Catálogo + helpers | fce-plataform | ✅ | Sprint 1 | 45 tests pass, config.ts con cliente inyectable, typecheck + build OK |
| Sprint 2 — Provider + guards | fce-plataform | ✅ | `8205626` | ClinicaSessionProvider en layout, requireModule en 5 rutas, fix rol recepcionista, fix rol autoritativo |
| Sprint 3 — Sidebar + branding | fce-plataform | ✅ | `93b65a6` | Sidebar dinámico (logo/nombre/módulos desde DB), BrandingInjector reescrito con --color-kp-*, PatientActionNav condicional, 31 tests Sprint 3 + 45 regresión |
| Sprint 4 — Config FCE en synapta-admin | **synapta** | ✅ | `c9960fa` | Página /synapta-admin/[slug]/fce, API fce-config GET/PATCH, columna FCE en lista de clínicas, auto-INSERT clinicas_fce_config en wizard onboarding, dropdown especialidad desde catálogo |

### Plan de rediseño multi-modelo (R1–R8)

Reemplaza el Sprint 5 legacy. Docs en `docs/plan-redisenio/`.

| Sprint | Foco | Estado | Hito |
|---|---|---|---|
| R1 — Limpieza Korporis-isms | Eliminar tipos legacy, reorganizar components | 🔜 | Repo limpio para modelo nuevo |
| R2 — Migrations DB + seed | 3 tablas nuevas + 10 instrumentos | ✅ | Tablas listas |
| R3 — Registry + router encuentro | Campo modelo + helpers + EncuentroLauncher | ✅ | Bifurcación funcionando |
| R4 — Nota clínica | NotaClinicaForm + CRUD + firma | ✅ | Renata puede escribir notas |
| R5 — Sistema instrumentos | Catálogo + renderers + cálculo + panel | ✅ | Renata aplica instrumentos |
| R6 — Timeline unificado | Timeline mixto + integración | ✅ | **Renata MVP en producción** |
| R7 — Migración Korporis | Mover rehab a estructura encuentro | ✅ | Korporis misma arquitectura |
| R8 — Switch DNS | Deploy + archive legacy | 🔜 | Repo viejo archivado |
| R9 — Prescripciones fundamentos | DB + registry + types + helpers | ✅ | Tablas listas para aplicar en Supabase |
| R10 — Prescripciones UI | Forms + server actions + firma | ✅ | PrescripcionLauncher en ambos modelos |
| R11 — Prescripciones PDF + Timeline | PDF entregable + integración timeline | 🔜 | PDF descargable por paciente |

**Nota**: R2 se completó antes que R1 porque las migrations no tienen dependencia de código. R1 sigue pendiente (limpieza de Korporis-isms). R3 y R4 se completaron sobre R2 sin R1 porque sus dependencias de código son independientes del cleanup. R7 se completó antes que R1 porque la migración de Korporis no dependía de la limpieza R1.

### Cambios DB aplicados (fuera de sprints)

| Cambio | Aplicado por | Detalle |
|---|---|---|
| Drop UNIQUE `profesionales.auth_id` | sesión synapta 2026-04-19 | Soporta médico con N especialidades. Ver regla 14. |
| Nueva tabla `admin_user_profesionales` | sesión synapta 2026-04-19 | Junction N:N admin_users ↔ profesionales. Solo la gestiona synapta-admin. |

### Fixes aplicados (colaterales a los sprints)

| Fix | Repo | Detalle |
|---|---|---|
| Bug normalización especialidad | korporis-fce | `soap.ts` + `evaluacion.ts` — separar rawEsp de normalizado |
| Rol `recepcion` → `recepcionista` | fce-plataform | Sprint 2 |
| `BrandingConfig` importado de `BrandingInjector.tsx` (incorrecto) | fce-plataform | R3 — corregido en `layout.tsx`, `DashboardShell.tsx`, `Sidebar.tsx` → importar desde `@/lib/modules/registry` |
| `AlertBanner` props incorrectas en `EncuentroLauncher` | fce-plataform | R3 — `type="error"` → `variant="danger"` + children |
| Rol autoritativo desde admin_users | fce-plataform | Sprint 2 — antes hardcodeaba "profesional" |
| Guard auditoría expandido | fce-plataform | Sprint 2 — ahora admin+director+superadmin |
| BrandingInjector era no-op | fce-plataform | Sprint 3 — inyectaba --clinic-* que nada usaba |
| Columna tipo_clinica | DB + synapta | Migration + fix POST wizard |
| Dropdown especialidad | synapta | Reemplaza input libre por select del catálogo |
| owner_id + email NOT NULL | synapta | Fix INSERTs del wizard onboarding |
| Resolución multi-perfil profesional | fce-plataform | Crear `src/lib/fce/profesional.ts` con `getProfesionalActivo`, actualizar `patients.ts`, `provider.tsx`, `layout.tsx` para soportar 1 auth_id → N perfiles |

### Deuda técnica conocida

| Item | Impacto | Prioridad |
|---|---|---|
| Bug normalización en fce-plataform | Latente (tablas FCE vacías) | Alta — resolver en R1 |
| 9 hex hardcoded en PdfExportView.tsx | PDF necesita valores absolutos | Baja |
| Nuvident profesional con "Odontología general y estética" | Inconsistente con catálogo | Baja — datos pre-existentes |
| `permissions.ts` legacy con roles viejos | Convive con guards.ts nuevo | Alta — eliminar en R1 |
| TODO selector perfil activo | Fase 2 — pendiente | Media — implementar en UI cuando haya 2+ perfiles en producción |
| Instrumentos con `"validado": false` en seed | 8 de 10 instrumentos requieren validación clínica humana | Media — validar antes de R5 go-live |
| MMSE bajo licencia PAR Inc. | Posible restricción de uso | Baja — evaluar alternativa si es necesario |

---

## 22. RECURSOS

- Supabase Product project: `vigyhfpwyxihrjiygfsa` (región `sa-east-1`)
- Dashboard SQL Editor: https://supabase.com/dashboard/project/vigyhfpwyxihrjiygfsa/sql
- Deploy objetivo: Vercel (mismo ecosistema de synapta)
- Repositorios hermanos:
  - `synapta` (landing + admin + agenda + chatbot)
  - `korporis-fce` (legacy, se reemplaza)
