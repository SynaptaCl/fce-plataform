# Prompt Claude Code — Sprint R-ICD-3
# Postcoordination ICD-11 — Diagnósticos compuestos para medicina y odontología

---

## Contexto obligatorio — leer antes de cualquier acción

1. Lee `CLAUDE.md` completo.
2. Lee `docs/plan-redisenio/04-criterios-tecnicos.md`.
3. Lee `src/lib/icd/types.ts` — tipos base ICD.
4. Lee `src/lib/icd/client.ts` — `icdFetch()` que usarás.
5. Lee `src/lib/icd/entity.ts` — patrón de parsing de respuestas raw.
6. Lee `src/lib/icd/search.ts` — patrón de mapeo de respuestas.
7. Lee `src/components/clinico/DiagnosticoSearch.tsx` — componente base a extender.
8. Lee `src/components/clinico/DiagnosticoChip.tsx` — patrón de chip + tooltip.
9. Lee `src/app/actions/clinico/diagnostico.ts` — patrón de server actions ICD.

No escribas código hasta haber leído los 9 archivos.

---

## Objetivo del sprint

Implementar postcoordination de ICD-11: permite que un diagnóstico base se especifique con ejes clínicos adicionales (severidad, lateralidad, temporalidad, agente causal, etc.) para construir un código compuesto más preciso.

**Ejemplo**: `XN62R` (Streptococcus) + `ME84` (Neumonía) + severidad moderada → código postcoordinado que describe exactamente el cuadro clínico.

**Alcance**: aplica a todos los contextos donde se usa `DiagnosticoSearch`:
- `NotaClinicaForm` (medicina general, enfermería, psicología, nutrición)
- `DentalWorkspace` + `PeriogramaForm` (odontología)

El componente de postcoordination es **compartido** — no hay versión dental ni versión médica separada.

---

## Hard-stops

- **No modificar DB** — `icd_codigos jsonb` ya soporta el snapshot extendido. No hay migration.
- **No modificar `ICDCodeSnap`** en `types.ts` — se extiende con campo opcional, no se rompe.
- **No tocar `synapta` ni `korporis-fce`**.
- **No modificar el flujo de búsqueda base** de `DiagnosticoSearch` — solo se agrega el paso de postcoordination después de seleccionar.

---

## Cómo funciona la postcoordination en la API

### Paso 1 — Detectar si una entidad soporta postcoordination

Al obtener una entidad (`/icd/release/11/2025-01/mms/{entityId}`), la respuesta incluye:
```json
{
  "postcoordinationAvailability": "required" | "allowed" | "notAllowed"
}
```
- `"notAllowed"`: no ofrecer postcoordination.
- `"allowed"` o `"required"`: mostrar botón "Especificar".

### Paso 2 — Obtener los ejes disponibles

```
GET /icd/release/11/2025-01/mms/{entityId}/postcoordinationScale
```

Retorna array de ejes. Cada eje tiene:
```json
{
  "axisName": "Severity",
  "scaleEntity": [
    {
      "@id": "http://id.who.int/icd/release/11/2025-01/mms/...",
      "label": { "@value": "Leve" },
      "code": "..."
    }
  ],
  "requiredPostcoordination": false,
  "allowMultipleValues": "No"
}
```

Los `axisName` más comunes: `"Severity"`, `"Laterality"`, `"Temporality"`, `"InfectiousAgent"`, `"SpecificAnatomy"`, `"Manifestation"`.

### Paso 3 — UI de selección de ejes

- Ejes con `requiredPostcoordination: true` → siempre visibles, marcados como requeridos.
- Ejes opcionales → colapsados por defecto, expandibles con "Mostrar más ejes".
- Cada eje muestra su lista de valores como radio buttons (si `allowMultipleValues: "No"`) o checkboxes (si `"Yes"`).

### Paso 4 — Construir el snapshot extendido

