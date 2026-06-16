# Sprint A1 — UI de Adendas, Erratas y Anulaciones

> **Estado**: En planificación · **Fecha**: 2026-06-14
> **Estimación**: 3-4 días · **Riesgo**: Medio
> **Pre-requisito**: Sprint A0 completado (tabla `fce_adendas` existe, helpers `requireContext` + `logAudit` disponibles)

---

## Objetivo

Permitir que un profesional corrija o complemente una nota firmada **sin alterar la nota original**, cumpliendo Ley 20.584 y Decreto 41. Tres mecanismos: adenda (complementar), errata (corregir error), anulación (invalidar nota completa). Todo aditivo, todo auditable, todo visible en el Timeline y en el PDF de ficha completa.

**Alcance A1**: cubre `soap` y `nota_clinica` únicamente. Los otros 5 tipos firmables (periograma, egreso, prescripción, orden_examen, consentimiento) quedan para A1.2 — la tabla ya los soporta, solo falta el botón en sus cards.

---

## Decisiones aprobadas

| Decisión | Resolución |
|---|---|
| PDF con adendas | **Sí, en A1**. Ficha exportada sin adendas es legalmente incompleta. |
| Override de director (errata >72h) | **Lógica server completa + UI mínima**. Sin flujo asíncrono. |
| Documentos cubiertos | **Solo `soap` + `nota_clinica`**. Resto en A1.2. |
| Visualización | **Entries propias en Timeline** + badge en nota original. |

### Matriz de permisos (núcleo del sprint)

| Tipo | Quién puede | Ventana | Requiere motivo override |
|---|---|---|---|
| **adenda** | Cualquier profesional con acceso al paciente | Siempre | No |
| **errata** | Autor original | ≤72h desde `firmado_at` | No |
| **errata** | Director / admin / superadmin | >72h | **Sí** (`override_motivo`) |
| **anulacion** | Solo director / admin / superadmin | Siempre | **Sí** (`override_motivo`) |

**Regla inviolable**: la nota original NUNCA se edita ni se borra. Todo es aditivo. La anulación marca visualmente la nota como anulada pero la nota permanece visible.

---

## Parte 1 — Server Action

### Archivo nuevo: `src/app/actions/adendas.ts`

