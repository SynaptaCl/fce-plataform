# RD-1 — Rediseño Visual de la FCE

> **Estado**: Listo para ejecución · **Fecha de plan**: 2026-05-01
> **Pre-requisito**: Sprint R1 (limpieza Korporis-isms) completado
> **Pre-requisito de lectura**: `CLAUDE.md`, `docs/plan-redisenio/04-criterios-tecnicos.md`
> **Duración estimada**: 4-6 días
> **Riesgo**: Medio — toca componentes compartidos que usan los 3 modelos (rehab, clínico, dental)
> **No toca DB** — cero migrations, cero DDL

---

## Objetivo del sprint

Rediseñar la capa visual de la FCE para llevarla a nivel SaaS B2B profesional. El sistema actual tiene un layout funcional pero con problemas de densidad, jerarquía visual y consistencia de tokens CSS. Este sprint resuelve:

1. Sidebar colapsada (56px iconos) que libera espacio para el timeline
2. Patient header compacto en una sola línea horizontal
3. Action bar horizontal que reemplaza la columna lateral "Acciones"
4. Layout 70/30 (timeline + panel resumen) en la ficha de paciente
5. Sistema visual de inmutabilidad (borrador vs firmado)
6. Tipografía DM Sans + DM Mono para datos clínicos
7. Limpieza global de tokens CSS (`var(--kp-*)` → `var(--color-kp-*)`)

**Hito**: la FCE se ve profesional, consistente, y el layout escala para los 3 modelos clínicos.

---

## Regla crítica de este sprint

**TODOS los cambios son visuales/layout. No se modifica lógica de negocio, server actions, queries a DB, ni flujos de datos.** Si un componente necesita un cambio de props (ej: Sidebar recibe `collapsed` en vez de `especialidad`), el cambio es solo de interfaz TypeScript + rendering. La lógica de fetch, auth, guards, y RLS no se toca.

---

## Referencia visual: mockup aprobado

El mockup aprobado está en la conversación del 1 de mayo 2026 con el título "fce_patient_view_redesign_proposal". Los principios clave del mockup son:

