# Rediseño visual — Vista detalle de paciente (`pacientes/[id]/page.tsx`)

## Contexto

Cambio **exclusivamente visual** en la página de detalle de paciente. No se modifica lógica, server actions, queries, ni tipos. Solo se reordena y reorganiza la UI existente para reducir fricción en contexto ambulatorio.

**Antes de empezar**: lee `CLAUDE.md`, identifica el archivo `src/app/dashboard/pacientes/[id]/page.tsx` y todos los componentes que importa. Mapea mentalmente qué componente renderiza cada sección actual. No modifiques ningún server action ni query de datos.

---

## Alcance estricto

- ✅ Reordenar componentes existentes
- ✅ Cambiar visibilidad condicional de botones
- ✅ Ajustar CSS/Tailwind de layout
- ✅ Mover elementos entre zonas de la página
- ❌ NO modificar server actions
- ❌ NO modificar queries a Supabase
- ❌ NO modificar tipos TypeScript
- ❌ NO modificar lógica de RLS, permisos ni guards
- ❌ NO modificar componentes hijos internamente (solo cómo se colocan en la página)
- ❌ NO crear tablas, columnas ni migrations

---

## Cambios a implementar

### 1. Zona de acciones rápidas (action buttons)

**Estado actual**: 7 botones planos en fila horizontal, todos con la misma prominencia:
`Nota rápida | Signos vitales | Consentimiento | Anamnesis | Exportar PDF | FHIR`

**Estado objetivo**: Jerarquía de 3 niveles separados por dividers visuales.

```
[🟢 Iniciar atención · {especialidad}]  |  [Nota rápida] [Anamnesis] [Consentimiento]  |  {condicionales}  [···]
```

#### Nivel 1 — CTA principal (ya existe el botón, solo reposicionar)
- Botón "Iniciar atención · {especialidad}" — prominente, color primario (`var(--color-kp-primary)` o equivalente del branding), separado del resto con un divider vertical.

#### Nivel 2 — Acciones clínicas frecuentes (siempre visibles)
- **Nota rápida** — se mantiene
- **Anamnesis** — se mantiene
- **Consentimiento** — se mantiene
- **Signos vitales** — ⚠️ **MOVER al menú overflow (···)**. En ambulatorio no es acción frecuente.

#### Nivel 3 — Acciones condicionales (visibles solo si aplica)
Después de un segundo divider vertical, mostrar condicionalmente:

- **Prescripción** (ícono `pill` o equivalente): visible solo si `M7 ∈ modulosActivos` AND `profesional.puede_prescribir === true`
- **Orden de examen** (ícono `microscope` o equivalente): visible solo si `M8 ∈ modulosActivos` AND `profesional.puede_indicar_examenes === true`

Estilo diferenciado: borde dashed con color accent para distinguirlos visualmente de las acciones base. Si ninguno aplica, el segundo divider no se renderiza.

> **IMPORTANTE**: La lógica de `modulosActivos` y `puede_prescribir` / `puede_indicar_examenes` ya existe en el contexto de la página (viene del `ClinicaSessionProvider` o de los datos del profesional). Solo hay que usarla para condicionar el render. NO crear lógica nueva.

#### Menú overflow (···)
Botón de 3 puntos al final derecho. Al hacer clic muestra las acciones poco frecuentes:
- Signos vitales
- Exportar PDF
- FHIR
- Auditoría (si el rol lo permite, lógica ya existente)

Implementar como dropdown simple o usar el componente de menú que ya exista en `components/ui/`.

---

### 2. Sidebar derecho — Reordenar por relevancia ambulatoria

**Estado actual** (de arriba a abajo):
1. Botón "Resumen IA" (grande, prominente)
2. Últimos signos vitales (4 cards siempre visibles, incluso vacías)
3. Diagnósticos CIF (card separada)
4. Diagnósticos activos (card separada)
5. Antecedentes

**Estado objetivo** (de arriba a abajo):