```typescript
"use server";

import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { TipoDocumentoFirmable, TipoAdenda } from "@/types/adenda";

const VENTANA_ERRATA_MS = 72 * 60 * 60 * 1000; // 72 horas
const ROLES_AUTORIZADORES = ["director", "admin", "superadmin"];

interface CrearAdendaInput {
  tipoDocumento: TipoDocumentoFirmable;
  idDocumento: string;
  idPaciente: string;
  idEncuentro?: string | null;
  tipoAdenda: TipoAdenda;
  motivo: string;
  contenido: string;
  overrideMotivo?: string; // requerido si errata >72h o anulación
}

/**
 * Mapeo tipo_documento → tabla física, para leer firmado_at y created_by del original.
 */
const TABLA_POR_TIPO: Record<TipoDocumentoFirmable, string> = {
  soap: "fce_notas_soap",
  nota_clinica: "fce_notas_clinicas",
  periograma: "fce_periograma",
  egreso: "fce_egresos",
  prescripcion: "fce_prescripciones",
  orden_examen: "fce_ordenes_examen",
  consentimiento: "fce_consentimientos",
};

export async function crearAdenda(
  input: CrearAdendaInput
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica, rol, profesionalId } = await requireContext();

  if (!profesionalId) {
    return { success: false, error: "No tienes un perfil profesional activo" };
  }

  // Validaciones de contenido
  if (!input.motivo?.trim()) {
    return { success: false, error: "El motivo es obligatorio" };
  }
  if (!input.contenido?.trim()) {
    return { success: false, error: "El contenido es obligatorio" };
  }

  // 1. Leer el documento original para validar firma y autoría
  const tabla = TABLA_POR_TIPO[input.tipoDocumento];
  const { data: original, error: errOriginal } = await supabase
    .from(tabla)
    .select("id, firmado, firmado_at, created_by")
    .eq("id", input.idDocumento)
    .single();

  if (errOriginal || !original) {
    return { success: false, error: "Documento original no encontrado" };
  }
  if (!original.firmado) {
    return {
      success: false,
      error: "Solo se pueden agregar adendas a documentos firmados",
    };
  }

  const esAutorizador = ROLES_AUTORIZADORES.includes(rol);
  const esAutorOriginal = original.created_by === profesionalId;

  // 2. Validar permisos según tipo de adenda
  let overrideDirector = false;

  if (input.tipoAdenda === "adenda") {
    // Cualquier profesional con acceso puede. RLS ya garantiza tenant.
    // Sin restricciones adicionales.
  } else if (input.tipoAdenda === "errata") {
    const firmadoAt = original.firmado_at ? new Date(original.firmado_at).getTime() : 0;
    const dentroVentana = Date.now() - firmadoAt <= VENTANA_ERRATA_MS;

    if (dentroVentana) {
      // Dentro de 72h: solo el autor original
      if (!esAutorOriginal && !esAutorizador) {
        return {
          success: false,
          error: "Solo el autor original puede corregir esta nota dentro de las primeras 72 horas",
        };
      }
    } else {
      // Fuera de 72h: solo autorizador, con motivo
      if (!esAutorizador) {
        return {
          success: false,
          error: "Han pasado más de 72 horas. Esta corrección requiere autorización de un director",
        };
      }
      if (!input.overrideMotivo?.trim()) {
        return {
          success: false,
          error: "Debes indicar el motivo de autorización para corregir una nota con más de 72 horas",
        };
      }
      overrideDirector = true;
    }
  } else if (input.tipoAdenda === "anulacion") {
    // Solo autorizador, siempre con motivo
    if (!esAutorizador) {
      return {
        success: false,
        error: "Solo un director puede anular una nota",
      };
    }
    if (!input.overrideMotivo?.trim()) {
      return { success: false, error: "Debes indicar el motivo de anulación" };
    }
    overrideDirector = true;
  }

  // 3. Insertar la adenda
  const { data: adenda, error: errInsert } = await supabase
    .from("fce_adendas")
    .insert({
      id_clinica: idClinica,
      id_paciente: input.idPaciente,
      id_encuentro: input.idEncuentro ?? null,
      tipo_documento: input.tipoDocumento,
      id_documento: input.idDocumento,
      tipo_adenda: input.tipoAdenda,
      motivo: input.motivo.trim(),
      contenido: input.contenido.trim(),
      override_director: overrideDirector,
      override_motivo: overrideDirector ? input.overrideMotivo!.trim() : null,
      override_por: overrideDirector ? user.id : null,
      created_by: profesionalId,
      // Las adendas se firman automáticamente al crearse (son declaraciones del profesional)
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesionalId,
    })
    .select("id")
    .single();

  if (errInsert || !adenda) {
    return { success: false, error: "No se pudo guardar la adenda" };
  }

  // 4. Audit log
  const tipoEvento =
    input.tipoAdenda === "errata"
      ? overrideDirector
        ? "errata_post_ventana"
        : "create_errata"
      : input.tipoAdenda === "anulacion"
        ? "create_anulacion"
        : "create_adenda";

  await logAudit({
    supabase,
    actorId: user.id,
    accion: `crear_${input.tipoAdenda}`,
    tipoEvento,
    tablaAfectada: "fce_adendas",
    registroId: adenda.id,
    idClinica,
    idPaciente: input.idPaciente,
    datosAfter: {
      tipo_documento: input.tipoDocumento,
      id_documento: input.idDocumento,
      tipo_adenda: input.tipoAdenda,
      override_director: overrideDirector,
    },
  });

  revalidatePath(`/dashboard/pacientes/${input.idPaciente}`);
  return { success: true, data: { id: adenda.id } };
}

/**
 * Lista adendas de un documento específico (para badge count + render).
 */
export async function getAdendasDeDocumento(
  tipoDocumento: TipoDocumentoFirmable,
  idDocumento: string
): Promise<ActionResult<AdendaConAutor[]>> {
  const { supabase } = await requireContext();

  const { data, error } = await supabase
    .from("fce_adendas")
    .select(`
      *,
      autor:profesionales!fce_adendas_created_by_fkey(nombre, apellido, especialidad)
    `)
    .eq("tipo_documento", tipoDocumento)
    .eq("id_documento", idDocumento)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: "No se pudieron cargar las adendas" };
  }
  return { success: true, data: data ?? [] };
}
```

> **Nota sobre el JOIN a `profesionales`**: verificar el nombre real de la FK constraint en DB (`fce_adendas_created_by_fkey`). Si `created_by` no tiene FK declarada a `profesionales`, hacer el lookup por separado o agregar la FK. Confirmar antes de implementar.

---

## Parte 2 — Tipos TypeScript

### Actualizar `src/types/adenda.ts`

