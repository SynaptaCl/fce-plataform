# Sprint DX1 — Diagnóstico condicional por especialidad

> **Contexto**: Lee `CLAUDE.md` + `docs/plan-redisenio/04-criterios-tecnicos.md` antes de empezar.
> **Objetivo**: El bloque de diagnóstico ICD-11 / CIE-10 solo se muestra a especialidades que legalmente diagnostican. El resto usa sus secciones estructuradas existentes.
> **Alcance**: Solo capa de aplicación. Cero DDL / migrations. Las columnas DB ya existen.

---

## 1. Cambio en `src/lib/modules/especialidad-config.ts`

### 1.1 Agregar tipo e interfaz

```typescript
export interface DiagnosticoConfig {
  tipo: 'icd11_mms' | 'ninguno';
  label: string;
  mostrarCIE10?: boolean;
  subtreeFilter?: string;  // reservado Sprint DX2: filtro por capítulo WHO (ej: cap 06 para Psicología)
}
```

### 1.2 Agregar campo `diagnostico` a `EspecialidadConfig`

```typescript
export interface EspecialidadConfig {
  // ... campos existentes sin cambio ...
  diagnostico?: DiagnosticoConfig;
}
```

### 1.3 Configurar por especialidad

| Especialidad | `diagnostico` |
|---|---|
| Medicina General | `{ tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true }` |
| Odontología | `{ tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true }` |
| Todas las demás | **No agregar el campo** (undefined → se interpreta como `ninguno`) |

### 1.4 Limpiar sección "diagnostico" en Medicina General

En `ESPECIALIDAD_CONFIG["Medicina General"].secciones`, la sección con `id: "diagnostico"` tiene `campos: []` y un comentario que dice "se maneja aparte en el form". **Eliminar esa sección** del array — ya no tiene sentido porque el bloque ICD será controlado por el campo `diagnostico` de `EspecialidadConfig`, no por secciones.

---

## 2. Cambio en `src/components/clinico/NotaClinicaForm.tsx`

### 2.1 Resolver config de diagnóstico

Después de donde se calcula `espConfig` y `seccionesEsp`, agregar:

```typescript
const diagnosticoConfig = espConfig?.diagnostico;
const mostrarICD = diagnosticoConfig?.tipo === 'icd11_mms';
```

### 2.2 Condicionar bloque ICD-11

El bloque actual (líneas con `<DiagnosticoSearch>`, fallback de diagnóstico texto, e input hidden `diagnostico`) se envuelve en:

```tsx
{mostrarICD && (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-ink-2">
      {diagnosticoConfig!.label} <span className="text-ink-3 font-normal">(opcional)</span>
    </label>
    <DiagnosticoSearch ... />
    {/* fallback diagnóstico texto existente */}
    <input type="hidden" {...register("diagnostico")} />
  </div>
)}
```

### 2.3 Condicionar bloque CIE-10

El bloque CIE-10 completo (label + Input + tags) se envuelve en:

```tsx
{mostrarICD && diagnosticoConfig?.mostrarCIE10 && (
  // ... bloque CIE-10 existente sin cambios internos ...
)}
```

### 2.4 Backwards-compat para notas firmadas (solo lectura)

Cuando `readOnly === true` y la nota ya tiene datos de diagnóstico guardados, deben seguir visibles aunque la especialidad ahora sea `ninguno`. Agregar después de los bloques condicionados:

```tsx
{!mostrarICD && readOnly && (notaExistente?.icd_codigos?.length || notaExistente?.diagnostico || (notaExistente?.cie10_codigos ?? []).length > 0) && (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-ink-2">
      Diagnóstico registrado <span className="text-ink-3 font-normal">(histórico)</span>
    </label>
    {/* Mostrar icd_codigos como chips readonly */}
    {(notaExistente?.icd_codigos ?? []).length > 0 && (
      <DiagnosticoSearch
        value={notaExistente!.icd_codigos!}
        onChange={() => {}}
        readOnly={true}
      />
    )}
    {/* Fallback texto */}
    {notaExistente?.diagnostico && (notaExistente?.icd_codigos ?? []).length === 0 && (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-kp-border bg-surface-0 text-ink-2">
        {notaExistente.diagnostico}
      </span>
    )}
    {/* CIE-10 históricos */}
    {(notaExistente?.cie10_codigos ?? []).length > 0 && (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {notaExistente!.cie10_codigos!.map((code: string) => (
          <span key={code} className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-0 border border-kp-border text-xs font-mono text-ink-2">
            {code}
          </span>
        ))}
      </div>
    )}
  </div>
)}
```

### 2.5 Limpieza del submit

