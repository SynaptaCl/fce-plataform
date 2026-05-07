# CLAUDE.md — FCE Platform (fce-plataform)

> Última actualización: 2026-05-07 (R-ICD-2 CifSearch + auditoría completa)
> Este documento es la fuente de verdad para Claude Code. Leerlo antes de cualquier cambio.

---

## 1. QUÉ ES ESTE PROYECTO

**fce-plataform** — Ficha Clínica Electrónica multi-tenant para clínicas chilenas. Next.js App Router + Supabase. Cubre módulos FCE (M1–M8). Agenda, pagos, chatbot viven en repo `synapta`.

**3 repos comparten DB** Supabase `vigyhfpwyxihrjiygfsa`:

| Repo | Rol | Estado |
|---|---|---|
| `synapta` | Landing + admin + agenda + chatbot | Producción |
| `korporis-fce` | FCE legacy Korporis | Producción (se archiva en R8) |
| `fce-plataform` | **Este repo** — FCE multi-modelo | En construcción |

---

## 2. DOCUMENTACIÓN — LEER EN ORDEN

1. Este archivo
2. `docs/plan-redisenio/00-vision-general.md` — visión multi-modelo
3. `docs/plan-redisenio/04-criterios-tecnicos.md` — reglas transversales
4. Sprint en curso: `docs/plan-redisenio/sprints/R{N}-*.md`
5. `docs/schema-real.md` — schema DB (o verificar vía MCP Supabase)
6. `clinics/<slug>/CLAUDE.md` — contexto por clínica

---

## 3. STACK TÉCNICO

Next.js 16.2.3 (Turbopack) · TypeScript strict · Tailwind v4 · Supabase (`@supabase/ssr ^0.10.2`) · Vercel · react-hook-form + zod · lucide-react · html2pdf.js · date-fns · motion/react

---

## 4. REGLAS INQUEBRANTABLES

1. **`npm run build` = 0 errores** después de CADA cambio
2. **Tokens `kp-*` solo vía CSS variables** — nunca Tailwind genéricos, nunca hex hardcoded
3. **TypeScript strict** — sin `any` implícitos
4. **RLS habilitado** en todas las tablas con datos clínicos
5. **Filtrar por `id_clinica`** en toda query. Usar `getIdClinica(supabase, user.id)`
6. **Audit log** en toda operación de escritura (`logs_auditoria`)
7. **Contenido médico nunca se inventa** — datos confirmados o `[PENDIENTE]`
8. **Documentos firmados = inmutables** — SOAP, nota clínica, consentimiento, prescripción, orden de examen. Triggers en DB bloquean UPDATE post-firma
9. **Hard-stop contraindicaciones** en especialidades con `tieneContraindicaciones: true`
10. **Server Components por defecto**, `'use client'` solo cuando necesario
11. **Seguir sprints en orden**. No saltar. No mezclar
12. **NUNCA modificar `registry.ts` para una clínica** — usar `clinicas_fce_config`
13. **Especialidades en DB = strings EXACTOS** del catálogo (con tilde). Nunca normalizar antes de escribir
14. **`profesionales.auth_id` NO tiene UNIQUE** — un auth_id → N profesionales. Usar `getProfesionalActivo()` de `src/lib/fce/profesional.ts`
15. **Claude Code NO aplica migrations/DDL**. Genera SQL, presenta, espera aprobación humana
16. **Prescripciones inmutables post-firma** — snapshots del profesional se capturan al firmar

---

## 5. PALETA DE COLORES

Tokens `kp-*` se inyectan como CSS variables desde `clinicas.config.branding` (jsonb) via `BrandingInjector`. Componentes usan siempre `var(--color-kp-*)`. Nunca leer `config.branding` directamente — usar `config.tokensColor` del provider.

**CRÍTICO — bug frecuente**: usar `var(--color-kp-primary)` NO `var(--kp-primary)`. El prefijo completo es `--color-kp-*`. Sin `--color-` el token no resuelve y el elemento queda sin color.