```typescript
export type TipoDocumentoFirmable =
  | "soap" | "nota_clinica" | "periograma"
  | "egreso" | "prescripcion" | "orden_examen" | "consentimiento";

export type TipoAdenda = "adenda" | "errata" | "anulacion";

export interface FCEAdenda {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  tipo_documento: TipoDocumentoFirmable;
  id_documento: string;
  tipo_adenda: TipoAdenda;
  motivo: string;
  contenido: string;
  override_director: boolean;
  override_motivo: string | null;
  override_por: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdendaConAutor extends FCEAdenda {
  autor: {
    nombre: string;
    apellido: string;
    especialidad: string;
  } | null;
}
```

### Actualizar `src/types/timeline.ts`

Agregar `adenda` al tipo de entry:

```typescript
export type TimelineEntryType =
  | "soap"
  | "evaluacion"
  | "nota_clinica"
  | "instrumento"
  | "signos_vitales"
  | "consentimiento"
  | "adenda"; // ← NUEVO

// Si TimelineEntry tiene campos específicos, agregar metadata de adenda:
export interface AdendaTimelineMeta {
  tipo_adenda: TipoAdenda;
  tipo_documento_original: TipoDocumentoFirmable;
  id_documento_original: string;
  motivo: string;
}
```

---

## Parte 3 — Timeline: entries de adenda + badge

### 3.1 Query del Timeline incluye adendas

En `src/app/actions/timeline.ts`, función `getPatientTimeline` (o `getTimelineClinico`):

Agregar al `Promise.all` la query de adendas:

```typescript
supabase
  .from("fce_adendas")
  .select(`
    id, tipo_adenda, tipo_documento, id_documento, motivo, contenido,
    created_at, created_by, override_director,
    autor:profesionales!fce_adendas_created_by_fkey(nombre, apellido)
  `)
  .eq("id_paciente", patientId)
  .order("created_at", { ascending: false }),
```

Mapear cada adenda a un `TimelineEntry` con `type: "adenda"`. La fecha del entry es `created_at` de la adenda (no la del documento original).

### 3.2 Badge en la nota original

Al construir los entries de `soap` y `nota_clinica`, calcular cuántas adendas tiene cada uno:

```typescript
// Después de cargar soaps + adendas, antes de mapear a TimelineEntry:
const adendasPorDoc = new Map<string, { count: number; tieneErrata: boolean; anulada: boolean }>();
for (const a of adendas) {
  const key = `${a.tipo_documento}:${a.id_documento}`;
  const prev = adendasPorDoc.get(key) ?? { count: 0, tieneErrata: false, anulada: false };
  adendasPorDoc.set(key, {
    count: prev.count + 1,
    tieneErrata: prev.tieneErrata || a.tipo_adenda === "errata",
    anulada: prev.anulada || a.tipo_adenda === "anulacion",
  });
}
// Inyectar este metadata en cada entry de soap/nota_clinica
```

### 3.3 Componente `AdendaExpandedCard.tsx`

Nuevo, en `src/components/shared/` (o donde vivan las ExpandedCard). Similar a `ConsentimientoExpandedCard` — solo lectura, sin acciones.

Muestra:
- Badge de tipo: "Adenda" (neutro) / "Errata" (ámbar) / "Anulación" (rojo)
- Referencia: "Sobre Nota Clínica del DD/MM" con link al documento original
- Motivo
- Contenido
- Autor + fecha + hora
- Si `override_director`: línea "Autorizado por dirección: {override_motivo}"

Usar tokens `var(--color-kp-*)`, nunca `var(--kp-*)` (regla del informe dental).

### 3.4 Badge en SoapExpandedCard + NotaClinicaExpandedCard

En el header de cada card, si el entry tiene adendas:

```tsx
{adendaMeta && adendaMeta.count > 0 && (
  <span className="badge">
    {adendaMeta.anulada
      ? "Anulada"
      : adendaMeta.tieneErrata
        ? "Corregida"
        : `${adendaMeta.count} adenda${adendaMeta.count > 1 ? "s" : ""}`}
  </span>
)}
```

Si `anulada`, además aplicar estilo visual a toda la card (texto atenuado / tachado en el título) para señalar que la nota fue invalidada — pero **sin ocultar el contenido**.

---

## Parte 4 — Modal de creación (patrón callback Rx/Orden)

### 4.1 `AdendaModal.tsx` (nuevo)

En `src/components/shared/` o `src/components/clinico/`.