Cuando `mostrarICD` es `false`, el submit NO debe enviar campos ICD vacíos que sobrescriban datos históricos. En `onSubmit`, condicionar:

```typescript
const result = await upsertNotaClinica(encuentroId, patientId, {
  ...data,
  // Solo enviar ICD/CIE-10 si el bloque está habilitado para esta especialidad
  ...(mostrarICD ? {
    cie10_codigos: cie10,
    icd_codigos: icdCodigos,
    icd_version: 'ICD-11 2025-01',
  } : {}),
  secciones_estructuradas: {
    ...(m10Activo ? seccionesEstructuradas : {}),
    ...(seccionesEsp.length > 0 ? contenidoEstructurado : {}),
  },
});
```

---

## 3. Cambio en `src/components/dental/DentalWorkspace.tsx`

En la tab "nota", pasar `especialidad` a `NotaClinicaForm`:

```tsx
<NotaClinicaForm
  encuentroId={encuentroId}
  patientId={paciente.id}
  notaExistente={notaExistente}
  readOnly={readOnly}
  idClinica={idClinica}
  especialidad={especialidad}   // ← AGREGAR
/>
```

Esto permite que el form resuelva `espConfig` para Odontología y muestre el bloque ICD correctamente.

---

## 4. Verificación

### Build
```bash
npm run build  # 0 errores, 0 warnings
```

### Checks manuales (o script)

1. **Medicina General**: abre encuentro → bloque ICD-11 visible con label "Diagnóstico (ICD-11)" + campo CIE-10 visible.
2. **Odontología**: tab Nota Clínica en DentalWorkspace → bloque ICD-11 visible + CIE-10.
3. **Enfermería**: abre encuentro → NO aparece bloque ICD-11 ni CIE-10. Solo secciones estructuradas (Motivo/Valoración, Evolución).
4. **Psicología**: abre encuentro → NO aparece bloque ICD-11. Solo secciones estructuradas (Motivo, Estado mental, Plan).
5. **Nutrición**: abre encuentro → NO aparece bloque ICD-11. Secciones estructuradas incluyen "Diagnóstico nutricional" como campo texto.
6. **Backwards-compat**: abrir nota firmada de Psicología/Enfermería que tenga `icd_codigos` previamente guardados → deben mostrarse como chips readonly con label "Diagnóstico registrado (histórico)".
7. **Submit sin ICD**: guardar nota de Enfermería → `icd_codigos` y `cie10_codigos` NO se envían en el payload (no sobrescriben valores previos).

---

## 5. NO tocar

- `src/lib/icd/` — cero cambios en la capa ICD
- `src/app/actions/clinico/nota-clinica.ts` — el server action ya acepta campos opcionales
- Tablas DB — cero migrations
- Secciones estructuradas existentes — no se modifican
- `DiagnosticoSearch` (clinico) — no se modifica, solo se condiciona su renderizado
- `DiagnosticoSearch` (dental wrapper) — no se toca
- `SeccionEstructuradaRenderer` — no se toca

---

## 6. Archivos a modificar (resumen)

| Archivo | Cambio |
|---|---|
| `src/lib/modules/especialidad-config.ts` | Agregar `DiagnosticoConfig`, campo `diagnostico` en interfaz y en config de Medicina + Odontología. Eliminar sección "diagnostico" vacía de Medicina. |
| `src/components/clinico/NotaClinicaForm.tsx` | Condicionar bloques ICD-11 y CIE-10. Agregar fallback readonly. Limpiar submit. |
| `src/components/dental/DentalWorkspace.tsx` | Pasar prop `especialidad` a `NotaClinicaForm`. |

---

## 7. Diseño preparado para Sprint DX2 (futuro)

El campo `subtreeFilter?: string` en `DiagnosticoConfig` está reservado para filtrar búsquedas ICD-11 por capítulo WHO. Cuando se implemente:

- Psicología → `{ tipo: 'icd11_mms', label: 'Diagnóstico psicológico (CIE-11)', subtreeFilter: '<URI capítulo 06>' }`
- `buscarDiagnostico()` en `lib/icd/search.ts` recibirá un param opcional para pasar `subtrees-filter` a la WHO API
- `DiagnosticoSearch` pasará el filtro al server action

Esto no se implementa en DX1. Solo se deja el campo reservado.

---

## Reglas de siempre

- `var(--color-kp-*)` nunca `var(--kp-*)`
- Zero `if (especialidad === '...')` — todo via `getEspecialidadConfig()`
- `npm run build` = 0 errores al cerrar
- Commits: `feat(sprint-dx1)(clinico): diagnóstico condicional por especialidad`