Al guardar, el snapshot incluye los ejes seleccionados:
```json
{
  "code": "ME84",
  "title": "Neumonía",
  "uri": "http://...",
  "version": "ICD-11 2025-01",
  "language": "es",
  "addedAt": "...",
  "addedBy": "...",
  "postcoordination": [
    {
      "axisName": "Severity",
      "axisLabel": "Severidad",
      "valueCode": "...",
      "valueLabel": "Moderada",
      "valueUri": "http://..."
    }
  ]
}
```

---

## Archivos a crear (todos nuevos)

```
lib/icd/postcoordination.ts                          ← NUEVO
actions/clinico/postcoordination.ts                  ← NUEVO
components/shared/PostcoordinationModal.tsx          ← NUEVO (compartido)
```

## Archivos a modificar (solo las partes indicadas)

```
lib/icd/types.ts                                     ← extender ICDCodeSnap + nuevos tipos
lib/icd/entity.ts                                    ← extender obtenerEntidad() con postcoordinationAvailability
components/clinico/DiagnosticoSearch.tsx             ← agregar flujo post-selección
components/clinico/DiagnosticoChip.tsx               ← mostrar indicador de postcoordination
```

---

## Tarea 1 — Extender `lib/icd/types.ts`

Agrega al final del archivo (sin modificar los tipos existentes):

```typescript
// Postcoordination

export interface PostcoordinationValue {
  axisName: string          // "Severity", "Laterality", etc.
  axisLabel: string         // traducido: "Severidad", "Lateralidad", etc.
  valueCode: string
  valueLabel: string
  valueUri: string
}

export interface PostcoordinationScaleValue {
  uri: string
  label: string
  code?: string
}

export interface PostcoordinationAxis {
  axisName: string
  axisLabel: string         // traducido o humanizado
  required: boolean
  allowMultiple: boolean
  values: PostcoordinationScaleValue[]
}

export interface PostcoordinationAvailability {
  available: boolean        // false si "notAllowed"
  required: boolean         // true si "required"
  axes: PostcoordinationAxis[]
}
```

Extiende `ICDCodeSnap` con campo opcional (no destructivo — el jsonb existente en DB es compatible):

```typescript
// En ICDCodeSnap, agregar al final de la interfaz:
postcoordination?: PostcoordinationValue[]
```

Extiende `ICDEntity` con:
```typescript
postcoordinationAvailability?: 'required' | 'allowed' | 'notAllowed'
```

---

## Tarea 2 — Extender `lib/icd/entity.ts`

En `obtenerEntidad()`, el raw response ya incluye `postcoordinationAvailability` — solo hay que parsearlo y retornarlo.

Agrega a `RawEntityResponse`:
```typescript
postcoordinationAvailability?: string
```

Agrega al return de `obtenerEntidad()`:
```typescript
...(data.postcoordinationAvailability !== undefined
  ? { postcoordinationAvailability: data.postcoordinationAvailability as ICDEntity['postcoordinationAvailability'] }
  : {})
```

---

## Tarea 3 — `lib/icd/postcoordination.ts`

Lógica pura de postcoordination. Sin React, testeable.

```typescript
// getPostcoordinationAxes(entityId: string): Promise<PostcoordinationAxis[]>
// - Endpoint: GET /icd/release/11/2025-01/mms/{entityId}/postcoordinationScale
// - Si el endpoint retorna 404 o array vacío: retorna []
// - Parsea cada eje de la respuesta raw
// - Traduce axisName al español con el helper translateAxisName()
// - Retorna solo ejes que tienen al menos 1 valor (scaleEntity no vacío)

// translateAxisName(axisName: string): string
// Mapa de traducción:
// "Severity"          → "Severidad"
// "Laterality"        → "Lateralidad"
// "Temporality"       → "Temporalidad"
// "InfectiousAgent"   → "Agente infeccioso"
// "SpecificAnatomy"   → "Anatomía específica"
// "Manifestation"     → "Manifestación"
// "Acuity"            → "Agudeza"
// "Course"            → "Curso clínico"
// "Etiology"          → "Etiología"
// cualquier otro      → axisName (sin traducir)
```

