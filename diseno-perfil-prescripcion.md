# Diseño: Filtrado de Prescripciones por Perfil Profesional

**Fecha**: 2026-06-17  
**Problema**: Matrón/a con `puede_prescribir=true` puede prescribir cualquier medicamento del catálogo sin restricción.  
**Solución**: Sistema de perfiles de prescripción que filtra medicamentos por tipo de profesional.

---

## Arquitectura de la solución

```
profesional.especialidad
    → getPerfilPrescripcion(especialidad)     // código: registry
        → perfil: 'medico' | 'odontologo' | 'matrona'
            → buscarMedicamentos(supabase, query, perfil)   // filtro en búsqueda
            → validateMedicamentosAutorizados(meds, perfil)  // validación al guardar
```

**Principio**: el perfil se DERIVA de la especialidad (no se almacena en `profesionales`). Si mañana necesitamos override por profesional, agregamos la columna. Hoy no hay caso de uso.

---

## Cambio 1: DB — `medicamentos_catalogo.perfiles_autorizados`

Migration: `20260617_01_perfil_prescripcion_medicamentos.sql` (archivo adjunto)

- `perfiles_autorizados text[] NOT NULL DEFAULT '{medico}'`
- Valores: `'medico'`, `'odontologo'`, `'matrona'`
- Los 174 meds existentes → default `{medico}`
- UPDATE masivo tagea odontólogos (por `especialidades_comunes`) y matronas (formulario MINSAL)
- Agrega `Obstetricia y Puericultura` y `Ginecología y Obstetricia` al catálogo de especialidades

---

## Cambio 2: Registry — mapeo especialidad → perfil

**Archivo**: `src/lib/modules/modelos.ts` (o nuevo `src/lib/prescripciones/perfiles.ts`)

```typescript
export type PerfilPrescripcion = 'medico' | 'odontologo' | 'matrona';

const PERFIL_POR_ESPECIALIDAD: Record<string, PerfilPrescripcion> = {
  'Medicina General':            'medico',
  'Ginecología y Obstetricia':   'medico',
  'Enfermería':                  'medico',    // enfermería no prescribe sola en Chile
  'Nutrición':                   'medico',    // si prescribe, es con perfil médico
  'Psicología':                  'medico',    // psicólogos no prescriben — guard aparte
  'Kinesiología':                'medico',    // kines no prescriben — guard aparte
  'Odontología':                 'odontologo',
  'Obstetricia y Puericultura':  'matrona',
};

/**
 * Retorna el perfil de prescripción del profesional según su especialidad.
 * Si la especialidad no está mapeada, retorna 'medico' (más permisivo).
 * El guard `puede_prescribir` ya filtra quién llega aquí.
 */
export function getPerfilPrescripcion(especialidad: string): PerfilPrescripcion {
  return PERFIL_POR_ESPECIALIDAD[especialidad] ?? 'medico';
}
```

**Nota sobre Enfermería/Psicología/Kine**: estas especialidades tienen `puede_prescribir=false` por defecto. Si algún día se activa, operan con perfil `medico` (el más permisivo). El control real ya lo hace el boolean.

---

## Cambio 3: Registry — agregar especialidades al ESPECIALIDADES_REGISTRY

**Archivo**: `src/lib/modules/registry.ts`

```typescript
// Agregar al ESPECIALIDADES_REGISTRY:
"Obstetricia y Puericultura": {
  codigo: "Obstetricia y Puericultura",
  label: "Obstetricia y Puericultura",
  modelo: "clinico_general",
  tieneContraindicaciones: false,
  tieneEscalaFuncional: false,
  estado: "estable"
},
"Ginecología y Obstetricia": {
  codigo: "Ginecología y Obstetricia",
  label: "Ginecología y Obstetricia",
  modelo: "clinico_general",
  tieneContraindicaciones: false,
  tieneEscalaFuncional: false,
  estado: "estable"
},
```

---

## Cambio 4: Búsqueda filtrada — `buscarMedicamentos`

**Archivo**: `src/lib/medicamentos/catalogo.ts`

```typescript
// ANTES
export async function buscarMedicamentos(
  supabase: SupabaseClient,
  query: string
): Promise<MedicamentoCatalogo[]> {
  // ... búsqueda sin filtro de perfil
}

// DESPUÉS
export async function buscarMedicamentos(
  supabase: SupabaseClient,
  query: string,
  perfilPrescripcion?: PerfilPrescripcion  // nuevo parámetro opcional
): Promise<MedicamentoCatalogo[]> {
  let q = supabase
    .from('medicamentos_catalogo')
    .select('*')
    .eq('activo', true)
    .ilike('principio_activo', `%${query}%`);  // o la lógica actual

  // Filtrar por perfil si se proporciona
  if (perfilPrescripcion) {
    q = q.contains('perfiles_autorizados', [perfilPrescripcion]);
  }

  const { data } = await q.limit(20);
  return data ?? [];
}
```

