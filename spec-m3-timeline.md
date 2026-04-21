# Spec: Timeline Clínico en M3 · Evaluación

> Fecha: 2026-04-20
> Estado: spec para implementación
> Dependencias: requiere que los issues 1-4 del `issues-frontend-refactor.md` estén resueltos (tabs dinámicas, GenericEval)

---

## 1. Objetivo

Agregar un historial clínico cronológico en la página M3 (Evaluación) que muestre todas las atenciones registradas por los profesionales de la clínica actual para un paciente. El profesional ve el contexto completo antes de documentar su propia evaluación.

**Principio**: read-first, write-second.

---

## 2. Layout de la página

```
┌──────────────────────────────────────────────────────────┐
│ < ester zapata arevalo / M3 · Evaluación                 │
│ [PatientSummaryBar]                                      │
│                                                          │
│ ┌─ Historial clínico ────────────────────────────────┐   │
│ │ Filtros: [Todas ▾] [Último mes ▾]                  │   │
│ │                                                    │   │
│ │ 20 abr · Dra. Genesis Veloso · Medicina General    │   │
│ │   📋 Evaluación: dolor lumbar crónico, EVA 4/10    │   │
│ │                                                    │   │
│ │ 18 abr · Dra. Genesis Veloso · Medicina General    │   │
│ │   📝 SOAP firmado: "Paciente refiere mejoría..."   │   │
│ │                                                    │   │
│ │ 15 abr · Lic. María López · Kinesiología           │   │
│ │   📋 Evaluación musculoesquelética (ROM, fuerza)   │   │
│ │                                                    │   │
│ │ 15 abr · Lic. María López · Kinesiología           │   │
│ │   💓 Signos vitales: PA 120/80, FC 72, SpO2 98%   │   │
│ │                                                    │   │
│ │ (vacío) No hay registros clínicos aún.             │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ── Tu evaluación ──────────────────────────────────────  │
│ [Medicina General ✓] [Kinesiología] [Fonoaudiología]     │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Formulario de evaluación (específico o genérico)   │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

El timeline va **arriba** del formulario de evaluación. Las tabs de especialidad van **abajo**, separadas con un heading "Tu evaluación".

---

## 3. Fuentes de datos del timeline

### 3.1 Tablas y columnas relevantes

| Tabla | Qué muestra | Fecha | Autor | Especialidad |
|---|---|---|---|---|
| `fce_evaluaciones` | Evaluaciones por especialidad | `created_at` | `created_by` (uuid → profesionales.id? ver nota) | `especialidad` (directo) |
| `fce_notas_soap` | Notas SOAP (firmadas y borradores) | `created_at` | `firmado_por` (uuid → profesionales.id, null si borrador) | vía JOIN `fce_encuentros.especialidad` |
| `fce_signos_vitales` | Registros de signos vitales | `recorded_at` | `recorded_by` (uuid → ?) | vía JOIN `fce_encuentros.especialidad` |

### 3.2 Nota sobre columnas de autoría

**`fce_evaluaciones.created_by`**: según CLAUDE.md es uuid. Verificar si referencia `auth.users.id` o `profesionales.id`. Si es auth_id, hacer JOIN con `profesionales` via `auth_id`. Si es profesionales.id, JOIN directo.

**`fce_notas_soap.firmado_por`**: referencia `profesionales.id` (confirmado en CLAUDE.md §11.5). Para borradores (`firmado = false`), este campo es null — el autor se puede resolver via `fce_encuentros.id_profesional`.

**`fce_signos_vitales.recorded_by`**: uuid nullable. Verificar referencia (probablemente auth_id o profesionales.id).

### 3.3 Filtrado por clínica (multi-tenant)

El timeline SOLO muestra registros de profesionales de la clínica actual. Estrategia de filtrado:

| Tabla | Tiene `id_clinica` | Estrategia |
|---|---|---|
| `fce_evaluaciones` | ❌ | JOIN `profesionales ON created_by` → filtrar `profesionales.id_clinica` |
| `fce_notas_soap` | ❌ | JOIN `fce_encuentros ON id_encuentro` → `fce_encuentros.id_clinica` |
| `fce_signos_vitales` | ✅ (nullable) | Usar `id_clinica` directo cuando existe, o JOIN `fce_encuentros` |

### 3.4 Query strategy

Un solo server action `getTimelineClinico(patientId, idClinica, filtros)` que hace fetch en paralelo de las 3 tablas, luego merge + sort por fecha desc.

```typescript
// Pseudocódigo
const [evals, soaps, vitals] = await Promise.all([
  // fce_evaluaciones con nombre del profesional
  supabase.from("fce_evaluaciones")
    .select("id, especialidad, sub_area, data, created_at, created_by")
    .eq("id_paciente", patientId)
    .order("created_at", { ascending: false })
    .limit(50),

  // fce_notas_soap con datos del encuentro
  supabase.from("fce_notas_soap")
    .select(`
      id, subjetivo, firmado, firmado_por, created_at,
      fce_encuentros!inner(id_clinica, especialidad, id_profesional)
    `)
    .eq("id_paciente", patientId)
    .eq("fce_encuentros.id_clinica", idClinica)
    .order("created_at", { ascending: false })
    .limit(50),

  // fce_signos_vitales
  supabase.from("fce_signos_vitales")
    .select("id, presion_arterial, frecuencia_cardiaca, spo2, temperatura, recorded_at, recorded_by")
    .eq("id_paciente", patientId)
    .order("recorded_at", { ascending: false })
    .limit(20),
]);