**Estructura raw esperada del endpoint** (parsear defensivamente):
```json
[
  {
    "axisName": "Severity",
    "scaleEntity": [
      {
        "@id": "http://id.who.int/...",
        "label": { "@value": "Leve" },
        "theCode": "..."
      }
    ],
    "requiredPostcoordination": false,
    "allowMultipleValues": "No"
  }
]
```

---

## Tarea 4 — `actions/clinico/postcoordination.ts`

```typescript
// 'use server'

// getPostcoordinationAxes(entityId: string): Promise<ActionResult<PostcoordinationAxis[]>>
// - Llama getPostcoordinationAxes() de lib/icd/postcoordination.ts
// - Degradación elegante: si falla, retorna { success: true, data: [] }
// - Log de error con prefijo [ICD]

// checkPostcoordinationAvailability(entityId: string): Promise<ActionResult<{ available: boolean; required: boolean }>>
// - Llama obtenerEntidad() de lib/icd/entity.ts
// - Lee postcoordinationAvailability del resultado
// - Retorna { available: availability !== 'notAllowed', required: availability === 'required' }
// - Degradación elegante: si falla, retorna { success: true, data: { available: false, required: false } }
```

---

## Tarea 5 — `components/shared/PostcoordinationModal.tsx`

Modal de selección de ejes. `'use client'`. Va en `components/shared/` porque es compartido entre módulos médico y dental.

**Props**:
```typescript
interface PostcoordinationModalProps {
  entityId: string
  baseCode: ICDCodeSnap
  onConfirm: (postcoordination: PostcoordinationValue[]) => void
  onCancel: () => void
  initialValues?: PostcoordinationValue[]   // para editar postcoordination existente
}
```

**Comportamiento**:
- Al montar: llama `getPostcoordinationAxes(entityId)` — muestra spinner mientras carga
- Si retorna [] (API falló o no hay ejes): muestra mensaje "No hay ejes de postcoordination disponibles para este diagnóstico" + botón Cerrar
- Ejes con `required: true` → siempre visibles, label con asterisco rojo
- Ejes opcionales → los primeros 2 visibles, el resto colapsados bajo "Mostrar más ejes" (chevron)
- Cada eje renderiza:
  - Si `allowMultiple: false` → radio buttons
  - Si `allowMultiple: true` → checkboxes
- Footer: botón "Cancelar" + botón "Confirmar" (disabled si hay ejes required sin seleccionar)
- Al confirmar: construye array `PostcoordinationValue[]` con los ejes seleccionados y llama `onConfirm()`
- Si no se selecciona nada en ejes opcionales: `onConfirm([])` es válido

**Diseño**:
- Modal overlay con backdrop semitransparente
- Card centrada, max-w-lg, max-h-[80vh] con overflow-y-auto en el body
- Header: "Especificar diagnóstico" + código base en badge
- Tokens CSS: solo `var(--color-kp-*)`. Nunca hex hardcoded.

---

## Tarea 6 — Modificar `DiagnosticoSearch.tsx`

Agrega el flujo de postcoordination después de que el profesional selecciona un diagnóstico base.

**Nuevo estado**:
```typescript
const [pendingPostcoord, setPendingPostcoord] = useState<{
  result: ICDSearchResult
  snap: ICDCodeSnap
  available: boolean
} | null>(null)
```

**Flujo modificado en `handleSelect()`**:
```
1. Construir snap base (igual que antes)
2. Llamar checkPostcoordinationAvailability(result.id)
3. Si available === true:
   → setPendingPostcoord({ result, snap, available: true })
   → NO agregar a value todavía — esperar al modal
4. Si available === false:
   → onChange([...value, snap])  (flujo actual, sin cambios)
```

**Render del modal**:
```tsx
{pendingPostcoord && (
  <PostcoordinationModal
    entityId={pendingPostcoord.result.id}
    baseCode={pendingPostcoord.snap}
    onConfirm={(postcoordination) => {
      const finalSnap = { ...pendingPostcoord.snap, postcoordination }
      onChange([...value, finalSnap])
      setPendingPostcoord(null)
    }}
    onCancel={() => setPendingPostcoord(null)}
  />
)}
```

