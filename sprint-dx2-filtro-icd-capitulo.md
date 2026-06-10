# Sprint DX2 — Filtro ICD-11 por capítulo WHO para Psicología

> **Contexto**: Lee `CLAUDE.md` + `docs/plan-redisenio/04-criterios-tecnicos.md` antes de empezar.
> **Pre-requisito**: Sprint DX1 completado (campo `diagnostico` en `EspecialidadConfig`, bloque ICD condicional).
> **Objetivo**: Psicología accede al selector ICD-11 pero filtrado al capítulo 06 (Trastornos mentales, del comportamiento y del neurodesarrollo). Solo ve diagnósticos de su ámbito.
> **Alcance**: 4 archivos. Cero DDL / migrations.

---

## Contexto técnico

La WHO ICD-11 API soporta filtrar búsquedas por capítulo. El parámetro se llama `chaptersFilter` y acepta códigos de capítulo separados por punto y coma (ej: `"06"` para salud mental, `"01;02"` para varios).

El capítulo 06 del ICD-11 MMS cubre: trastornos del neurodesarrollo, esquizofrenia, trastornos del ánimo, ansiedad, TOC, estrés, disociativos, alimentarios, personalidad, neurocognitivos, etc. Códigos 6A00-6E8Z. Es el ámbito natural del psicólogo clínico.

