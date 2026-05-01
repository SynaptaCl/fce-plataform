# CLAUDE.md — FCE Platform (fce-plataform)

> Última actualización: 2026-05-01 (Resumen IA)
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

Tokens `kp-*` se inyectan como CSS variables desde `clinicas.config.branding` (jsonb) via `BrandingInjector`. Componentes usan siempre `var(--kp-*)`. Nunca leer `config.branding` directamente — usar `config.tokensColor` del provider.

Tokens estáticos en globals.css: `surface-0` (#F1F5F9), `surface-1` (#FFFFFF), `ink-1` (#1E293B), `ink-2` (#475569), `ink-3` (#94A3B8), `kp-border` (#E2E8F0).

---

## 6. ARQUITECTURA MULTI-TENANT

```
1. CATÁLOGO (código)     → src/lib/modules/registry.ts — 8 módulos, 10 especialidades, modelos
2. CONFIGURACIÓN (DB)    → clinicas_fce_config — módulos/especialidades activas por clínica
3. GUARDS (runtime)      → src/lib/modules/guards.ts — requireModule, assertPuedeFirmar, etc.
4. UI CONDICIONAL        → Sidebar + rutas filtradas por config
```

**Dos modelos clínicos coexisten**:
- `rehabilitacion` (Kine, Fono, Maso, TO, Podología) → M3 Evaluación + M4 SOAP
- `clinico_general` (Medicina, Enfermería, Psico, Nutri, Odonto) → M3b Instrumentos + M4b Nota Clínica
- `ninguno` (Admin Clínica)

La bifurcación ocurre en `encuentro/[encuentroId]/page.tsx` via `getModeloDeEspecialidad()` de `src/lib/modules/modelos.ts`. Es la **única fuente de verdad** del mapeo especialidad → modelo.

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

---

## 10. ESTRUCTURA DEL PROYECTO (primer nivel)

```
src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/
  ├── page.tsx          → Router: redirect a /rehab o /clinico según modelo
  ├── rehab/page.tsx    → SoapForm + EvalComponent (R7)
  └── clinico/page.tsx  → NotaClinicaForm + InstrumentosPanel + PrescripcionLauncher + OrdenExamenLauncher

src/app/actions/
  ├── patients.ts, anamnesis.ts, consentimiento.ts, auditoria.ts, timeline.ts, exportar-pdf.ts
  ├── encuentros.ts, prescripciones.ts, ordenes-examen.ts
  ├── rehab/{soap.ts, evaluacion.ts}
  └── clinico/nota-clinica.ts

src/components/
  ├── ui/          → Átomos (Button, Input, Card, Badge, AlertBanner, etc.)
  ├── layout/      → Sidebar, TopBar, DashboardShell, PatientHeader, BrandingInjector
  ├── modules/     → M1-M6 compartidos (PatientForm, AnamnesisForm, ClinicalTimeline, etc.)
  │   ├── timeline/ → SoapExpandedCard, EvaluacionExpandedCard, PrescripcionExpandedCard,
  │   │               OrdenExamenExpandedCard, y demás cards del timeline
  │   └── ResumenIA/ → ResumenIAButton, ResumenIAModal, ResumenIAReport (index.ts)
  ├── rehab/       → SoapForm, CifMapper, KinesiologiaEval, FonoaudiologiaEval, MasoterapiaEval
  ├── clinico/     → NotaClinicaForm, InstrumentosPanel
  └── shared/      → EncuentroLauncher, BodyMap, ScaleSlider,
                     Prescripcion* (13 componentes M7),
                     OrdenExamen* (9 componentes M8: Launcher, Form, DetalleModal,
                       PdfView, FirmaPanel, ExamenSelector, ExamenCard, List)

src/lib/
  ├── modules/        → registry.ts, config.ts, guards.ts, modelos.ts, provider.tsx
  ├── fce/            → profesional.ts (getProfesionalActivo)
  ├── prescripciones/ → pdf-renderer.ts, share-helpers.ts, snapshot.ts, validations.ts
  ├── ordenes-examen/ → pdf-renderer.ts, share-helpers.ts, validations.ts
  ├── ia/             → contexto-clinico.ts, prompt.ts, cache.ts
  │   └── extraccion/ → demografico.ts, anamnesis.ts, signos-vitales.ts, medicacion.ts,
  │                      alertas.ts, evolucion.ts, examenes.ts, instrumentos.ts
  └── supabase/       → client.ts, server.ts, service.ts (service_role), types.ts

src/types/ → patient.ts, encounter.ts, soap.ts, nota-clinica.ts, prescripcion.ts,
             medicamento.ts, orden-examen.ts, timeline.ts, resumen-ia.ts, etc.
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
Scopes: `(clinico)`, `(rehab)`, `(shared)`, `(registry)`, `(guards)`, `(branding)`, `(m9)`.

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

---

## 15. MÓDULO RESUMEN IA

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

## 16. RECURSOS

- Supabase: `vigyhfpwyxihrjiygfsa` (sa-east-1)
- Deploy: Vercel
- Repos hermanos: `synapta`, `korporis-fce` (legacy)
- Anthropic: modelo `claude-haiku-4-5-20251001` (Resumen IA), key en `.env.local`