**Degradación**: si `checkPostcoordinationAvailability` falla, agregar el snap base sin postcoordination (no bloquear).

---

## Tarea 7 — Modificar `DiagnosticoChip.tsx`

Si `code.postcoordination` tiene items, mostrar indicador visual y los ejes en el tooltip.

**Indicador**: punto o badge pequeño junto al código cuando hay postcoordination:
```tsx
{code.postcoordination && code.postcoordination.length > 0 && (
  <span
    className="w-1.5 h-1.5 rounded-full shrink-0"
    style={{ backgroundColor: 'var(--color-kp-secondary)' }}
    title="Diagnóstico postcoordinado"
  />
)}
```

**En el tooltip**, después de la descripción:
```tsx
{!tooltipLoading && code.postcoordination && code.postcoordination.length > 0 && (
  <span className="block mt-2 pt-2 border-t border-kp-border">
    {code.postcoordination.map((pc) => (
      <span key={pc.axisName} className="block text-xs" style={{ color: 'var(--color-ink-2)' }}>
        <span className="font-medium">{pc.axisLabel}:</span> {pc.valueLabel}
      </span>
    ))}
  </span>
)}
```

---

## Orden de ejecución

```
1. lib/icd/types.ts          ← extender (no romper tipos existentes)
2. lib/icd/entity.ts         ← extender obtenerEntidad()
3. lib/icd/postcoordination.ts
4. actions/clinico/postcoordination.ts
5. npm run build             ← verificar que compila hasta aquí
6. components/shared/PostcoordinationModal.tsx
7. Modificar DiagnosticoSearch.tsx
8. Modificar DiagnosticoChip.tsx
9. npm run build             ← 0 errores obligatorio
```

---

## Criterios de aceptación

| Criterio | Condición |
|---|---|
| Build | `npm run build` = 0 errores, 0 warnings |
| Sin cambios de DB | Ninguna migration — `icd_codigos jsonb` ya soporta el campo `postcoordination` opcional |
| `ICDCodeSnap` backward compatible | Notas guardadas sin postcoordination siguen funcionando sin error |
| Detección | Diagnósticos con `postcoordinationAvailability = 'allowed'` muestran modal |
| Diagnósticos sin postcoord | Se agregan directamente sin abrir modal (flujo actual intacto) |
| Ejes required | Si hay ejes required, botón Confirmar deshabilitado hasta seleccionarlos |
| Ejes opcionales | Colapsados por defecto, expandibles. Confirmar sin seleccionarlos es válido |
| Degradación elegante | Si API de postcoord falla, diagnóstico se agrega sin postcoordination — sin bloqueo |
| Chip visual | Chips con postcoordination muestran indicador de punto ámbar |
| Tooltip | Tooltip muestra los ejes seleccionados por eje y valor |
| Compartido | Modal funciona en NotaClinicaForm y en módulo dental sin duplicar código |
| Tokens CSS | Solo `var(--color-kp-*)`, nunca hex hardcoded ni `var(--kp-*)` sin prefijo `--color-` |

---

## Lo que NO debes hacer en este sprint

- No crear migrations ni tocar DB
- No modificar `CifMapper` ni nada del módulo rehab
- No cambiar el comportamiento de diagnósticos sin postcoordination (flujo actual intacto)
- No hacer el modal obligatorio — siempre debe poder cancelarse
- No usar `var(--kp-*)` sin el prefijo `--color-` (bug documentado en informe módulo dental)
- No tocar `synapta` ni `korporis-fce`

---

## Al cerrar el sprint

1. `npm run build` — 0 errores
2. Actualizar `CLAUDE.md` sección "Sprints completados" con R-ICD-3
3. Commit: `feat(sprint-icd3)(clinico): postcoordination ICD-11 — diagnósticos compuestos para medicina y odontología`
4. Push a `main`
