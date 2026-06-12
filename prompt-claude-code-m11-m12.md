# Sprint M11-M12: Presupuestos + Informes Clínicos + Hub de Documentos + Fix PDF Ficha Completa

## Contexto
Las migrations ya están aplicadas en Supabase (2026-06-10). Las tablas existen:
- `fce_presupuestos` + `fce_presupuesto_items` (M11)
- `fce_informes` (M12) — con trigger `trg_block_update_signed_informe`

RLS con `get_clinica_ids_for_user()` en las 3 tablas. Precio en CLP enteros.

## Objetivo
Tres cosas en este sprint:
1. Implementar M11 (Presupuestos) y M12 (Informes Clínicos) como módulos compartidos para TODAS las especialidades clínicas
2. **Refactorizar `exportar-pdf` como hub de documentos** — eliminar la descarga automática del PDF. La página debe mostrar tabs y el usuario decide qué documento quiere
3. **Fix crítico: PDF de ficha clínica completa** — hoy solo exporta datos M1 del paciente. Según Decreto 41 y Ley 20.584, debe incluir TODO el registro clínico (anamnesis, evoluciones, instrumentos, prescripciones, consentimientos, etc.)

## Tareas ordenadas

### 1. Tipos TypeScript
Crear `src/types/presupuesto.ts` y `src/types/informe.ts`:

**presupuesto.ts:**
```typescript
export interface Presupuesto {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_profesional: string;
  titulo: string;
  estado: 'borrador' | 'enviado';
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  created_at: string;
  updated_at: string;
  items?: PresupuestoItem[];
  profesional?: { nombre: string; especialidad: string };
}

export interface PresupuestoItem {
  id: string;
  id_presupuesto: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number; // CLP enteros
  orden: number;
}

export type PresupuestoFormData = {
  titulo: string;
  notas?: string;
  items: Omit<PresupuestoItem, 'id' | 'id_presupuesto' | 'created_at'>[];
};
```

**informe.ts:**
```typescript
export type TipoInforme = 'isapre' | 'colegio' | 'laboral' | 'judicial' | 'otro';

export interface InformeClinico {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_profesional: string;
  tipo: TipoInforme;
  destinatario: string | null;
  titulo: string;
  contenido: string;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_at: string;
  updated_at: string;
  profesional?: { nombre: string; especialidad: string };
}

export type InformeFormData = {
  tipo: TipoInforme;
  destinatario?: string;
  titulo: string;
  contenido: string;
};
```

### 2. Server Actions
Crear `src/app/actions/presupuestos.ts` y `src/app/actions/informes.ts`.

Seguir el patrón existente de `prescripciones.ts`:
- Auth con `supabase.auth.getUser()`
- Obtener profesional activo con `getProfesionalActivo()`
- `ActionResult<T>` como tipo de retorno
- Audit log en `logs_auditoria` para crear, firmar y exportar PDF

**presupuestos.ts** — acciones:
- `getPresupuestos(idPaciente)` — lista con items, JOIN profesional nombre
- `getPresupuesto(id)` — uno con items
- `crearPresupuesto(idPaciente, data: PresupuestoFormData, idEncuentro?: string)` — INSERT padre + items en transacción. Audit: `presupuesto_creado`
- `actualizarPresupuesto(id, data: PresupuestoFormData)` — solo si `firmado=false`. DELETE items existentes + INSERT nuevos
- `firmarPresupuesto(id)` — UPDATE `firmado=true, firmado_at=now(), estado='enviado'`. Audit: `presupuesto_firmado`
- `eliminarPresupuesto(id)` — solo si `firmado=false`. Audit: `presupuesto_eliminado`