// Batch lookup de nombres de profesionales
const authorIds = new Set([...evals created_by, ...soaps firmado_por/id_profesional, ...vitals recorded_by]);
const { data: profesionales } = await supabase
  .from("profesionales")
  .select("id, nombre, especialidad, auth_id")
  .in("id", [...authorIds].filter(Boolean));

// Merge, enriquecer con nombres, sort desc
```

**Nota**: el action existente `timeline.ts` hace algo similar. Evaluar si extenderlo o crear uno nuevo enfocado en M3.

---

## 4. Tipo de entrada del timeline

```typescript
interface TimelineEntry {
  id: string;
  tipo: "evaluacion" | "soap" | "signos_vitales";
  fecha: string; // ISO
  autorNombre: string; // nombre del profesional
  autorEspecialidad: string; // código catálogo ("Kinesiología", etc.)
  especialidad: string; // especialidad del registro (puede diferir del autor)
  firmado?: boolean; // solo para SOAP
  resumen: string; // texto truncado para preview
  data?: Record<string, unknown>; // datos completos para expandir
}
```

---

## 5. Componente: `EvaluacionTimeline.tsx`

**Ubicación**: `src/components/modules/EvaluacionTimeline.tsx`

**Props**:
```typescript
interface EvaluacionTimelineProps {
  entries: TimelineEntry[];
  especialidadesActivas: string[]; // para el filtro
}
```

**Comportamiento**:
- Client Component (`'use client'`) para manejar filtros interactivos
- Estado local para filtro de especialidad y rango de fechas
- Cada entry es un card compacto con icono por tipo, nombre del profesional, especialidad, fecha y resumen
- Click en un entry expande el detalle inline (no navega)
- SOAPs firmados muestran badge "Firmada" con ícono de lock
- SOAPs borrador muestran badge "Borrador" en amarillo

**Empty state**: "No hay registros clínicos para este paciente aún. Las evaluaciones y notas SOAP aparecerán aquí."

### 5.1 Filtros

| Filtro | Tipo | Valores |
|---|---|---|
| Especialidad | Select | "Todas" (default) + `especialidadesActivas` de config |
| Período | Select | "Último mes" (default), "Últimos 3 meses", "Último año", "Todo" |

Filtrado client-side sobre el array de entries (ya limitado a 50 por query).

### 5.2 Iconos por tipo

| Tipo | Icono (lucide-react) | Color |
|---|---|---|
| evaluacion | `ClipboardList` | `text-kp-accent` |
| soap | `FileText` | `text-kp-primary` |
| signos_vitales | `Activity` | `text-rose-500` (token fijo, no es branding) |

### 5.3 Resumen por tipo

| Tipo | Qué mostrar como resumen |
|---|---|
| evaluacion | `especialidad` + `sub_area` + extracto de `data` (primeros campos no-null) |
| soap | `subjetivo` truncado a 120 chars |
| signos_vitales | PA, FC, SpO2, Temp formateados inline |

---

## 6. Server Action: `getTimelineClinico`

**Ubicación**: extender `src/app/actions/timeline.ts` o crear función nueva en el mismo archivo.

**Firma**:
```typescript
export async function getTimelineClinico(
  patientId: string,
  idClinica: string
): Promise<ActionResult<TimelineEntry[]>>
```

**Lógica**:
1. Fetch paralelo de 3 tablas (ver §3.4)
2. Para `fce_evaluaciones`: filtrar por clínica via batch lookup de `created_by` → `profesionales.id_clinica`
3. Para `fce_notas_soap`: filtrar via JOIN `fce_encuentros.id_clinica`
4. Para `fce_signos_vitales`: filtrar por `id_clinica` directo
5. Batch lookup de nombres de profesionales
6. Merge + sort por fecha desc
7. Limitar a 100 entries totales

**No requiere audit log** — es solo lectura.

---

## 7. Integración en `evaluacion/page.tsx`

```typescript
// En el Server Component, después de los fetches existentes:
const timelineResult = await getTimelineClinico(id, adminRes.data.id_clinica);
const timelineEntries = timelineResult.success ? timelineResult.data : [];