Tokens estáticos en globals.css: `--color-surface-0` (#F1F5F9), `--color-surface-1` (#FFFFFF), `--color-ink-1` (#1E293B), `--color-ink-2` (#475569), `--color-ink-3` (#94A3B8), `--color-kp-border` (#E2E8F0).

Tokens dinámicos inyectados por clínica (ejemplos): `--color-kp-primary`, `--color-kp-accent`, `--color-kp-success`, `--color-kp-warning`, `--color-kp-danger`, `--color-kp-accent-xs`, `--color-kp-danger-lt`, `--color-kp-warning-lt`.

---

## 6. ARQUITECTURA MULTI-TENANT

```
1. CATÁLOGO (código)     → src/lib/modules/registry.ts — 8 módulos, 10 especialidades, modelos
2. CONFIGURACIÓN (DB)    → clinicas_fce_config — módulos/especialidades activas por clínica
3. GUARDS (runtime)      → src/lib/modules/guards.ts — requireModule, assertPuedeFirmar, etc.
4. UI CONDICIONAL        → Sidebar + rutas filtradas por config
```

**Tres modelos clínicos coexisten**:
- `rehabilitacion` (Kine, Fono, Maso, TO, Podología) → M3 Evaluación + M4 SOAP
- `clinico_general` (Medicina, Enfermería, Psico, Nutri) → M3b Instrumentos + M4b Nota Clínica
- `dental` (Odontología) → DentalWorkspace (odontograma + periograma + plan tratamiento + procedimientos + ICD-11)
- `ninguno` (Admin Clínica)

La bifurcación ocurre en `encuentro/[encuentroId]/page.tsx` via `getModeloDeEspecialidad()` de `src/lib/modules/modelos.ts`. Es la **única fuente de verdad** del mapeo especialidad → modelo.

El workspace dental vive en `/encuentro/[encuentroId]/dental/page.tsx` y usa `DentalWorkspace` de `src/components/dental/`.

---

## 7. MÓDULOS CLÍNICOS

| ID | Tablas DB | Obligatorio |
|---|---|:---:|
| M1_identificacion | `pacientes` | **sí** |
| M2_anamnesis | `fce_anamnesis`, `fce_signos_vitales` | no |
| M3_evaluacion | `fce_evaluaciones` | no |
| M4_soap | `fce_notas_soap`, `fce_encuentros` | no |
| M5_consentimiento | `fce_consentimientos` | no |
| M6_auditoria | `logs_auditoria` | **sí** |
| M7_prescripciones | `fce_prescripciones`, `medicamentos_catalogo` | no |
| M8_examenes | `fce_ordenes_examen`, `examenes_catalogo` | no |
| M9_egresos | `fce_egresos` | no |

---

## 8. TABLAS DB — RESUMEN

Para columnas exactas consultar `docs/schema-real.md` o MCP Supabase.

**Con `id_clinica`**: pacientes, fce_anamnesis, fce_encuentros, fce_consentimientos, clinicas_fce_config, instrumentos_aplicados, fce_notas_clinicas, fce_prescripciones, fce_ordenes_examen, fce_egresos

**Sin `id_clinica`** (filtrar via JOIN): fce_evaluaciones, fce_notas_soap

**Catálogos globales**: especialidades_catalogo, instrumentos_valoracion, medicamentos_catalogo, examenes_catalogo

**De otros repos (SOLO READ)**: citas, disponibilidad, pagos, conversaciones — nunca INSERT/UPDATE desde este repo.

**Roles** (`admin_users.rol`): superadmin, director, admin, profesional, recepcionista. Solo profesional firma. Recepcionista NO accede a FCE.

**`profesionales` columnas clave**: id, auth_id, id_clinica, nombre, especialidad (texto libre), rut, numero_registro, tipo_registro, puede_prescribir (boolean, default false), puede_indicar_examenes (boolean, default false)

**Foreign keys**: siempre español con prefijo `id_` (id_paciente, id_encuentro, id_clinica — NO patient_id)

**`logs_auditoria` campos**: actor_id, actor_tipo, accion, tabla_afectada, registro_id, id_clinica (nullable), id_paciente (nullable)

---

## 9. PATRONES CRÍTICOS (los que causan bugs si no se saben)

### Auth — siempre getUser(), nunca getSession()
```typescript
const { data: { user } } = await supabase.auth.getUser(); // ✅
// supabase.auth.getSession() ← ❌ no valida JWT
```

### Rol autoritativo desde admin_users, nunca profesionales
```typescript
const { data: admin } = await supabase.from("admin_users")
  .select("id_clinica, rol, nombre, activo")
  .eq("auth_id", userId).eq("activo", true).single();
const rol = admin.rol; // ✅ fuente autoritativa
```

### Especialidad — NO normalizar antes de escribir a DB
```typescript
const rawEsp = prof.especialidad; // "Kinesiología" (con tilde)
// Para DB: usar rawEsp tal cual
// Para routing/TS: normalizar solo en variable separada, NUNCA escribir normalizado a DB
```

### ActionResult — tipo de respuesta estándar
```typescript
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Zona horaria Santiago
```typescript
const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
```

### Patient — todos los campos nullable
```typescript
patient.nombre ?? "Sin registro"
[patient.nombre, patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ")
```

### html2pdf.js — dynamic import obligatorio
```typescript
// ❌ import html2pdf from "html2pdf.js" ← rompe SSR (self is not defined)
// ✅ const html2pdf = (await import("html2pdf.js")).default
```

### Vistas PDF — hex hardcoded permitido
`RecetaPdfView` y `OrdenExamenPdfView` usan hex inline porque html2pdf.js no resuelve CSS variables. Las `<img>` llevan `// eslint-disable-next-line @next/next/no-img-element` (next/image es incompatible con html2pdf.js).

### Permisos de firma — dos flags independientes
```typescript
profesional.puede_prescribir       // M7: recetas farmacológicas
profesional.puede_indicar_examenes // M8: órdenes de examen
```
Ambos son `false` por defecto. Se activan manualmente por clínica. Verificar con `getProfesionalActivo()` antes de crear documentos.

### permissions.ts — LEGACY, no usar en código nuevo
`canAccessFCE` usa `"recepcion"` (viejo). Usar `requireAccesoFCE(rol)` de `guards.ts`.

### ActionResult — dónde importar
```typescript
// En archivos bajo src/app/actions/
import type { ActionResult } from '@/app/actions/patients'; // ✅ patrón usado en rehab/, clinico/
// O directamente desde guards:
import type { ActionResult } from '@/lib/modules/guards'; // ✅ fuente original
// ❌ NO existe en @/types
```

### Token CSS — regla crítica
```typescript
// ✅ CORRECTO
style={{ color: 'var(--color-kp-primary)' }}
// ❌ INCORRECTO — no resuelve
style={{ color: 'var(--kp-primary)' }}
```

### ICD-11 API — variables de entorno requeridas
```bash
ICD_API_CLIENT_ID=...       # Credencial WHO API — solo server-side
ICD_API_CLIENT_SECRET=...   # Credencial WHO API — solo server-side
```
El cliente `src/lib/icd/client.ts` cachea el OAuth2 token en memoria de proceso (renovación automática 5 min antes de expirar). Si falta alguna env var, lanza error en el primer request.

---

## 10. ESTRUCTURA DEL PROYECTO (primer nivel)

```
src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/
  ├── page.tsx          → Router: redirect a /rehab | /clinico | /dental según modelo
  ├── rehab/page.tsx    → SoapForm + EvalComponent
  ├── clinico/page.tsx  → NotaClinicaForm + InstrumentosPanel + PrescripcionLauncher + OrdenExamenLauncher
  └── dental/page.tsx   → DentalWorkspace (odontograma + periograma + plan + ICD-11)

src/app/actions/
  ├── patients.ts, anamnesis.ts, consentimiento.ts, auditoria.ts
  ├── encuentros.ts, egresos.ts, timeline.ts, exportar-pdf.ts, resumen-ia.ts
  ├── prescripciones.ts, ordenes-examen.ts
  ├── rehab/    → soap.ts, evaluacion.ts, cif.ts
  ├── clinico/  → nota-clinica.ts, nota-rapida.ts, instrumentos.ts, catalogo-instrumentos.ts, diagnostico.ts
  └── dental/   → odontograma.ts, periograma.ts, plan-tratamiento.ts, procedimientos.ts

src/components/
  ├── ui/       → Button, Input, Card, Badge, AlertBanner, Select, Textarea,
  │               SignatureBlock, LoadingSpinner, LoadingPage
  ├── layout/   → Sidebar, TopBar, DashboardShell, PatientHeader, BrandingInjector
  ├── modules/  → ClinicalTimeline, EvaluacionTimeline, PatientActionNav, PatientNav
  │   ├── timeline/ → SoapExpandedCard, EvaluacionExpandedCard, NotaClinicaExpandedCard,
  │   │               PrescripcionExpandedCard, OrdenExamenExpandedCard, InstrumentoExpandedCard,
  │   │               ConsentimientoExpandedCard, SignosVitalesExpandedCard, _shared.tsx
  │   └── ResumenIA/ → ResumenIAButton, ResumenIAModal, ResumenIAReport (index.ts)
  ├── rehab/    → SoapForm, CifMapper, CifSearch, KinesiologiaEval, FonoaudiologiaEval,
  │               MasoterapiaEval, GenericEval (index.ts)
  ├── clinico/  → NotaClinicaForm, InstrumentosPanel, InstrumentoLauncher,
  │               InstrumentoResultadoCard, EscalaSimpleRenderer, QuickNoteModal,
  │               DiagnosticoSearch, DiagnosticoChip
  │               instrumentos-custom/ → ApgarScore, GlasgowComaScale
  ├── dental/   → DentalWorkspace, OdontogramaInteractivo, OdontogramaPieza, OdontogramaLeyenda,
  │               PiezaDetailPanel, PeriogramaForm, PeriogramaChart,
  │               PlanTratamientoPanel, PlanTratamientoItemForm,
  │               ProcedimientoPicker, DiagnosticoSearch (wrapper dental ICD-11)
  └── shared/   → EncuentroLauncher, BodyMap, ScaleSlider, SummaryPanel,
                   FirmarHeaderButton, VitalSignsPanel, AnamnesisForm,
                   PatientForm, PatientList, ConsentManager, AuditTimeline,
                   FhirPreview, PdfExportView, RedFlagsChecklist,
                   EgresoForm, EgresoCard, EgresoLauncher, ReingresoBanner, EpicrisisPdfView,
                   Prescripcion* (PrescripcionLauncher, Form, List, DetalleModal,
                     FirmaPanel, MedicamentoSelector, MedicamentoCard, MedicamentoEditor,
                     IndicacionGeneralEditor, RecetaPdfView),
                   OrdenExamen* (Launcher, Form, List, DetalleModal,
                     FirmaPanel, ExamenSelector, ExamenCard, OrdenExamenPdfView)

src/lib/
  ├── modules/        → registry.ts, config.ts, guards.ts (ActionResult aquí), modelos.ts, provider.tsx
  ├── fce/            → profesional.ts (getProfesionalActivo)
  ├── icd/            → client.ts (OAuth2 WHO), types.ts, search.ts (buscarDiagnostico/buscarCIF), entity.ts
  ├── dental/         → fdi.ts (numeración FDI), periograma.ts, plan.ts
  ├── instrumentos/   → calcular.ts, interpretar.ts, registry-custom.ts
  ├── medicamentos/   → catalogo.ts
  ├── prescripciones/ → pdf-renderer.ts, share-helpers.ts, snapshot.ts, validations.ts, plantillas.ts
  ├── ordenes-examen/ → pdf-renderer.ts, share-helpers.ts, validations.ts
  ├── egresos/        → pdf-renderer.ts (epicrisis)
  ├── ia/             → contexto-clinico.ts, prompt.ts, cache.ts
  │   └── extraccion/ → demografico.ts, anamnesis.ts, signos-vitales.ts, medicacion.ts,
  │                      alertas.ts, evolucion.ts, examenes.ts, instrumentos.ts
  ├── supabase/       → client.ts, server.ts, service.ts (service_role), types.ts
  └── (raíz)         → audit.ts, constants.ts, fhir-mapper.ts, utils.ts, validations.ts

src/types/
  → patient.ts, encounter.ts, soap.ts, nota-clinica.ts, anamnesis.ts, consent.ts,
    evaluation.ts, instrumento.ts, cif.ts, prescripcion.ts, medicamento.ts,
    orden-examen.ts, egreso.ts, timeline.ts, resumen-ia.ts, audit.ts,
    diagnostico.ts (re-exporta ICDSearchResult/ICDCodeSnap/DiagnosticoGuardado + DiagnosticoSearchProps),
    odontograma.ts, periograma.ts, plan-tratamiento.ts, practitioner.ts

clinics/{korporis,nuvident,renata}/CLAUDE.md
```

---

## 11. COMANDOS

```bash
npm run dev              # Desarrollo (Turbopack)
npm run build            # Build (0 errores obligatorio)
npm run lint             # Linting
npm run test:sprint-r7   # Tests regresión (33 checks)
```

---

## 12. COMMITS

```
feat(sprint-rN)(scope): descripción
fix(sprint-rN)(scope): descripción
```
Scopes: `(clinico)`, `(rehab)`, `(dental)`, `(shared)`, `(registry)`, `(guards)`, `(branding)`, `(m9)`, `(icd)`.

---

## 13. CONTEXTO SENSIBLE

### DB compartida
3 repos escriben la misma DB. Toda migration requiere coordinación humana. Claude Code genera SQL, no lo aplica.

### Korporis en producción
NO tocar `korporis-fce`. Migración en R7-R8 con backup + staging + smoke test + switch DNS.

### Clínicas activas
Para trabajar "para" una clínica, leer `clinics/<slug>/CLAUDE.md` y respetar sus módulos activos.

---

## 14. ESTADO DEL PROYECTO

### Sprints completados

| Sprint | Hito |
|---|---|
| Legacy 0-4 | Repo + catálogo + provider + guards + sidebar + branding + config synapta-admin |
| R2 | Migrations DB: instrumentos + notas clínicas + seed |
| R3 | Registry modelo + router encuentro + EncuentroLauncher |
| R4 | Nota clínica form + CRUD + firma |
| R5 | Sistema instrumentos completo |
| R6 | Timeline unificado — **Renata MVP en producción** |
| R7 | Korporis migrado a estructura encuentro |
| R9-R11 | M7 Prescripciones completo: DB + UI + PDF + Timeline + audit |
| R12 | M8 Exámenes: tipos TS, registry, server actions, validaciones Zod |
| R13 | M8 Exámenes: UI completa — form, PDF, timeline, compartir |
| R14 | Mejoras UX: SummaryPanel + Timeline colapsable + Nota rápida |
| M9 | Egresos: tipos, acciones, form, timeline, integración ficha |
| Resumen IA | Botón on-demand en ficha: extracción 7 tablas → Anthropic Haiku → caché + audit |
| UX-01 | Rediseño ficha paciente: PatientHeader con slots, PatientActionNav grupos semánticos, workspaces sticky |
| R-ICD-1 | DiagnosticoSearch ICD-11 MMS integrado en NotaClinicaForm + PeriogramaForm + Timeline chips FHIR |
| R-ICD-2 | CifSearch autocomplete ICF API — reemplaza input libre en CifMapper (actions/rehab/cif.ts + CifSearch.tsx) |

### Pendientes

| Sprint | Foco |
|---|---|
| R1 | Limpieza Korporis-isms (permissions.ts legacy, bug normalización) |
| R8 | Switch DNS Korporis legacy → fce-plataform |

### DB aplicada (fuera de sprints)

| Cambio | Fecha |
|---|---|
| Drop UNIQUE `profesionales.auth_id` + tabla `admin_user_profesionales` | 2026-04-19 |
| `medicamentos_catalogo` (174) + `fce_prescripciones` + columnas prescripción en `profesionales` | 2026-04-22 |
| M7 activo en Renata + genesis `puede_prescribir=true` | 2026-04-24 |
| `examenes_catalogo` + `fce_ordenes_examen` + `puede_indicar_examenes` en `profesionales` | 2026-04-24 |
| M8 activo en Renata + Nuvident | 2026-04-24 |
| `fce_egresos` + `pacientes.estado_clinico` + M9 activo en Renata | 2026-04-27 |
| `fce_resumenes_ia` (migración ya aplicada) | 2026-04-30 |
| Columnas ICD-11 en `fce_notas_clinicas` + `fce_periogramas` — **generadas en R-ICD-1, PENDIENTES de aplicar** | 2026-05-07 |

### Deuda técnica

| Item | Prioridad |
|---|---|
| Bug normalización especialidad | Alta — R1 |
| `permissions.ts` legacy con roles viejos | Alta — R1 |
| Gestión `puede_prescribir` / `puede_indicar_examenes` en panel clínica | Media |
| TODO selector perfil activo (cuando haya 2+ perfiles) | Media |
| Instrumentos con `validado: false` en seed (8 de 10) | Media |
| Seed medicamentos incompleto (faltan odonto, psiquiatría, suplementos) | Media |
| Seed examenes_catalogo vacío — poblar antes de activar en producción | Media |
| `estado_resultados` de órdenes de examen siempre `pendiente` — gestión en Fase 2 | Baja |
| `04-criterios-tecnicos.md` desactualizado post-R13 | Media |
| Migrations ICD-11 pendientes (`fce_notas_clinicas` + `fce_periogramas`) — SQL en `scripts/test-sprint-icd1.ts` | Alta |

---

## 15. PATRONES UX (desde UX-01)

### PatientHeader — slots de composición

```tsx
<PatientHeader
  patient={p}
  hasConsent={hasConsent}
  patientId={id}
  primaryAction={<EncuentroLauncher ... />}  // CTA principal derecha
  statusBadge={<span style={{ background: "var(--color-kp-warning)" }}>En progreso</span>}
/>
```

- `primaryAction?: React.ReactNode` — renderizado a la derecha junto al botón "Editar paciente"
- `statusBadge?: React.ReactNode` — renderizado en la fila de badges bajo el nombre
- Usar `var(--color-kp-warning)` / `var(--color-kp-success)` con `color: "#fff"` en inline style para badges de estado

### PatientActionNav — slots y grupos

```tsx
<PatientActionNav
  patientId={id}
  isAdmin={isAdmin}
  resumenIA={<ResumenIAButton ... />}  // slot encima de todos los grupos
/>
```

Grupos fijos: **Registro** (Nota rápida · Signos vitales · Consentimientos) | **Documentos** (Exportar PDF · FHIR Preview) | **Administración** (Egresos · Auditoría)

### Workspaces de encuentro — sticky header

En `/clinico/page.tsx` y `/rehab/page.tsx`:
- `PatientHeader` envuelto en `<div className="sticky top-0 z-20">` para que el badge de estado y "Firmar y cerrar" siempre sean visibles
- `FirmarHeaderButton` hace scroll a `id="signature-section"` que existe en `NotaClinicaForm` (div de acciones) y en `SoapForm` (SignatureBlock)
- La query de `fce_encuentros` incluye `created_at` para mostrar la hora de inicio en el badge

---

## 16. MÓDULO RESUMEN IA

### Arquitectura

```
Botón ResumenIAButton (client)
  → generarResumenIA (server action)
      → buildContextoClinico (Promise.all 7 funciones de extracción)
      → generarAlertas (sin query, lógica pura)
      → calcularContextoHash → getResumenCacheado (via supabase normal)
        ✓ cache hit  → audit log 'resumen_ia_cache' → return
        ✗ cache miss → Anthropic API (Haiku) → guardarResumenCache (service_role)
                     → audit log 'resumen_ia_generado' → return
```

### Patrones críticos del módulo IA

```typescript
// Modelo fijo — no cambiar sin revisión médica del prompt
const MODEL = 'claude-haiku-4-5-20251001'

// Cache usa service_role (bypasea RLS en fce_resumenes_ia)
import { createServiceClient } from '@/lib/supabase/service'

// Hash de contexto — 16 chars SHA-256, inputs: ultima_sesion, len(prescripciones), len(examenes_pendientes), motivo_consulta[:20]
import { calcularContextoHash } from '@/lib/ia/cache'

// fce_signos_vitales NO tiene id_clinica directa — filtrar via JOIN a fce_encuentros
// fce_notas_soap NO tiene id_clinica — filtrar via id_encuentro en fce_encuentros
// fce_prescripciones.medicamentos es jsonb — leer ahí, NO join a catálogo
```

### Variables de entorno requeridas
- `ANTHROPIC_API_KEY` — solo server-side, sin `NEXT_PUBLIC_`
- `SUPABASE_SERVICE_ROLE_KEY` — para insertar en `fce_resumenes_ia` y `logs_auditoria`

### Disclaimers legales (texto literal — no modificar)
- **Modal:** "Este resumen fue generado automáticamente a partir de los registros clínicos disponibles en el sistema. Es una herramienta de apoyo para el profesional tratante y no constituye un diagnóstico médico, recomendación terapéutica ni reemplaza el juicio clínico del profesional responsable de la atención."
- **Tooltip botón:** "Síntesis de antecedentes — No reemplaza el juicio clínico"

### Qué NO está implementado (Fase 2)
- Límites de uso por plan / throttling mensual
- Alertas proactivas batch nocturno
- Historial de resúmenes en el tiempo
- Compartir resumen con paciente
- Streaming de respuesta LLM

---

## 17. MÓDULO ICD-11

### Arquitectura

```
src/lib/icd/
  client.ts  → OAuth2 con WHO (ICD_API_CLIENT_ID + ICD_API_CLIENT_SECRET)
               Token cacheado en memoria de proceso, renovación automática 5 min antes de expirar
               Retry automático en 401; lanza error en 429 o 5xx
  types.ts   → ICDSearchResult, ICDEntity, ICDCodeSnap, DiagnosticoGuardado
  search.ts  → buscarDiagnostico(query, lang) — endpoint /icd/release/11/mms/search
               buscarCIF(query, lang)         — endpoint /icd/release/11/icf/search
  entity.ts  → getEntidadICD(id)             — detalle completo de una entidad

src/types/diagnostico.ts → re-exporta tipos ICD + DiagnosticoSearchProps
```

### Server actions ICD
```
actions/clinico/diagnostico.ts  → searchDiagnostico() — MMS, para nota clínica
actions/rehab/cif.ts            → searchCIF(query, dominioPrefix?) — ICF, para CifMapper
```
Ambas retornan `ActionResult<ICDSearchResult[]>` con degradación elegante (vacío si falla API).

### Componentes ICD

| Componente | Ubicación | Uso |
|---|---|---|
| `DiagnosticoSearch` | `components/clinico/` | Búsqueda MMS multi-selección con chips |
| `DiagnosticoChip` | `components/clinico/` | Chip individual código+título ICD-11 |
| `DiagnosticoSearch` | `components/dental/` | Wrapper dental del anterior (readOnly + contexto FDI) |
| `CifSearch` | `components/rehab/` | Autocomplete ICF por dominio (b/s/d/e) con debounce 300ms |

### Patrones críticos ICD

```typescript
// Los snapshots se guardan como ICDCodeSnap[] en jsonb — NO FK a catálogo
// Los diagnósticos son inmutables post-firma (igual que el resto de la nota)

// ICDCodeSnap — campos obligatorios al guardar
interface ICDCodeSnap {
  code: string;    // "A09" — puede ser vacío en entidades ICF sin código
  title: string;   // Título OMS en español
  uri: string;     // URL entidad en id.who.int
  version: string; // "2024-01"
  language: string; // "es"
  addedAt: string; // ISO datetime
  addedBy: string; // auth_id del profesional
}

// DiagnosticoGuardado = ICDCodeSnap[] — se almacena en jsonb de la tabla
```

### Variables de entorno ICD
```bash
ICD_API_CLIENT_ID=...      # Credencial OAuth2 WHO — obligatoria, server-side
ICD_API_CLIENT_SECRET=...  # Credencial OAuth2 WHO — obligatoria, server-side
```
Sin estas variables, cualquier llamada a `icdFetch()` lanzará error. Los componentes de búsqueda tienen degradación elegante (input libre si API no responde).

### Migrations ICD-11 pendientes
Las columnas `diagnosticos_icd` en `fce_notas_clinicas` y `fce_periogramas` fueron generadas en R-ICD-1 pero **aún no se han aplicado en producción**. Ver `scripts/test-sprint-icd1.ts` para el SQL.

---

## 18. RECURSOS

- Supabase: `vigyhfpwyxihrjiygfsa` (sa-east-1)
- Deploy: Vercel
- Repos hermanos: `synapta`, `korporis-fce` (legacy)
- Anthropic: modelo `claude-haiku-4-5-20251001` (Resumen IA), key en `.env.local`