**informes.ts** — acciones:
- `getInformes(idPaciente)` — lista JOIN profesional nombre
- `getInforme(id)` — uno
- `crearInforme(idPaciente, data: InformeFormData, idEncuentro?: string)` — INSERT. Audit: `informe_creado`
- `actualizarInforme(id, data: InformeFormData)` — solo si `firmado=false`
- `firmarInforme(id)` — UPDATE `firmado=true, firmado_at=now(), firmado_por=profesional.id`. Audit: `informe_firmado`
- `eliminarInforme(id)` — solo si `firmado=false`. Audit: `informe_eliminado`

### 3. Componentes UI

Ubicación: `src/components/modules/`

**PresupuestoForm.tsx** (`'use client'`)
- Campos: titulo, notas (opcional)
- Lista dinámica de items: descripcion, cantidad, precio_unitario
- Botones agregar/eliminar item
- Total calculado en vivo (suma de cantidad × precio_unitario, formateado CLP con separador de miles)
- Botón "Guardar borrador" + "Firmar y enviar"
- Si recibe presupuesto existente → modo edición (solo si no firmado)

**PresupuestoList.tsx** (`'use client'`)
- Lista de presupuestos del paciente con estado (badge borrador/enviado)
- Click → ver detalle / editar si borrador
- Botón "Exportar PDF"
- Botón "Nuevo presupuesto"

**PresupuestoPdfView.tsx** (`'use client'`)
- Componente oculto para html2pdf.js (patrón de RecetaPdfView)
- Membrete de clínica (logo + nombre + dirección)
- Datos paciente: nombre, RUT, previsión
- Tabla: descripción | cantidad | precio unitario | subtotal
- Total
- Datos del profesional firmante
- Fecha
- **Usar hex hardcoded, no CSS vars** (html2pdf.js no las resuelve)
- **escapeHtml()** en todos los campos de texto

**InformeForm.tsx** (`'use client'`)
- Campos: tipo (select: isapre/colegio/laboral/judicial/otro), destinatario, titulo, contenido (textarea grande)
- Integración con Copiloto IA opcional: mismo patrón que `CopilotoNotaButton` — botón que toma el contenido actual y lo estructura. Modelo `claude-sonnet-4-6`. **Solo si tieneCopilotoIA del especialidad-config es true**.
- Botón "Guardar borrador" + "Firmar"
- Si recibe informe existente → modo edición (solo si no firmado)

**InformeList.tsx** (`'use client'`)
- Lista de informes del paciente con tipo (badge) y estado
- Click → ver detalle / editar si borrador
- Botón "Exportar PDF"
- Botón "Nuevo informe"

**InformePdfView.tsx** (`'use client'`)
- Mismo patrón que PresupuestoPdfView
- Membrete clínica
- Tipo + destinatario
- Titulo como encabezado
- Contenido del informe
- Firma: nombre profesional + especialidad + numero_registro + tipo_registro
- Fecha de firma
- **Usar hex hardcoded + escapeHtml()**

### 4. Refactor de exportar-pdf → Hub de Documentos

#### BUG CRÍTICO: eliminar la descarga automática del PDF

Hoy, al navegar a `/dashboard/pacientes/[id]/exportar-pdf`, el PDF se descarga automáticamente. Esto debe DEJAR de ocurrir. La página debe mostrar el hub con tabs y el usuario decide qué quiere hacer. La descarga solo ocurre cuando el usuario hace clic explícito en un botón "Descargar PDF".

#### Refactor de la página

Modificar `src/app/dashboard/pacientes/[id]/exportar-pdf/page.tsx`:

Convertir en un hub con tabs (usar el componente `Tabs` de ui/):
- **Ficha Clínica** — botón "Descargar ficha completa (PDF)" + preview de secciones incluidas
- **Presupuestos** — `PresupuestoList` + crear/editar
- **Informes** — `InformeList` + crear/editar
- **Epicrisis** — solo visible si hay egreso firmado (componente EpicrisisPdfView ya existe)

Navegación con query params (?tab=presupuestos) para que sea linkeable.

#### FIX CRÍTICO: PDF de ficha clínica completa (Decreto 41, Ley 20.584)