#### A. Diagnósticos (card unificada)
Fusionar "Diagnósticos CIF" y "Diagnósticos activos" en **una sola card** con separador interno:
```
📋 DIAGNÓSTICOS
─── CIF ───
  (lista o "Agregar CIF")
─── separador ───
─── ICD / Texto libre ───
  (lista o "Agregar diagnóstico")
```

#### B. Antecedentes
Se mantiene igual, sube de posición.

#### C. Signos vitales — Renderizado condicional
- **Si el paciente tiene signos vitales registrados**: mostrar la grilla de 4 valores (PA, FC, Temp, SpO₂) como está hoy.
- **Si NO tiene signos vitales**: NO mostrar la grilla con "—" en cada card. En su lugar, mostrar un link discreto: `+ Registrar signos vitales` dentro de la card de antecedentes, o simplemente no mostrar nada.

#### D. Resumen IA — Al final, condicional
- **Si hay ≥1 entrada en el timeline**: botón activo con estilo accent (`background: var(--color-kp-accent-lt)`, borde accent).
- **Si no hay datos**: botón deshabilitado visualmente (gris, `opacity: 0.6`, texto "Resumen IA · sin datos aún", `cursor: default`). No ocultarlo — que el profesional sepa que existe pero necesita datos.

---

### 3. Timeline — Empty state con onboarding

**Estado actual**: Ícono + "Sin actividad clínica registrada" + subtexto genérico.

**Estado objetivo**: Cuando el timeline está vacío, reemplazar el subtexto con 2 botones de acción sugerida:
```
📄 Paciente sin registros clínicos

  [📋 Completar anamnesis]  [▶ Iniciar primera atención]
```

Estos botones ejecutan la misma navegación que sus equivalentes en la barra de acciones. No duplicar lógica — reusar los handlers existentes.

---

## Validación post-cambio

Antes de hacer commit, verificar:

1. `npm run build` — 0 errores, 0 warnings
2. Verificar visualmente los siguientes escenarios:
   - Profesional SIN `puede_prescribir` ni `puede_indicar_examenes` → NO aparecen botones de Prescripción ni Orden examen
   - Profesional CON ambos permisos + clínica con M7/M8 activos → aparecen ambos botones condicionales
   - Paciente SIN signos vitales → no aparece grilla vacía de signos en sidebar
   - Paciente SIN entradas en timeline → aparece empty state con botones de onboarding
   - Paciente CON datos → timeline normal, Resumen IA activo, signos visibles si existen
3. Verificar que el menú overflow (···) muestra: Signos vitales, Exportar PDF, FHIR
4. Verificar responsive: la barra de acciones debe hacer wrap limpio si no cabe en una línea
5. Los tokens de color deben usar `var(--color-kp-*)` — NUNCA `var(--kp-*)` sin prefijo `--color-`

---

## Archivos que probablemente necesitas tocar

- `src/app/dashboard/pacientes/[id]/page.tsx` — layout principal, reorden de componentes
- `src/components/shared/PatientActionNav.tsx` (o equivalente) — barra de acciones rápidas
- `src/components/shared/ClinicalTimeline.tsx` — empty state
- `src/components/shared/SummaryPanel.tsx` (o equivalente) — sidebar derecho
- `src/components/ui/` — si necesitas un dropdown para el menú overflow

**NO tocar**:
- `src/actions/*` — ningún server action
- `src/lib/*` — ningún helper ni guard
- `supabase/migrations/*` — nada de DB
- `src/types/*` — ningún tipo

---

## Commit

```
refactor(ui): reorganizar ficha paciente para contexto ambulatorio

- Reordenar acciones rápidas con jerarquía CTA > frecuentes > condicionales > overflow
- Mover signos vitales a menú overflow y renderizado condicional en sidebar
- Fusionar cards de diagnósticos CIF + activos en sidebar
- Agregar botones M7/M8 condicionales (prescripción, orden examen)
- Empty state del timeline con acciones de onboarding
- Resumen IA deshabilitado visualmente sin datos
```