Props:
```typescript
interface AdendaModalProps {
  open: boolean;
  onClose: () => void;
  // Datos del documento sobre el que se crea la adenda
  tipoDocumento: TipoDocumentoFirmable;
  idDocumento: string;
  idPaciente: string;
  idEncuentro?: string | null;
  documentoFirmadoAt: string;  // para calcular ventana 72h en el cliente (solo UI)
  documentoCreatedBy: string;  // profesionalId del autor original
  // Contexto del usuario actual (para decidir qué tipos puede crear)
  profesionalIdActual: string;
  rolActual: string;
  onSuccess: () => void; // refrescar timeline
}
```

Comportamiento:
1. Selector de tipo: Adenda / Errata / Anulación
   - **Adenda**: siempre disponible
   - **Errata**: disponible si es autor original (dentro 72h) o rol autorizador
   - **Anulación**: disponible solo si rol autorizador
   - Tipos no disponibles aparecen deshabilitados con tooltip explicando por qué
2. Campos: `motivo` (input corto) + `contenido` (textarea)
3. **Lógica de ventana 72h** (cálculo en cliente solo para UX — la validación real es server-side):
   - Si tipo=errata y `Date.now() - firmadoAt > 72h`:
     - Si rol autorizador → mostrar campo `overrideMotivo` con label "Motivo de autorización (corrección tardía)"
     - Si no autorizador → bloquear submit con mensaje: "Han pasado más de 72h. Esta corrección requiere autorización de un director."
   - Si tipo=anulacion → siempre mostrar campo `overrideMotivo` con label "Motivo de anulación"
4. Submit → `crearAdenda(input)` → si success, `onSuccess()` + `onClose()`
5. Mostrar errores del server en `<AlertBanner>`

> **Importante**: el cálculo de 72h en cliente es solo para mostrar/ocultar campos. El server **revalida siempre**. Nunca confiar en el cliente para la decisión de permiso.

### 4.2 Cablear en `ClinicalTimeline.tsx`

Seguir el patrón exacto de `PrescripcionDetalleModal` / `OrdenExamenDetalleModal`:

```tsx
const [adendaTarget, setAdendaTarget] = useState<{
  tipoDocumento: TipoDocumentoFirmable;
  idDocumento: string;
  firmadoAt: string;
  createdBy: string;
  idEncuentro: string | null;
} | null>(null);

// ... en el render, al final (portal):
{adendaTarget && (
  <AdendaModal
    open={!!adendaTarget}
    onClose={() => setAdendaTarget(null)}
    tipoDocumento={adendaTarget.tipoDocumento}
    idDocumento={adendaTarget.idDocumento}
    idPaciente={patientId}
    idEncuentro={adendaTarget.idEncuentro}
    documentoFirmadoAt={adendaTarget.firmadoAt}
    documentoCreatedBy={adendaTarget.createdBy}
    profesionalIdActual={profesionalId}
    rolActual={rol}
    onSuccess={() => router.refresh()}
  />
)}
```

Pasar el callback `onAgregarAdenda` a `SoapExpandedCard` y `NotaClinicaExpandedCard`.

### 4.3 Botón en las cards

En `SoapExpandedCard` y `NotaClinicaExpandedCard`, junto al `EncuentroLink` existente, agregar botón visible **solo si `firmado === true`**:

```tsx
{d.firmado && (
  <button
    onClick={() => onAgregarAdenda({
      tipoDocumento: "nota_clinica", // o "soap"
      idDocumento: d.id,
      firmadoAt: d.firmado_at,
      createdBy: d.created_by,
      idEncuentro: d.id_encuentro,
    })}
    className="..."
  >
    Agregar adenda / corrección
  </button>
)}
```

---

## Parte 5 — PDF de ficha completa con adendas

### Archivo: `src/lib/ficha-clinica/pdf-renderer.ts` + `src/app/actions/exportar-pdf.ts`

1. En `exportarFichaCompletaPdf` (server action), agregar al fetch de datos la query de adendas del paciente (todas, ordenadas por `created_at`).
2. En el `FichaClinicaData` struct, incluir las adendas asociadas a cada documento.
3. En `renderFichaCompletaPdf`, al renderizar cada nota firmada (SOAP / nota_clinica):
   - Renderizar la nota original normalmente.
   - Inmediatamente debajo, renderizar sus adendas en bloque visualmente diferenciado:
     - "ADENDA — {fecha} — {autor}" + motivo + contenido
     - "ERRATA — {fecha} — {autor}" + motivo + contenido (destacar visualmente)
     - "ANULACIÓN — {fecha} — {autor}" + motivo (+ marcar la nota original como anulada en su encabezado)
   - Si hubo override de director, incluir línea "Autorizado por dirección: {override_motivo}".

