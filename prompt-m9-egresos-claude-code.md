# Prompt para Claude Code — Módulo M9 Egresos

> Pega este prompt completo al iniciar la sesión de Claude Code en terminal.

---

## Contexto

Las migraciones de DB para M9 Egresos ya están aplicadas en Supabase. Tu trabajo es implementar todo el código del módulo: types, server actions, componentes, integración con Timeline, registry, guards, sidebar, y audit log.

Lee primero:
1. `CLAUDE.md`
2. `docs/plan-redisenio/00-vision-general.md`
3. `docs/plan-redisenio/04-criterios-tecnicos.md`

## Lo que ya existe en DB

### Tabla `fce_egresos` (ya creada)

```sql
id              uuid PK
id_clinica      uuid NOT NULL FK clinicas
id_paciente     uuid NOT NULL FK pacientes
id_encuentro    uuid FK fce_encuentros (nullable)
tipo_egreso     text NOT NULL CHECK (alta_clinica, abandono, derivacion, fallecimiento, otro)
diagnostico_egreso      text NOT NULL
resumen_tratamiento     text NOT NULL
estado_al_egreso        text
indicaciones_post_egreso text
derivacion_a            text
notas                   text
firmado         boolean NOT NULL DEFAULT false
firmado_at      timestamptz
firmado_por     uuid
created_by      uuid NOT NULL
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

- RLS habilitado con policy `tenant_isolation` (mismo patrón que `fce_notas_clinicas`)
- Trigger `trg_block_update_signed_egreso` bloquea UPDATE de campos clínicos cuando `firmado=true`

### Columna `pacientes.estado_clinico` (ya creada)

```sql
estado_clinico text NOT NULL DEFAULT 'activo' CHECK (activo, egresado)
```

### Módulo activado

`M9_egresos` ya está en `clinicas_fce_config.modulos_activos` de Renata.

---

## Tareas a implementar (en orden)

### 1. Types (`types/egreso.ts`)

```typescript
export interface Egreso {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  tipo_egreso: TipoEgreso;
  diagnostico_egreso: string;
  resumen_tratamiento: string;
  estado_al_egreso: string | null;
  indicaciones_post_egreso: string | null;
  derivacion_a: string | null;
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TipoEgreso = 'alta_clinica' | 'abandono' | 'derivacion' | 'fallecimiento' | 'otro';

export const TIPOS_EGRESO: { value: TipoEgreso; label: string }[] = [
  { value: 'alta_clinica', label: 'Alta clínica' },
  { value: 'abandono', label: 'Abandono de tratamiento' },
  { value: 'derivacion', label: 'Derivación' },
  { value: 'fallecimiento', label: 'Fallecimiento' },
  { value: 'otro', label: 'Otro' },
];
```

Agregar al re-export en `types/index.ts`.

### 2. Validación Zod (`lib/validations.ts`)

Agregar schema de validación para egreso:

```typescript
export const egresoSchema = z.object({
  tipo_egreso: z.enum(['alta_clinica', 'abandono', 'derivacion', 'fallecimiento', 'otro']),
  diagnostico_egreso: z.string().min(1, 'Diagnóstico de egreso es obligatorio'),
  resumen_tratamiento: z.string().min(1, 'Resumen de tratamiento es obligatorio'),
  estado_al_egreso: z.string().optional().nullable(),
  indicaciones_post_egreso: z.string().optional().nullable(),
  derivacion_a: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  id_encuentro: z.string().uuid().optional().nullable(),
});
```

### 3. Server Actions (`actions/egresos.ts`)

Implementar siguiendo el patrón exacto de `actions/clinico/nota-clinica.ts`:

**`createEgreso(patientId, data)`**
- Validar con `egresoSchema`
- Obtener `id_clinica` con `getIdClinica()`
- Obtener profesional con `getProfesionalActivo()`
- INSERT en `fce_egresos`
- Audit log: `accion: 'crear_egreso'`, `tabla_afectada: 'fce_egresos'`
- Retornar `ActionResult<{ id: string }>`

**`getEgreso(egresoId)`**
- SELECT con filtro por `id_clinica`
- Retornar `ActionResult<Egreso>`

**`getEgresosByPaciente(patientId)`**
- SELECT con filtro por `id_paciente` + `id_clinica`, ordenado por `created_at DESC`
- Retornar `ActionResult<Egreso[]>`

**`updateEgreso(egresoId, data)`**
- Solo si `firmado = false`
- Validar con `egresoSchema`
- UPDATE + audit log: `accion: 'editar_egreso'`
- Retornar `ActionResult`

**`signEgreso(egresoId)`**
- Verificar que el egreso existe y `firmado = false`
- Verificar que el usuario puede firmar (`assertPuedeFirmar` de guards.ts)
- UPDATE: `firmado = true`, `firmado_at = now()`, `firmado_por = profesional.id`
- **TAMBIÉN**: UPDATE `pacientes SET estado_clinico = 'egresado'` para el `id_paciente` del egreso
- Audit log: `accion: 'firmar_egreso'`
- Retornar `ActionResult`

**`reingresarPaciente(patientId)`**
- Verificar que `estado_clinico = 'egresado'`
- UPDATE `pacientes SET estado_clinico = 'activo'`
- Audit log: `accion: 'reingresar_paciente'`
- Retornar `ActionResult`

### 4. Registry (`lib/modules/registry.ts`)

Agregar `M9_egresos` al catálogo de módulos:

```typescript
M9_egresos: {
  id: "M9_egresos",
  label: "Egresos",
  descripcion: "Gestión de altas y egresos clínicos",
  obligatorio: false,
}
```

### 5. Guards (`lib/modules/guards.ts`)

Agregar guard `requireModuloEgresos()` siguiendo el patrón de los guards existentes. Verificar que `M9_egresos` esté en `modulos_activos` de la clínica.

### 6. Componentes

**`components/shared/EgresoForm.tsx`** — Formulario de egreso (compartido entre modelos)

- `'use client'`
- Usa `react-hook-form` + `zodResolver(egresoSchema)`
- Campos:
  - `tipo_egreso`: Select con opciones de `TIPOS_EGRESO`
  - `diagnostico_egreso`: Textarea (obligatorio)
  - `resumen_tratamiento`: Textarea (obligatorio)
  - `estado_al_egreso`: Textarea (opcional)
  - `indicaciones_post_egreso`: Textarea (opcional)
  - `derivacion_a`: Input text (solo visible si `tipo_egreso === 'derivacion'`)
  - `notas`: Textarea (opcional)
- Botón "Guardar borrador" + botón "Firmar y egresar"
- Si `readOnly=true` (egreso ya firmado): mostrar todo como solo lectura con badge de "Firmado"
- Usa tokens `var(--kp-*)` para colores. NUNCA Tailwind genéricos
- Componente `<AlertBanner>` para errores
- Seguir exactamente el mismo patrón visual que `NotaClinicaForm.tsx`

**`components/shared/EgresoCard.tsx`** — Card para mostrar en Timeline

- Muestra: tipo de egreso (con badge de color), diagnóstico, fecha, profesional que firmó
- Colores de badge por tipo:
  - `alta_clinica` → verde (usar `var(--kp-primary)` o similar semántico)
  - `abandono` → naranja
  - `derivacion` → azul
  - `fallecimiento` → gris
  - `otro` → gris claro
- Clicking en el card navega al detalle del egreso

**`components/shared/EgresoLauncher.tsx`** — Botón "Egresar paciente" en la ficha

- Solo visible si:
  - `M9_egresos` está activo para la clínica
  - `paciente.estado_clinico === 'activo'`
  - El usuario tiene rol que puede firmar (profesional, admin, director)
- Al hacer click, navega a la página de egreso

**`components/shared/ReingresoBanner.tsx`** — Banner en ficha de paciente egresado

- Solo visible si `paciente.estado_clinico === 'egresado'`
- Muestra: "Este paciente fue egresado el [fecha] — [tipo egreso]"
- Botón "Reingresar paciente" (con confirmación modal)
- Al reingresar, llama a `reingresarPaciente()` y refresca la página

### 7. Páginas

**`app/dashboard/pacientes/[id]/egreso/page.tsx`** — Página de egreso (Server Component)

- Guard: `requireModuloEgresos()`
- Si hay egreso activo sin firmar → mostrar formulario de edición
- Si no hay egreso activo → mostrar formulario nuevo
- Renderiza `<EgresoForm>`
- Pasar datos del paciente para contexto (nombre, diagnóstico actual)

**`app/dashboard/pacientes/[id]/egreso/[egresoId]/page.tsx`** — Detalle de egreso (read-only si firmado)

- Guard: `requireModuloEgresos()`
- Fetch del egreso por ID
- Renderiza `<EgresoForm readOnly={egreso.firmado}>` con datos pre-poblados

### 8. Integración con Timeline

En `actions/timeline.ts`, agregar fetch de egresos al `Promise.all`:

```typescript
// Agregar a la query paralela
supabase.from("fce_egresos")
  .select("id, tipo_egreso, diagnostico_egreso, firmado, firmado_at, firmado_por, created_at, created_by")
  .eq("id_paciente", patientId)
```

En `types/timeline.ts`, agregar `'egreso'` al tipo `TimelineEntryType`.

En `components/modules/ClinicalTimeline.tsx` (o donde se renderice el Timeline), agregar el case para `type === 'egreso'` que renderiza `<EgresoCard>`.

### 9. Integración con ficha del paciente

En `app/dashboard/pacientes/[id]/page.tsx`:

- Agregar `<EgresoLauncher>` en el PatientHeader o panel de acciones (junto al botón de iniciar encuentro)
- Agregar `<ReingresoBanner>` si `paciente.estado_clinico === 'egresado'`
- Si paciente está egresado, el botón "Iniciar atención" (`<EncuentroLauncher>`) debe estar deshabilitado con tooltip "Paciente egresado — reingresar para iniciar nueva atención"

### 10. Sidebar

En el componente Sidebar, agregar link a egreso dentro de la navegación del paciente, condicional a `M9_egresos` activo. Seguir el patrón de los otros links (M5, M7, etc.).

### 11. PatientActionNav

En `components/shared/PatientActionNav.tsx` (nav lateral de la ficha), agregar enlace a "Egresos" condicional a módulo activo.

### 12. Export PDF

En `actions/exportar-pdf.ts`, agregar sección de egreso al PDF de la ficha si existe un egreso firmado. Incluir: tipo, diagnóstico, resumen, indicaciones, fecha de firma.

---

## Reglas inquebrantables (recordatorio)

1. `npm run build` = 0 errores al terminar
2. Tokens `kp-*` solo vía CSS variables — nunca Tailwind genéricos, nunca hex
3. TypeScript strict — sin `any`
4. Audit log en toda escritura
5. Server Components por defecto, `'use client'` solo donde necesario
6. ActionResult<T> como retorno estándar de server actions
7. `getIdClinica()` en toda query
8. Documentos firmados = inmutables (ya protegido por trigger, pero no intentar UPDATE de campos clínicos en código)
9. Seguir patrones existentes — mirar `actions/clinico/nota-clinica.ts`, `components/clinico/NotaClinicaForm.tsx`, y `actions/prescripciones.ts` como referencia de cómo se implementan módulos similares

## Commits

```
feat(m9)(shared): types + validations egreso
feat(m9)(shared): server actions egresos CRUD + firma + reingreso
feat(m9)(shared): EgresoForm component
feat(m9)(shared): EgresoCard + EgresoLauncher + ReingresoBanner
feat(m9)(shared): pages egreso + routing
feat(m9)(shared): timeline integration + sidebar + nav
feat(m9)(shared): PDF export integration
```

## Test de verificación final

Al terminar, verificar manualmente:

1. Build limpio (`npm run build` = 0 errores, 0 warnings)
2. La ruta `/dashboard/pacientes/[id]/egreso` carga correctamente
3. El formulario muestra/oculta `derivacion_a` según tipo seleccionado
4. El botón "Egresar paciente" solo aparece si M9 activo + paciente activo
5. El Timeline muestra entries de egreso
6. El banner de reingreso aparece para pacientes egresados

## Actualización del CLAUDE.md al terminar

Agregar a la sección 7 (Módulos clínicos):

```
| M9_egresos | `fce_egresos` | no |
```

Agregar a la sección 8 (Tablas DB — Con `id_clinica`): `fce_egresos`

Agregar a la sección 14 (Estado del proyecto — DB aplicada fuera de sprints):

```
| `fce_egresos` + `pacientes.estado_clinico` + M9 activo en Renata | 2026-04-27 |
```

Agregar `M9_egresos` al scope de commits:

```
Scopes: (clinico), (rehab), (shared), (registry), (guards), (branding), (m9).
```