// En el JSX, entre el patient summary y las tabs:
<EvaluacionTimeline 
  entries={timelineEntries}
  especialidadesActivas={config.especialidadesActivas}
/>

{/* Separador */}
<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-kp-border" />
  <span className="text-xs font-semibold text-ink-3 uppercase tracking-widest">
    Tu evaluación
  </span>
  <div className="h-px flex-1 bg-kp-border" />
</div>

{/* Tabs de especialidad + formulario (existente, refactorizado por issues 2-4) */}
```

---

## 8. Consideraciones de diseño

### 8.1 Normativa (Decreto 41 / Ley 20.584)

- El timeline es **solo lectura** — no permite editar registros desde aquí
- Los registros de SOAP firmados son inmutables (regla 8 del CLAUDE.md)
- La trazabilidad del autor queda preservada (nombre + especialidad + fecha)
- No se muestran datos de otras clínicas (filtro por `id_clinica`)

### 8.2 Performance

- Límite de 50 entries por tabla (150 máx pre-merge, 100 post-merge)
- Fetch paralelo con `Promise.all`
- Batch lookup de profesionales (1 query, no N+1)
- Filtros client-side sobre datos ya cargados

### 8.3 Empty state

Las tablas FCE están vacías hoy (0 filas en todas). El componente debe tener un empty state bien diseñado que no se vea como un error.

### 8.4 Tokens de color

Usar `var(--kp-*)` para todo excepto los íconos de tipo que usan colores semánticos fijos (rose para signos vitales). No usar hex hardcoded ni clases Tailwind genéricas para colores de marca.

---

## 9. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/components/modules/EvaluacionTimeline.tsx` | **NUEVO** — componente client |
| `src/app/actions/timeline.ts` | **MODIFICAR** — agregar `getTimelineClinico` |
| `src/app/dashboard/pacientes/[id]/evaluacion/page.tsx` | **MODIFICAR** — integrar timeline |
| `src/types/index.ts` o `src/types/timeline.ts` | **MODIFICAR** — agregar `TimelineEntry` type |

---

## 10. Criterios de aceptación

1. ✅ El timeline muestra evaluaciones, SOAPs y signos vitales del paciente
2. ✅ Solo muestra registros de profesionales de la clínica actual
3. ✅ Cada entry muestra: fecha, nombre profesional, especialidad, tipo, resumen
4. ✅ Filtro por especialidad funciona (filtra las entries visibles)
5. ✅ Filtro por período funciona
6. ✅ Empty state cuando no hay registros
7. ✅ SOAPs firmados muestran badge "Firmada", borradores muestran "Borrador"
8. ✅ Click en entry expande detalle inline
9. ✅ No se puede editar desde el timeline (solo lectura)
10. ✅ `npm run build` = 0 errores
11. ✅ Tokens `kp-*` via CSS variables (regla 2)