**Regla legal**: el PDF nunca oculta una nota anulada. La muestra con su marca de anulación y la justificación. La trazabilidad completa es el requisito.

---

## Criterios de aceptación

### Server
- [ ] `crearAdenda()` valida permisos según matriz (adenda/errata/anulación)
- [ ] Errata dentro de 72h: solo autor original o autorizador
- [ ] Errata fuera de 72h: solo autorizador + `override_motivo` obligatorio
- [ ] Anulación: solo autorizador + `override_motivo` obligatorio
- [ ] Adenda a documento no firmado → rechazada
- [ ] Toda creación genera `logAudit` con `tipoEvento` correcto
- [ ] `getAdendasDeDocumento()` retorna adendas con autor

### Timeline
- [ ] Adendas aparecen como entries propias con fecha de creación de la adenda
- [ ] Badge en nota original: "N adendas" / "Corregida" / "Anulada"
- [ ] Nota anulada se ve atenuada pero su contenido sigue visible
- [ ] `AdendaExpandedCard` muestra tipo, referencia, motivo, contenido, autor, override

### Modal
- [ ] Tipos no permitidos aparecen deshabilitados con tooltip
- [ ] Campo `overrideMotivo` aparece cuando corresponde (errata >72h con rol autorizador, anulación)
- [ ] No autorizador intentando errata >72h: submit bloqueado con mensaje claro
- [ ] Errores del server se muestran en AlertBanner
- [ ] Submit exitoso refresca el Timeline

### PDF
- [ ] Ficha exportada incluye adendas debajo de cada nota
- [ ] Notas anuladas aparecen marcadas, no ocultas
- [ ] Override de director aparece en el PDF

### General
- [ ] `npm run build` con 0 errores y 0 warnings
- [ ] Tokens CSS usan `var(--color-kp-*)`, nunca `var(--kp-*)`

### Verificación manual
- [ ] Crear adenda como profesional cualquiera → aparece en Timeline
- [ ] Crear errata como autor dentro de 72h → OK
- [ ] Intentar errata como no-autor dentro de 72h → bloqueado
- [ ] Intentar errata >72h como profesional → pide director
- [ ] Crear anulación como director → nota original marcada anulada
- [ ] Exportar PDF → adendas visibles en orden cronológico
- [ ] Verificar fila en `logs_auditoria` por cada acción

---

## Notas para Claude Code

1. **Verificar la FK `created_by` → `profesionales`** en `fce_adendas` antes de escribir el JOIN. Si no existe la constraint, hacer lookup separado de autores o agregar la FK en una migration menor.
2. **`fce_notas_soap.created_by`** fue agregado en A0 pero la data vieja fue truncada — todas las notas nuevas lo tendrán. No hay backfill necesario.
3. **El patrón de modal ya existe** — copiar la estructura de `PrescripcionDetalleModal` / `OrdenExamenDetalleModal` en `ClinicalTimeline.tsx` (líneas ~535, ~715 según auditoría previa).
4. **No construir** flujo de aprobación asíncrono para overrides. El director que está logueado autoriza en el momento. Si no es director, el profesional debe pedírselo fuera del sistema.
5. **No extender** a periograma/egreso/prescripción/orden/consentimiento en este sprint. Solo SOAP + nota_clinica.
6. **Cálculo de 72h**: server-side es la fuente de verdad. El cliente solo lo usa para mostrar/ocultar campos del form.
7. Build check cada vez que termines una Parte (1-5).

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| FK `created_by` no existe → JOIN falla | Verificar antes. Lookup separado como fallback. |
| Reloj cliente desincronizado afecta cálculo 72h | Irrelevante — server revalida con `now()` de DB/server. |
| Profesional con N perfiles: `created_by` del original puede no coincidir con `profesionalId` actual | `requireContext()` resuelve el perfil activo. Si el original lo creó con otro perfil del mismo login, no es "autor original" técnicamente. Aceptable para MVP; documentar. |
| Badge "anulada" no se propaga si la query no trae las adendas | Asegurar que el mapeo de adendas corre antes del mapeo de notas. |

---

## Próximos pasos post-A1

- **Sprint A1.2**: extender adendas a periograma, egreso, prescripción, orden_examen, consentimiento (botón en cada card + render PDF).
- **Sprint A2**: `/dashboard/auditoria` — UI de trazabilidad con filtros (actor, paciente, tipo_evento, rango fechas) + export PDF firmado para sumarios.