El PDF actual solo exporta datos del paciente (M1). Según normativa chilena, la exportación de la ficha clínica electrónica debe incluir TODO el registro clínico. Refactorizar `actions/exportar-pdf.ts` para compilar la ficha completa.

**Server action `exportarFichaCompletaPdf(idPaciente)`** — debe hacer `Promise.all` de todas estas queries:

```typescript
const [
  paciente,           // pacientes WHERE id = idPaciente
  anamnesis,          // fce_anamnesis WHERE id_paciente (una por paciente)
  encuentros,         // fce_encuentros WHERE id_paciente ORDER BY started_at DESC
  signosVitales,      // fce_signos_vitales WHERE id_paciente — JOIN encuentros para fecha
  notasSoap,          // fce_notas_soap WHERE id_paciente AND firmado=true — JOIN encuentros para especialidad/fecha
  notasClinicas,      // fce_notas_clinicas WHERE id_paciente AND firmado=true — JOIN encuentros
  evaluaciones,       // fce_evaluaciones WHERE id_paciente — JOIN encuentros
  instrumentos,       // instrumentos_aplicados WHERE id_paciente — JOIN instrumentos_valoracion(codigo, nombre)
  consentimientos,    // fce_consentimientos WHERE id_paciente AND firmado=true
  prescripciones,     // fce_prescripciones WHERE id_paciente AND firmado=true
  ordenesExamen,      // fce_ordenes_examen WHERE id_paciente AND firmado=true
  planesIntervencion, // fce_planes_intervencion WHERE id_paciente — JOIN fce_plan_objetivos
  egreso,             // fce_egresos WHERE id_paciente AND firmado=true (último)
  clinica,            // clinicas WHERE id = idClinica (para header)
] = await Promise.all([...]);
```

**Notas sobre queries sin id_clinica directa:**
- `fce_notas_soap`, `fce_evaluaciones`: filtrar via `id_encuentro IN (SELECT id FROM fce_encuentros WHERE id_clinica IN (get_clinica_ids...))`
- O más simple: hacer el JOIN en la query: `.select('*, encuentro:fce_encuentros!inner(id_clinica, especialidad, started_at)')`

**Estructura del PDF (orden de secciones):**

1. **Header**: logo clínica + nombre + RUT empresa + dirección + teléfono + email
2. **Título**: "FICHA CLÍNICA ELECTRÓNICA" + fecha de generación
3. **Identificación del paciente (M1)**: nombre completo, RUT, fecha nacimiento, edad, sexo registral, identidad de género (si aplica), nacionalidad, ocupación, previsión (sistema + nombre), dirección, contacto emergencia, estado clínico
4. **Anamnesis (M2)**: motivo consulta, antecedentes médicos (parsear jsonb), antecedentes quirúrgicos, farmacología activa, alergias, red flags activas, hábitos
5. **Registro de encuentros**: tabla resumen con fecha, especialidad, profesional, status
6. **Signos vitales**: tabla cronológica — fecha | PA | FC | SpO2 | T° | FR
7. **Evoluciones SOAP** (firmadas, orden cronológico): por cada una → fecha, especialidad, profesional, S, O, A (CIF si existe), P, intervenciones, tareas domiciliarias
8. **Notas clínicas** (firmadas, orden cronológico): por cada una → fecha, especialidad, profesional, motivo, contenido, diagnóstico + ICD, plan
9. **Evaluaciones**: por cada una → fecha, especialidad, sub_area, datos relevantes del jsonb `data`
10. **Instrumentos aplicados**: por cada uno → fecha, nombre instrumento, puntaje, interpretación, notas
11. **Consentimientos** (firmados): tipo, fecha de firma
12. **Prescripciones** (firmadas): folio, tipo, medicamentos/indicaciones, fecha, profesional
13. **Órdenes de examen** (firmadas): folio, exámenes, diagnóstico presuntivo, prioridad, fecha
14. **Plan de intervención** (si existe): título, diagnóstico, estado, objetivos con dominio + nivel GAS
15. **Egreso/Epicrisis** (si existe y firmado): tipo, diagnóstico, resumen tratamiento, estado al egreso, indicaciones, derivación