- Sidebar: 56px, solo iconos, fondo navy (#0B1A2E), avatar del profesional abajo
- TopBar: 48px, breadcrumb a la izquierda, fecha a la derecha
- Patient Header: una línea horizontal — avatar + nombre + badge + meta + acciones a la derecha
- Action Bar: chips horizontales (Nota rápida, Signos vitales, Consentimiento, Anamnesis, FHIR)
- Body: grid 2 columnas — timeline (flex-1) | panel resumen (280px fijo)
- Timeline entries: cards con borde izquierdo por tipo (teal=nota, amber=prescripción, etc.)
- Notas firmadas: borde izquierdo + ícono candado + barra "Firmado" al pie
- Panel resumen: signos vitales en grid 2x2, diagnósticos, antecedentes, plan
- Estados vacíos: "+Agregar..." interactivo en vez de "Sin registro" pasivo

---

## Sesiones de trabajo

El sprint se divide en **5 sesiones** ordenadas por dependencia. Cada sesión es una conversación nueva con Claude Code. Al cerrar cada sesión: `npm run build` = 0 errores.

---

### Sesión 1 — Tipografía + limpieza global de tokens CSS

**Scope**: globals.css, BrandingInjector, y grep global de tokens incorrectos.
**Riesgo**: Bajo — solo CSS, no toca lógica.

```
## Contexto
Lee CLAUDE.md. Sprint RD-1 Sesión 1: tipografía y limpieza de tokens CSS.

## Tarea

### Parte A — Instalar DM Sans y DM Mono

1. Verificar si DM Sans y DM Mono ya están instaladas vía next/font o 
   link externo. Si no están:
   - Instalar via next/font/google en src/app/layout.tsx
   - DM Sans: weights 400, 500, 600
   - DM Mono: weights 400, 500
   - Exportar como variables CSS: --font-dm-sans, --font-dm-mono

2. En globals.css, actualizar el font-family del body para usar DM Sans 
   como fuente principal (con fallback a system).

3. Agregar utilidad Tailwind para DM Mono:
   - Si Tailwind v4 permite definirlo via @theme, usar esa vía
   - Si no, crear clase utilitaria .font-mono-clinical { font-family: var(--font-dm-mono); }

4. NO cambiar ningún componente todavía — solo instalar las fuentes 
   y hacerlas disponibles como CSS variables.

### Parte B — Limpieza global de tokens CSS

1. Ejecutar: grep -rn "var(--kp-" src/ --include="*.tsx" --include="*.ts"
   Esto encuentra TODOS los usos de var(--kp-*) sin el prefijo --color-.

2. El BrandingInjector inyecta tokens con prefijo --color-kp-* 
   (convención Tailwind v4). Los correctos son:
   - var(--color-kp-primary, #006B6B)
   - var(--color-kp-primary-deep, #004545)
   - var(--color-kp-accent, #00B0A8)
   - var(--color-kp-accent-lt, #E6FAF9)
   - var(--color-kp-secondary, #F5A623)
   - var(--color-kp-primary-hover, #009990)

3. Cada uso de var(--kp-navy) → var(--color-kp-primary-deep, #004545)
   Cada uso de var(--kp-primary) → var(--color-kp-primary, #006B6B)
   Cada uso de var(--kp-accent) → var(--color-kp-accent, #00B0A8)
   Siempre incluir fallback hardcoded por seguridad.

4. Verificar también clases Tailwind que referencien tokens kp:
   - text-kp-primary → verificar que mapea al token correcto en @theme
   - bg-kp-primary → idem
   - border-kp-border → idem
   Si hay inconsistencias, corregir en globals.css o @theme.

5. Los tokens estáticos de globals.css (surface-0, surface-1, ink-1, 
   ink-2, ink-3, kp-border) NO cambian — verificar que siguen ahí.

### Verificación
- grep -rn "var(--kp-" src/ --include="*.tsx" → 0 resultados 
  (todos deben usar --color-kp-* ahora)
- npm run build = 0 errores
- Abrir la app en dev → la tipografía cambió a DM Sans
- Los colores de botones y backgrounds se ven correctamente 
  (no hay botones transparentes/invisibles)
```

---

### Sesión 2 — Sidebar colapsada + TopBar

**Scope**: Sidebar.tsx, TopBar.tsx (o crear si no existe), DashboardShell.tsx
**Riesgo**: Medio — el Sidebar es compartido por toda la app.

```
## Contexto
Lee CLAUDE.md. Sprint RD-1 Sesión 2: sidebar colapsada y topbar.
Pre-requisito: Sesión 1 completada (tipografía + tokens limpios).

## Tarea

### Parte A — Sidebar colapsada a 56px

Refactorizar src/components/layout/Sidebar.tsx:

1. ANTES: sidebar de ~200-220px con texto completo (nombre de clínica, 
   nombre de profesional, labels de navegación, footer con versión).

2. DESPUÉS: sidebar de 56px, solo iconos. Estructura vertical:
   - Logo clínica (32x32, iniciales o ícono, border-radius: 8px)
   - Separador (16px gap)
   - Nav icons: Agenda, Pacientes, Configuración (40x40 hit area)
   - Spacer (flex: 1)
   - Avatar profesional (32x32, iniciales, border-radius: 50%)

3. Estilos:
   - Fondo: var(--color-kp-primary-deep, #004545) — el token oscuro 
     del branding. NO hardcodear #0B1A2E (eso es navy de Synapta, 
     no de la clínica).
   - Iconos inactivos: color #64748B (slate-500)
   - Ícono activo: color var(--color-kp-accent, #00B0A8) + 
     background rgba del accent con 15% opacity
   - Hover: background rgba(255,255,255,0.06)

4. Usar lucide-react para iconos: Calendar, Users, Settings.
   NO agregar lucide-react si ya está instalado.

5. Tooltip al hover en cada ícono con el label (ej: "Pacientes"). 
   Tooltip simple con CSS (::after pseudo-element o title attribute). 
   No instalar librerías de tooltip.

6. El avatar inferior muestra las iniciales del profesional. Al hover 
   muestra tooltip con nombre completo + especialidad.

7. Las props que Sidebar recibe deben simplificarse:
   - NECESITA: nombre del profesional, especialidad, ruta activa, 
     nombre de clínica (para tooltip del logo)
   - NO NECESITA: lista completa de módulos activos (eso lo manejan 
     las rutas, no la sidebar)

### Parte B — TopBar con breadcrumb

Crear o refactorizar componente de barra superior (48px de alto):

1. Izquierda: breadcrumb contextual
   - En /dashboard → "Agenda Diaria"
   - En /dashboard/pacientes → "Pacientes"
   - En /dashboard/pacientes/[id] → "Pacientes > Nombre Paciente"
   - En /dashboard/configuracion → "Configuración"
   
2. Derecha: fecha actual en formato "vie, 1 de mayo 2026"
   - Locale: es-CL
   - Timezone: America/Santiago

3. Estilos:
   - Fondo: var(--color-surface-1, #FFFFFF)
   - Border-bottom: 0.5px solid var(--color-kp-border, #E2E8F0)
   - Height: 48px, padding horizontal 20px

4. El breadcrumb es un Server Component (no necesita estado). 
   Recibe la ruta y el nombre del paciente si aplica.

### Parte C — DashboardShell actualizado

Actualizar DashboardShell.tsx para el nuevo layout:

1. Grid: sidebar fija a la izquierda (56px) + contenido a la derecha
2. El contenido tiene TopBar arriba + children abajo
3. Asegurarse de que el contenido ocupa 100% del alto restante

### Verificación
- La sidebar muestra solo iconos en 56px de ancho
- Los tooltips muestran labels al hover
- El breadcrumb muestra la ruta correcta en cada page
- La fecha se muestra en español con timezone Santiago
- npm run build = 0 errores
- Navegar a Agenda, Pacientes, Config → el ícono activo cambia
```

---

### Sesión 3 — Patient Header compacto + Action Bar

**Scope**: PatientHeader.tsx, PatientActionNav.tsx → nuevo ActionBar.tsx, pacientes/[id]/page.tsx
**Riesgo**: Medio — cambia el layout de la ficha de paciente.

```
## Contexto
Lee CLAUDE.md. Sprint RD-1 Sesión 3: patient header y action bar.
Pre-requisito: Sesión 2 completada (sidebar colapsada + topbar).

## Tarea

### Parte A — PatientHeader compacto

Refactorizar src/components/layout/PatientHeader.tsx:

1. ANTES: header vertical con avatar grande, datos en 2+ líneas, 
   badge "Paciente activo" prominente, botones "Iniciar atención" 
   y "Egresar paciente" uno debajo del otro.

2. DESPUÉS: una sola barra horizontal (padding 16px 20px):
   
   [Avatar 44px] [Info] .......................... [Acciones]
   
   Avatar: 44x44, border-radius 50%, fondo accent-lt, 
   iniciales en color primary-deep.
   
   Info (flex: 1):
     Línea 1: Nombre completo + badge "Activo" (10px, uppercase, 
              success-lt/success)
     Línea 2: RUT (DM Mono, 11px) · Edad (M/F) · Previsión · Ocupación
              — separados por · (middle dot) en color ink-3
   
   Acciones (flex-shrink: 0, gap 6px):
     - Botón primario: "Iniciar atención" (teal, con ícono +)
       → Este botón solo aparece si NO hay encuentro en progreso
     - Botón ghost: "Editar" (con ícono lápiz)
     - Botón ghost: ícono solo de Export PDF
     - Botón danger-ghost: ícono solo de "Egresar" (rojo sutil, 
       alejado del CTA principal para evitar clic accidental)

3. Estilos del header:
   - Fondo: var(--color-surface-1)
   - Border-bottom: 0.5px solid var(--color-kp-border)

4. El RUT debe usar la clase font-mono-clinical (de Sesión 1).

5. Los datos opcionales (Ocupación, Dirección) se omiten si son null. 
   No mostrar "Sin registro" — simplemente no aparece el item.
   La dirección NO se muestra en el header (es demasiado larga). 
   Solo en la vista de editar paciente.

### Parte B — Action Bar horizontal

Crear src/components/shared/ActionBar.tsx (o refactorizar 
PatientActionNav.tsx):

1. ANTES: columna lateral izquierda con secciones "ACCIONES" y 
   "EVALUACIÓN" que ocupa ~250px de ancho.

2. DESPUÉS: barra horizontal (height ~44px) debajo del PatientHeader:
   
   [Nota rápida] [Signos vitales] [Consentimiento] [Anamnesis] ... [FHIR]
   
   Cada acción es un "chip": inline-flex, gap 4px, padding 5px 10px, 
   border-radius 6px, font-size 11px, bg surface-0, border 0.5px.
   
   Al hover: border color cambia a teal, text color cambia a teal.
   
   "FHIR" va al final con estilo dashed border + color ink-4 
   (es feature secundaria).

3. Los chips que aparecen dependen de los módulos activos de la clínica:
   - Nota rápida → siempre visible (cualquier modelo)
   - Signos vitales → si M2 activo
   - Consentimiento → si M5 activo
   - Anamnesis → si M2 activo
   - Egresos → si M9 activo
   - Exportar PDF → siempre visible
   - FHIR → siempre visible pero estilo secundario

4. IMPORTANTE: el chip "Egresar paciente" NO va aquí. Egresar es una 
   acción destructiva que va en el PatientHeader como ícono pequeño 
   (Parte A punto 2).

### Parte C — Actualizar page.tsx de la ficha

En src/app/dashboard/pacientes/[id]/page.tsx:

1. ANTES: layout de 3 columnas (acciones | timeline | resumen)
2. DESPUÉS: layout vertical:
   - PatientHeader (compacto, una línea)
   - ActionBar (chips horizontales)
   - Body: grid 2 columnas → timeline (flex-1) | panel resumen (280px)

3. Eliminar el componente PatientActionNav de esta page (reemplazado 
   por ActionBar). El archivo PatientActionNav.tsx puede quedar en el 
   repo si otras pages lo usan — no eliminarlo, solo dejar de importarlo 
   aquí.

### Verificación
- El header del paciente cabe en una sola línea horizontal
- El RUT se muestra en tipografía monoespaciada
- Los chips de la action bar se muestran horizontalmente
- El botón "Iniciar atención" está a la derecha, separado del botón 
  de "Egresar"
- El timeline ahora ocupa más ancho (antes competía con la columna 
  de acciones)
- npm run build = 0 errores
- Verificar que las otras pages que importan PatientActionNav 
  siguen compilando
```

---

### Sesión 4 — Timeline entries rediseñados + inmutabilidad visual

**Scope**: ClinicalTimeline.tsx, componentes de entry por tipo
**Riesgo**: Medio — el timeline es el componente más complejo de la ficha.

```
## Contexto
Lee CLAUDE.md. Sprint RD-1 Sesión 4: timeline entries e inmutabilidad.
Pre-requisito: Sesión 3 completada (header compacto + action bar + 
layout 70/30).

## Tarea

### Parte A — Rediseño de timeline entries

Refactorizar el renderizado de entries en ClinicalTimeline.tsx:

1. Cada entry es una card con:
   - Border-radius: 10px
   - Border: 0.5px solid var(--color-kp-border)
   - Padding: 14px 16px
   - Margin-bottom: 10px
   - Hover: border-color cambia a border-md (más visible)

2. Borde izquierdo por tipo (3px, borde solo del lado izquierdo):
   - nota_clinica / soap → var(--color-kp-primary) (teal)
   - instrumento → var(--color-kp-accent) (turquesa)
   - prescripcion → var(--color-kp-secondary) (amber)
   - signos_vitales → #94A3B8 (ink-3, neutro)
   - consentimiento → #94A3B8 (ink-3, neutro)
   - evaluacion → var(--color-kp-primary) (teal)

3. Header del entry (flex row):
   - Ícono de tipo: 28x28px, border-radius 6px, fondo tintado suave
     * nota/soap: fondo #EEF2FF, color #4F46E5 (indigo)
     * instrumento: fondo accent-lt, color teal
     * prescripcion: fondo amber-lt (#FEF3E2), color #B45309
     * signos: fondo surface-0, color ink-3
     * consentimiento: fondo surface-0, color ink-3
   - Título: font-size 13px, font-weight 500
   - Meta: font-size 11px, color ink-3 → "Profesional · Especialidad · Fecha"
   - Ícono de candado (solo si firmado): a la derecha, color teal

4. Body del entry (debajo del header, con border-top sutil):
   - Labels de campos: 10px, uppercase, letter-spacing 0.6px, color ink-3
   - Valores: 13px, color ink-1
   - CIE-10 badges: inline-block, padding 2px 8px, border-radius 6px, 
     fondo accent-lt, color primary-deep

### Parte B — Inmutabilidad visual (Pilar 4)

Agregar tratamiento visual diferenciado para documentos firmados vs borrador:

1. Entry FIRMADO:
   - Borde izquierdo de 3px (color según tipo)
   - Ícono de candado (Lock de lucide-react) a la derecha del header
   - Barra al pie: "Firmado · Dra. X · fecha" en color teal, 
     separada por border-top sutil
   - Fondo del entry: var(--color-surface-1) normal
   - NO tiene bordes interactivos al foco (no es editable)

2. Entry EN BORRADOR (no firmado):
   - Sin borde izquierdo coloreado (o borde gris sutil)
   - Sin ícono de candado
   - Al hover: borde cambia a color accent (invita a editar)
   - Badge "Borrador" junto al título: font-size 10px, 
     fondo amber-lt, color amber oscuro

3. Aplicar a todos los tipos de entry que tienen firma: 
   nota_clinica, soap, consentimiento, prescripcion.
   Los que no tienen firma (signos_vitales, instrumento) siempre 
   se muestran en estilo neutro.

### Parte C — Instrumentos con puntaje prominente

Para entries de tipo "instrumento":

1. Mostrar puntaje en formato grande: 22px, font-weight 500, DM Mono
   Formato: "11 / 23 puntos"

2. Badge de interpretación debajo del puntaje:
   - Riesgo alto/muy alto: fondo danger-lt, color danger
   - Riesgo moderado: fondo amber-lt, color amber oscuro
   - Riesgo bajo/sin riesgo: fondo success-lt, color success

### Verificación
- Los entries del timeline tienen borde izquierdo por tipo
- Las notas firmadas muestran candado + barra "Firmado"
- Las notas en borrador muestran badge "Borrador"
- Los instrumentos muestran puntaje grande con interpretación coloreada
- Los iconos de tipo son visualmente distinguibles
- npm run build = 0 errores
```

---

### Sesión 5 — Panel de resumen clínico + estados vacíos + polish final

**Scope**: SummaryPanel.tsx, estados vacíos, detalles finales
**Riesgo**: Bajo — es el panel lateral, no afecta flujos principales.

```
## Contexto
Lee CLAUDE.md. Sprint RD-1 Sesión 5: panel de resumen y polish final.
Pre-requisito: Sesión 4 completada (timeline rediseñado).

## Tarea

### Parte A — Panel de resumen clínico (280px)

Refactorizar SummaryPanel.tsx:

1. Ancho fijo: 280px. Fondo: surface-1. Border-left: 0.5px solid 
   kp-border. Padding: 16px. Overflow-y: auto.

2. Secciones en orden vertical:
   a) Botón "Resumen IA" — ancho completo, fondo gradiente suave 
      (accent-lt a indigo-50), border 0.5px accent, font-size 12px.
      Por ahora es decorativo (no funcional). Si ya existe la 
      funcionalidad, mantenerla.
   
   b) "ÚLTIMOS SIGNOS VITALES" — grid 2x2:
      Cada celda: fondo surface-0, border-radius 6px, padding 8px 10px, 
      text-align center.
      Valor: 16px, font-weight 500, DM Mono
      Label: 10px, color ink-3
      Celdas: PA (mmHg), FC (bpm), Temp (°C), SpO₂ (%)
      Si no hay signos registrados: mostrar "—" en cada celda.
   
   c) "DIAGNÓSTICOS ACTIVOS" — lista con dot indicator:
      Cada diagnóstico: dot (6px, teal, border-radius 50%) + texto 13px
      Si no hay: estado vacío (ver Parte B)
   
   d) "ANTECEDENTES" — texto libre de fce_anamnesis.
      Si no hay: estado vacío (ver Parte B)
   
   e) "MOTIVO DE CONSULTA" — card surface-0 con texto.
      Si no hay: estado vacío
   
   f) "PLAN ACTUAL" — card surface-0 con texto.
      Si no hay: estado vacío
   
   g) "INDICACIONES FARMACOLÓGICAS" — si M7 activo, lista de 
      medicamentos activos. Si no hay: estado vacío.

3. Cada sección tiene título con:
   - Ícono de lucide-react (12px): Activity, CircleDot, Heart, 
     ClipboardList, FileText, Pill
   - Font-size: 10px, font-weight 500, uppercase, letter-spacing 0.8px
   - Color: ink-3

### Parte B — Estados vacíos interactivos

TODOS los estados vacíos del panel de resumen pasan de:
   "Sin registro" (texto gris pasivo)
a:
   "+ Agregar [concepto]" (texto ink-4, con ícono PlusCircle 12px)
   Al hover: color cambia a teal (invita a la acción)
   Al click: navega a la página correspondiente o abre el modal 
   correspondiente (usar las mismas rutas que usaba PatientActionNav).

Ejemplos:
- Sin signos vitales → "+ Registrar signos vitales" → abre modal o 
  navega a ruta de signos vitales
- Sin antecedentes → "+ Agregar antecedentes" → navega a anamnesis
- Sin diagnósticos → "+ Agregar diagnóstico" → navega a encuentro 
  o abre la nota clínica
- Sin plan → "+ Registrar plan" → navega a nota clínica

### Parte C — Polish final

1. Verificar que en TODAS las pages de la ficha de paciente 
   (anamnesis, consentimiento, auditoria, exportar-pdf, fhir, 
   encuentro/[id]/*) el nuevo layout (sidebar colapsada + topbar) 
   se ve correcto.

2. Verificar que el responsive mínimo funciona:
   - En viewport < 1024px: el panel de resumen se oculta o colapsa 
     (no es crítico para MVP pero no debe romper el layout)
   - La sidebar de 56px debe ser position fixed o sticky para que 
     no se desplace con el scroll

3. Verificar accesibilidad básica:
   - Los botones de la action bar tienen aria-label o title
   - Los iconos de la sidebar tienen title para screen readers
   - El contraste de texto sobre fondos cumple WCAG AA (4.5:1 mínimo)

4. Ejecutar búsqueda final de inconsistencias:
   - grep -rn "var(--kp-" src/ → debe ser 0 resultados
   - grep -rn "#0B1A2E" src/ → si existe, reemplazar por token CSS
   - grep -rn "bg-teal-" src/ → no debería existir (usar tokens kp)

### Verificación final del sprint
- npm run build = 0 errores
- Abrir en dev cada ruta principal:
  * /dashboard → agenda con nuevo sidebar
  * /dashboard/pacientes → lista con nuevo sidebar
  * /dashboard/pacientes/[id] → ficha con header compacto + action bar 
    + timeline rediseñado + panel resumen
  * /dashboard/pacientes/[id]/encuentro/[id]/clinico → workspace 
    clínico con nuevo layout
  * /dashboard/pacientes/[id]/encuentro/[id]/dental → workspace 
    dental con nuevo layout
  * /dashboard/configuracion → config con nuevo sidebar
- Todas las rutas renderizan sin errores de consola
- Los tokens de branding se aplican correctamente (colores de la 
  clínica, no hardcoded)
```

---

## Archivos que se tocan (resumen por sesión)

| Sesión | Archivos principales | Archivos secundarios (verificar) |
|:---:|---|---|
| S1 | `globals.css`, `layout.tsx` (fonts), `BrandingInjector.tsx`, todos los archivos con `var(--kp-*` incorrecto | — |
| S2 | `Sidebar.tsx`, `TopBar.tsx` (nuevo o refactor), `DashboardShell.tsx` | Todas las pages bajo `/dashboard/` |
| S3 | `PatientHeader.tsx`, `PatientActionNav.tsx` → `ActionBar.tsx`, `pacientes/[id]/page.tsx` | Pages que importen PatientActionNav |
| S4 | `ClinicalTimeline.tsx`, entry renderers por tipo | — |
| S5 | `SummaryPanel.tsx`, pages de la ficha, grep final | Todas las rutas del dashboard |

---

## Archivos que NO se tocan

- Server actions (`src/app/actions/*`) — cero cambios
- `registry.ts`, `modelos.ts`, `guards.ts`, `config.ts` — cero cambios
- Tablas de DB — cero migrations
- Componentes de modelo específico (`SoapForm`, `NotaClinicaForm`, `DentalWorkspace`, etc.) — NO se rediseñan en este sprint. Solo se verifica que renderizan correctamente dentro del nuevo layout.
- `lib/supabase/*` — cero cambios
- `types/*` — cero cambios (excepto si se necesita un type nuevo para props de ActionBar o TopBar)

---

## Reglas de implementación

1. **Colores solo via tokens CSS** — `var(--color-kp-*)` para branding, `var(--color-surface-*)` / `var(--color-ink-*)` para estáticos. Nunca hex hardcoded en TSX (excepto fallbacks dentro del `var()`).

2. **DM Mono solo para datos clínicos** — RUT, dosis de medicamentos, puntajes de instrumentos, códigos CIE-10. Todo lo demás en DM Sans.

3. **Lucide-react para iconos** — ya está instalado. No agregar otra librería de iconos.

4. **No agregar dependencias nuevas** — motion/react ya existe si se necesitan animaciones sutiles.

5. **Server Components por defecto** — TopBar y breadcrumb son Server Components. ActionBar puede ser Client Component si los chips necesitan onClick handlers.

6. **Los tooltips de la sidebar son CSS puro** — no instalar librerías de tooltip. Usar title attribute o pseudo-elements.

7. **npm run build = 0 errores al cerrar CADA sesión**, no solo la última.

---

## Commits

```
feat(sprint-rd1)(layout): sidebar colapsada 56px con iconos
feat(sprint-rd1)(layout): topbar con breadcrumb contextual
feat(sprint-rd1)(layout): patient header compacto una línea
feat(sprint-rd1)(layout): action bar horizontal reemplaza nav lateral
feat(sprint-rd1)(shared): timeline entries con borde por tipo
feat(sprint-rd1)(shared): inmutabilidad visual borrador vs firmado
feat(sprint-rd1)(shared): panel resumen con estados vacíos interactivos
fix(sprint-rd1)(shared): limpieza tokens CSS var(--kp-*) → var(--color-kp-*)
feat(sprint-rd1)(shared): tipografía DM Sans + DM Mono
```

---

## Riesgos y mitigaciones

1. **Sidebar colapsada puede romper el responsive existente** — si hay media queries que dependan del ancho del sidebar actual. Mitigación: grep de media queries que referencien el sidebar antes de cambiar.

2. **PatientActionNav eliminado de page.tsx pero usado en otras pages** — no eliminar el archivo, solo dejar de importarlo en la ficha principal. Verificar imports con grep.

3. **ClinicalTimeline es complejo** — tiene tabs por especialidad, filtros, expand/collapse, rendering por tipo de entry. No reescribir desde cero; hacer cambios quirúrgicos al rendering. La lógica de tabs y filtros no cambia.

4. **DM Sans puede no estar disponible offline** — next/font/google lo descarga en build time. Verificar que el fallback a system font funciona.

5. **El panel de resumen de 280px fijos puede ser estrecho en pantallas < 1280px** — si el viewport es menor, el timeline se comprime demasiado. Mitigación: en viewport < 1024px, ocultar el panel o hacerlo colapsable.

---

## Criterios de aceptación del sprint completo

- [ ] Sidebar de 56px con iconos en toda la app
- [ ] TopBar con breadcrumb y fecha en español
- [ ] Patient header en una línea horizontal
- [ ] Action bar horizontal con chips contextuales
- [ ] Timeline entries con borde izquierdo por tipo
- [ ] Notas firmadas con candado + barra de firma
- [ ] Notas en borrador con badge "Borrador"
- [ ] Panel de resumen con signos vitales en grid 2x2
- [ ] Estados vacíos con "+Agregar..." interactivo
- [ ] RUT y puntajes en DM Mono
- [ ] 0 usos de var(--kp-*) sin prefijo --color-
- [ ] 0 hex hardcoded en TSX (excepto fallbacks)
- [ ] npm run build = 0 errores
- [ ] Todas las rutas principales renderizan correctamente

---

## Documentación post-sprint

Al cerrar RD-1, actualizar:

1. **CLAUDE.md** → agregar RD-1 en sprints completados, actualizar sección de paleta de colores si cambia algo, documentar la convención DM Sans / DM Mono.

2. **04-criterios-tecnicos.md** → agregar regla sobre DM Mono para datos clínicos, documentar la convención de Action Bar vs PatientActionNav.

3. **docs/sprints.md** → marcar RD-1 como completado.

---

## Próximos pasos post-RD-1

- **RD-2** (futuro): rediseño del workspace de encuentro (la página donde el profesional escribe la nota clínica + aplica instrumentos). Layout adaptativo por modelo.
- **RD-3** (futuro): responsive tablet para profesionales en terreno.
- **RD-4** (futuro): design system documentado (catálogo de componentes).