**Referencia**: [ECT Advanced Settings](https://icd.who.int/icdapi/docs2/icd11ect-1.6-EmbeddedCodingTool/) — `chaptersFilter: "Semicolon separated list of chapter codes"`.

---

## 1. Cambio en `src/lib/modules/especialidad-config.ts`

### 1.1 Actualizar `DiagnosticoConfig`

El campo `subtreeFilter` reservado en DX1 se renombra a `chaptersFilter` porque la WHO API usa filtro por capítulo (más simple que URIs de subárbol):

```typescript
export interface DiagnosticoConfig {
  tipo: 'icd11_mms' | 'ninguno';
  label: string;
  mostrarCIE10?: boolean;
  chaptersFilter?: string;  // Capítulos WHO separados por ";". Ej: "06" para salud mental
}
```

> **Nota**: si en DX1 el campo se llamó `subtreeFilter`, renombrarlo a `chaptersFilter`. Si no existía (solo estaba en comentarios), agregar directamente.

### 1.2 Agregar Psicología al diagnóstico

En `ESPECIALIDAD_CONFIG["Psicología"]`, agregar:

```typescript
diagnostico: {
  tipo: 'icd11_mms',
  label: 'Diagnóstico psicológico (CIE-11)',
  mostrarCIE10: false,
  chaptersFilter: '06',
},
```

### 1.3 Verificar Medicina y Odontología

Medicina General y Odontología deben seguir **sin** `chaptersFilter` (buscan en todo el árbol ICD-11). Confirmar que no se les agregó por error.

---

## 2. Cambio en `src/lib/icd/search.ts`

### 2.1 Agregar parámetro `chaptersFilter` a `buscarDiagnostico`

```typescript
export async function buscarDiagnostico(
  query: string,
  lang = 'es',
  chaptersFilter?: string,  // ← NUEVO: "06", "01;02", etc.
): Promise<ICDSearchResult[]> {
```

### 2.2 Pasar el filtro a `icdFetch`

En la llamada a `icdFetch`, agregar condicionalmente:

```typescript
const params: Record<string, string> = {
  q: query,
  displayLanguage: lang,
  flatResults: 'true',
  includeKeywordResult: 'true',
  useFlexibleSearch: 'false',
};

if (chaptersFilter) {
  params.chaptersFilter = chaptersFilter;
}

const data = await icdFetch('/icd/release/11/2025-01/mms/search', params);
```

Reemplazar el objeto literal actual por la variable `params`.

---

## 3. Cambio en `src/app/actions/clinico/diagnostico.ts`

### 3.1 Agregar parámetro `chaptersFilter` a `searchDiagnosticos`

```typescript
export async function searchDiagnosticos(
  query: string,
  chaptersFilter?: string,  // ← NUEVO
): Promise<ActionResult<ICDSearchResult[]>> {
  try {
    const results = await buscarDiagnostico(query, 'es', chaptersFilter);
    return { success: true, data: results };
  } catch (error) {
    log("error", { action: "icd_search_diagnosticos", error });
    return { success: true, data: [] };
  }
}
```

---

## 4. Cambio en `src/components/clinico/DiagnosticoSearch.tsx`

### 4.1 Agregar prop `chaptersFilter`

```typescript
interface DiagnosticoSearchProps {
  value: ICDCodeSnap[];
  onChange: (codes: ICDCodeSnap[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  chaptersFilter?: string;  // ← NUEVO
}
```

### 4.2 Pasar al server action

En el `useEffect` de debounce, cambiar la llamada:

```typescript
// Antes
const res = await searchDiagnosticos(query.trim());

// Después
const res = await searchDiagnosticos(query.trim(), chaptersFilter);
```

Agregar `chaptersFilter` al array de dependencias del `useEffect`:

```typescript
}, [query, chaptersFilter]);
```

### 4.3 Destructurar la prop

```typescript
export function DiagnosticoSearch({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Busca por nombre o código ICD-11 (ej: diabetes, J45)',
  chaptersFilter,  // ← NUEVO
}: DiagnosticoSearchProps) {
```

---

## 5. Cambio en `src/components/clinico/NotaClinicaForm.tsx`

### 5.1 Pasar `chaptersFilter` al DiagnosticoSearch

En el bloque condicional `{mostrarICD && (...)}`, donde se renderiza `<DiagnosticoSearch>`, agregar la prop:

```tsx
<DiagnosticoSearch
  value={icdCodigos}
  onChange={setIcdCodigos}
  readOnly={readOnly}
  chaptersFilter={diagnosticoConfig?.chaptersFilter}
/>
```

### 5.2 Actualizar placeholder condicionalmente

Para Psicología, el placeholder debería reflejar que solo busca en salud mental. Agregar:

```tsx
<DiagnosticoSearch
  value={icdCodigos}
  onChange={setIcdCodigos}
  readOnly={readOnly}
  chaptersFilter={diagnosticoConfig?.chaptersFilter}
  placeholder={diagnosticoConfig?.chaptersFilter
    ? 'Busca diagnóstico de salud mental (ej: depresión, ansiedad, TDAH)'
    : undefined
  }
/>
```

---

## 6. Verificación

### Build
```bash
npm run build  # 0 errores, 0 warnings
```

### Test funcional del filtro WHO API

Antes de probar en la UI, verificar que el parámetro funciona contra la API real. Crear script temporal o probar desde el form:

1. **Sin filtro** (Medicina): buscar "diabetes" → debe retornar resultados (capítulo 05, endocrino).
2. **Con filtro `chaptersFilter=06`** (Psicología): buscar "diabetes" → NO debe retornar resultados (diabetes no está en cap 06).
3. **Con filtro `chaptersFilter=06`** (Psicología): buscar "depresión" → debe retornar resultados (6A70-6A7Z).
4. **Con filtro `chaptersFilter=06`** (Psicología): buscar "ansiedad" → debe retornar resultados (6B00-6B0Z).
5. **Con filtro `chaptersFilter=06`** (Psicología): buscar "TDAH" → debe retornar resultados (6A05).

### Fallback si `chaptersFilter` no funciona como query param

Si la WHO REST API no acepta `chaptersFilter` como query parameter (es posible que sea solo un param del ECT widget, no del REST API), hay dos alternativas ordenadas de más a menos preferible:

**Alternativa A — Filtro client-side por código**: Los códigos del capítulo 06 en ICD-11 MMS empiezan con "6" (rango 6A00-6E8Z). Filtrar `results` después de la búsqueda:

```typescript
// En buscarDiagnostico, después de mapear entities:
let mapped = entities.slice(0, MAX_RESULTS).map(mapDestinationEntity);

if (chaptersFilter) {
  const chapterPrefixes = chaptersFilter.split(';').map(c => c.trim());
  mapped = mapped.filter(r =>
    r.code && chapterPrefixes.some(prefix => r.code!.startsWith(prefix))
  );
}

return mapped;
```

> **Nota**: este filtro es imperfecto — la API podría retornar pocos resultados relevantes si la mayoría de los 10 resultados son de otros capítulos. Si se usa esta alternativa, subir `MAX_RESULTS` a 25 para compensar.

**Alternativa B — Foundation URI subtree**: Usar el parámetro `subtreesFilter` con la Foundation URI del capítulo 06. La URI raíz del capítulo 06 en la Foundation es `http://id.who.int/icd/entity/334423054`. Pasar como:

```typescript
params.subtreesFilter = 'http://id.who.int/icd/entity/334423054';
params.subtreeFilterUsesFoundationDescendants = 'true';
```

> **Nota**: requiere verificar la URI exacta. Consultar `https://id.who.int/icd/entity/334423054` con auth para confirmar que es el capítulo 06.

**Instrucción para Claude Code**: probar primero con `chaptersFilter`. Si la API retorna resultados sin filtrar (ignora el param), implementar Alternativa A. Si A produce resultados pobres, probar B. Documentar en el commit cuál alternativa se usó.

### Checks de UI

1. **Psicología**: abrir encuentro → bloque ICD-11 visible con label "Diagnóstico psicológico (CIE-11)". Buscar "diabetes" → sin resultados. Buscar "depresión" → resultados. CIE-10 NO visible.
2. **Medicina General**: buscar "diabetes" → resultados normales (sin filtro). CIE-10 visible.
3. **Odontología**: buscar "caries" → resultados normales. CIE-10 visible.
4. **Enfermería / Nutrición**: bloque ICD NO visible (DX1).

---

## 7. NO tocar

- `src/lib/icd/client.ts` — zero cambios en OAuth/fetch
- `src/lib/icd/entity.ts` — no aplica
- `src/components/dental/DiagnosticoSearch.tsx` — wrapper dental, no se toca (Odontología no tiene filtro)
- Server action `nota-clinica.ts` — sin cambios
- Tablas DB — cero migrations
- Secciones estructuradas — sin cambios
- Bloque backwards-compat de DX1 — sin cambios

---

## 8. Archivos a modificar (resumen)

| Archivo | Cambio |
|---|---|
| `src/lib/modules/especialidad-config.ts` | Renombrar `subtreeFilter` → `chaptersFilter` en `DiagnosticoConfig`. Agregar `diagnostico` a Psicología con `chaptersFilter: '06'`. |
| `src/lib/icd/search.ts` | Agregar param opcional `chaptersFilter` a `buscarDiagnostico()`. Pasarlo a `icdFetch`. |
| `src/app/actions/clinico/diagnostico.ts` | Agregar param opcional `chaptersFilter` a `searchDiagnosticos()`. Pasar a `buscarDiagnostico()`. |
| `src/components/clinico/DiagnosticoSearch.tsx` | Agregar prop `chaptersFilter`. Pasar al server action. Agregar a deps del useEffect. |
| `src/components/clinico/NotaClinicaForm.tsx` | Pasar `chaptersFilter` y placeholder condicional a `DiagnosticoSearch`. |

---

## 9. Extensibilidad futura

Este diseño soporta filtrar por cualquier capítulo. Ejemplos:

| Especialidad | `chaptersFilter` | Capítulo |
|---|---|---|
| Psicología | `"06"` | Mental, behavioural or neurodevelopmental |
| Dermatología (futuro) | `"14"` | Diseases of the skin |
| Cardiología (futuro) | `"11"` | Diseases of the circulatory system |
| Multi-capítulo (futuro) | `"06;21"` | Mental + Symptoms/signs |

Solo requiere agregar el campo en `especialidad-config.ts`. Cero código nuevo.

---

## Reglas de siempre

- `var(--color-kp-*)` nunca `var(--kp-*)`
- Zero `if (especialidad === '...')` — todo via `getEspecialidadConfig()`
- `npm run build` = 0 errores al cerrar
- Commits: `feat(sprint-dx2)(clinico): filtro ICD-11 por capítulo WHO para Psicología`