**Reglas del PDF:**
- Cada sección solo aparece si tiene datos (no mostrar secciones vacías)
- Secciones con múltiples entries van en orden cronológico
- Usar `escapeHtml()` en TODOS los campos de texto
- Usar hex hardcoded (html2pdf.js no resuelve CSS vars)
- Parsear correctamente los campos jsonb: antecedentes_medicos, farmacologia, alergias, medicamentos, examenes, analisis_cif, etc. — cada uno tiene su estructura propia, revisar el código existente de los componentes que ya los renderizan
- Footer en cada página: "Ficha Clínica Electrónica — {nombre clínica} — Generado el {fecha}"
- Audit log: `exportar_ficha_clinica`

**Crear `src/lib/ficha-clinica/pdf-renderer.ts`** con función `renderFichaCompletaPdf(data)` que recibe toda la data y retorna HTML string. Seguir el patrón de `lib/prescripciones/pdf-renderer.ts` y `lib/egresos/pdf-renderer.ts`.

### 5. Registry y Config

**registry.ts** — agregar:
```typescript
M11_presupuestos: { id: 'M11_presupuestos', tablas: ['fce_presupuestos', 'fce_presupuesto_items'] }
M12_informes: { id: 'M12_informes', tablas: ['fce_informes'] }
```

**especialidad-config.ts** — agregar `tienePresupuesto: true` y `tieneInformes: true` a TODAS las especialidades clínicas (todas excepto 'Administración Clínica' y 'ninguno'). Estos flags controlan visibilidad de los tabs en el hub.

**guards.ts** — agregar helpers:
```typescript
export function requirePresupuestos(modulosActivos: string[]) { ... }
export function requireInformes(modulosActivos: string[]) { ... }
```

### 6. Copiloto IA para Informes (opcional en este sprint)
Si hay tiempo, integrar el botón de Copiloto IA en InformeForm. System prompt específico:
```
Eres un asistente de redacción clínica. Estructura y mejora el siguiente borrador de informe clínico.
Tipo de informe: {tipo}. Destinatario: {destinatario}.
Mantén terminología clínica profesional. No inventes datos.
Responde SOLO con el texto del informe mejorado, sin preámbulos.
```
Modelo: `claude-sonnet-4-6`. Audit: `informe_estructurado_ia`. Mismo disclaimer que el copiloto de notas.

### 7. Versionar migrations
Copiar los archivos SQL al repo:
- `supabase/migrations/20260610_01_m11_presupuestos.sql`
- `supabase/migrations/20260610_02_m12_informes_clinicos.sql`

(Los archivos están en la raíz del proyecto, moverlos a supabase/migrations/)

### 8. Actualizar CLAUDE.md
En la tabla de módulos clínicos (sección 7), agregar:
```
| M11_presupuestos | `fce_presupuestos`, `fce_presupuesto_items` | beta | no |
| M12_informes | `fce_informes` | beta | no |
```

En la sección 10 (estructura del proyecto), agregar:
- `actions/presupuestos.ts` y `actions/informes.ts`
- Componentes en `components/modules/`

En la sección de triggers (si existe), agregar `trg_block_update_signed_informe`.

## Reglas a seguir (del CLAUDE.md)
- Server Components por defecto, `'use client'` solo cuando necesario
- `ActionResult<T>` como retorno de server actions
- `getProfesionalActivo()` de `src/lib/fce/profesional.ts` para obtener el profesional
- Tokens CSS: `var(--color-kp-*)` NUNCA `var(--kp-*)`
- html2pdf.js: `const html2pdf = (await import("html2pdf.js")).default` — dynamic import
- PdfViews: hex hardcoded + escapeHtml() obligatorio
- No `if (especialidad === '...')` en componentes — usar `getEspecialidadConfig()`
- Audit log obligatorio en crear, firmar, exportar PDF
- Commits: `feat(sprint-m11)(shared): ...` y `feat(sprint-m12)(shared): ...`