---

## Cambio 5: Server action `searchMedicamentos`

**Archivo**: `src/app/actions/prescripciones.ts`

```typescript
// ANTES
export async function searchMedicamentos(
  query: string
): Promise<ActionResult<MedicamentoCatalogo[]>> {
  const { supabase } = await requireAuth();
  const results = await buscarMedicamentos(supabase, query);
  return { success: true, data: results };
}

// DESPUÉS
export async function searchMedicamentos(
  query: string
): Promise<ActionResult<MedicamentoCatalogo[]>> {
  const { supabase, user } = await requireAuth();

  // Resolver perfil del profesional
  const ctx = await requireContext();
  const profesional = await getProfesionalActivo(supabase, user.id, ctx.idClinica);
  const perfil = profesional
    ? getPerfilPrescripcion(profesional.especialidad)
    : undefined;

  const results = await buscarMedicamentos(supabase, query, perfil);
  return { success: true, data: results };
}
```

---

## Cambio 6: Validación server-side en `createAndSignPrescripcion`

**Archivo**: `src/app/actions/prescripciones.ts`

Agregar entre Step 6 (puede_prescribir check) y Step 7 (encuentro validation):

```typescript
  // Step 6b — Validar medicamentos autorizados para el perfil del profesional
  if (input.tipo === 'farmacologica' && input.medicamentos?.length) {
    const perfil = getPerfilPrescripcion(profesional.especialidad);

    // Obtener IDs de medicamentos del catálogo que el profesional puede prescribir
    const nombresPrescritos = input.medicamentos.map(m => m.principioActivo);

    const { data: autorizados } = await supabase
      .from('medicamentos_catalogo')
      .select('principio_activo')
      .eq('activo', true)
      .contains('perfiles_autorizados', [perfil])
      .in('principio_activo', nombresPrescritos);

    const autorizadosSet = new Set(autorizados?.map(a => a.principio_activo) ?? []);
    const noAutorizados = nombresPrescritos.filter(n => !autorizadosSet.has(n));

    if (noAutorizados.length > 0) {
      return {
        success: false,
        error: `Medicamentos no autorizados para tu perfil: ${noAutorizados.join(', ')}`
      };
    }
  }
```

**Importante**: esta validación es SERVER-SIDE y no confía en el filtro del UI. Un profesional malintencionado podría enviar medicamentos no autorizados vía API.

---

## Cambio 7: Tipo TypeScript

**Archivo**: `src/types/medicamento.ts`

```typescript
// Agregar al tipo MedicamentoCatalogo:
export interface MedicamentoCatalogo {
  // ... campos existentes ...
  perfiles_autorizados: string[];  // 'medico' | 'odontologo' | 'matrona'
}
```

---

## Instrumentos obstétricos a seedear (futuro)

Para completar el soporte de Obstetricia y Puericultura y Ginecología y Obstetricia:

| Instrumento | Especialidades | Tipo |
|---|---|---|
| Edinburgh (EPDS) | Obstetricia y Puericultura, Psicología | escala_simple |
| Bishop Score | Obstetricia y Puericultura, Ginecología y Obstetricia | escala_simple |
| Ballard Score | Obstetricia y Puericultura | componente_custom |
| Capurro | Obstetricia y Puericultura | escala_simple |
| NST (interpretación) | Obstetricia y Puericultura, Ginecología y Obstetricia | componente_custom |

Apgar ya existe en el catálogo — agregar ambas especialidades nuevas al array `especialidades`.

---

## Orden de implementación

1. **Migration SQL** → aplicar (DDL — requiere coordinación humana)
2. **Verificación post-migration** → confirmar conteos
3. **`perfiles.ts`** → función `getPerfilPrescripcion`
4. **`registry.ts`** → agregar 2 especialidades nuevas
5. **`catalogo.ts`** → agregar parámetro `perfilPrescripcion` a `buscarMedicamentos`
6. **`prescripciones.ts`** → filtro en `searchMedicamentos` + validación en `createAndSignPrescripcion`
7. **`types/medicamento.ts`** → agregar campo
8. **`npm run build`** → 0 errores
9. **Test manual** → login como matrona, verificar que solo ve meds autorizados

---

## Riesgos

1. **Formulario de matronas incompleto** — la lista de medicamentos autorizados es basada en normativa MINSAL pero puede faltar alguno. Requiere validación con profesional clínico obstétrico.

2. **Medicamentos custom por clínica** — si una clínica agrega medicamentos propios (`origen='manual'`), deben incluir `perfiles_autorizados`. El DEFAULT `{medico}` los protege, pero podrían faltar para matronas.

3. **`principio_activo` como key de match** — la validación cruza por nombre. Si hay variantes de escritura (ej: "Paracetamol" vs "paracetamol"), falla. El catálogo actual es consistente, pero ojo con inserts futuros.