## Schema DB (referencia rápida)

```sql
-- M11
fce_presupuestos (id uuid PK, id_clinica, id_paciente, id_encuentro nullable,
  id_profesional, titulo text, estado text CHECK(borrador|enviado),
  notas text, firmado bool, firmado_at timestamptz,
  created_at, updated_at)

fce_presupuesto_items (id uuid PK, id_presupuesto FK CASCADE,
  descripcion text, cantidad int CHECK(>0), precio_unitario int CHECK(>=0),
  orden int, created_at)

-- M12
fce_informes (id uuid PK, id_clinica, id_paciente, id_encuentro nullable,
  id_profesional, tipo text CHECK(isapre|colegio|laboral|judicial|otro),
  destinatario text, titulo text, contenido text,
  firmado bool, firmado_at timestamptz, firmado_por FK profesionales,
  created_at, updated_at)
-- Trigger: trg_block_update_signed_informe (inmutabilidad post-firma)
```

## Schema de tablas para PDF de ficha completa (referencia de queries)

**Queries directas por id_paciente + id_clinica:**
- `pacientes`: nombre, apellido_paterno, apellido_materno, rut, fecha_nacimiento, sexo_registral, identidad_genero, nacionalidad, ocupacion, prevision (jsonb), direccion (jsonb), contacto_emergencia (jsonb), estado_clinico
- `fce_anamnesis`: motivo_consulta, antecedentes_medicos (jsonb), antecedentes_quirurgicos (jsonb), farmacologia (jsonb), alergias (jsonb), red_flags (jsonb), habitos (jsonb)
- `fce_signos_vitales`: presion_arterial, frecuencia_cardiaca, spo2, temperatura, frecuencia_respiratoria, id_encuentro (JOIN para fecha)
- `fce_consentimientos`: tipo, contenido, firmado, firmado_at
- `instrumentos_aplicados` JOIN `instrumentos_valoracion`: nombre instrumento, puntaje_total, interpretacion, notas, aplicado_at
- `fce_prescripciones`: folio_display, tipo, medicamentos (jsonb), indicaciones_generales, diagnostico_asociado, firmado_at, prof_nombre_snapshot
- `fce_ordenes_examen`: folio_display, examenes (jsonb), diagnostico_presuntivo, prioridad, firmado_at, prof_nombre_snapshot
- `fce_egresos`: tipo_egreso, diagnostico_egreso, resumen_tratamiento, estado_al_egreso, indicaciones_post_egreso, derivacion_a, snapshot_equipo_tratante (jsonb)
- `fce_planes_intervencion` + `fce_plan_objetivos`: titulo, diagnostico, estado, objetivos con dominio_label, descripcion, criterio_logro, nivel GAS

**Queries via JOIN a fce_encuentros (no tienen id_clinica propia o filtran via encuentro):**
- `fce_notas_soap` (firmadas): subjetivo, objetivo, analisis_cif (jsonb), plan, intervenciones (jsonb), tareas_domiciliarias — JOIN encuentros para especialidad + started_at
- `fce_notas_clinicas` (firmadas): motivo_consulta, contenido, diagnostico, icd_codigos (jsonb), plan, secciones_estructuradas (jsonb) — JOIN encuentros
- `fce_evaluaciones`: especialidad, sub_area, data (jsonb) — JOIN encuentros

**Eje temporal:**
- `fce_encuentros`: id, especialidad, status, started_at, ended_at, id_profesional

**Header PDF:**
- `clinicas`: nombre, rut_empresa, direccion, comuna, ciudad, telefono, email. Logo desde branding config.
