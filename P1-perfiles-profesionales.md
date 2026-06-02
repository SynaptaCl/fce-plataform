# Sprint P1 — Perfiles Profesionales y Personalización por Especialidad

> **Estado**: Listo para ejecución · **Fecha de planificación**: 2026-06-01
> **Pre-requisito de lectura**: `CLAUDE.md`, `docs/plan-redisenio/00-vision-general.md`, `docs/plan-redisenio/04-criterios-tecnicos.md`
> **Riesgo**: Medio (Fase 0 toca RLS en DB compartida) · **Días estimados**: 5-7

---

## Objetivo del sprint

Transformar la FCE de una ficha genérica en una herramienta que se adapta al workflow real de cada profesional. Al terminar este sprint, cuando un profesional abre el encuentro de un paciente, ve **solo las herramientas que su especialidad y el servicio reservado requieren** — sin ruido, sin buscar entre 24 instrumentos, con los launchers correctos y el contexto pre-cargado.

**Principio rector**: la personalización se decide en **una sola fuente de verdad** (el nuevo registry de config por especialidad). Ningún componente deduce qué mostrar con `if (especialidad === ...)`.

---

## Criterios de aceptación globales

- [ ] `npm run build` con 0 errores y 0 warnings al cierre de cada fase
- [ ] TypeScript strict, sin `any` implícitos
- [ ] Tokens `var(--color-kp-*)` — nunca `var(--kp-*)` ni hex hardcoded (ver bug documentado en informe dental)
- [ ] RLS verificado en toda tabla tocada
- [ ] Audit log en toda escritura nueva
- [ ] Cada fase termina con su test de integración (`scripts/test-sprint-p1-fN.ts`)
- [ ] El mapeo especialidad → config vive SOLO en `lib/modules/especialidad-config.ts`

---

## Dependencias y orden

```
Fase 0 (DDL seguridad) ─── debe ir PRIMERO, bloquea go-live
   │
   ├─→ Fase 1 (registry config) ─── base de todo lo demás
   │      │
   │      ├─→ Fase 2 (servicio → contexto)
   │      └─→ Fase 3 (workspace adaptado) ── consume Fase 1 y 2
   │
   └─→ Fase 4 (validación + selector perfil) ── independiente, puede ir en paralelo a 2-3
          │
          └─→ Fase 5 (onboarding cenupsi SQL) ── al final, valida todo lo anterior
```

---

## FASE 0 — Hotfix de seguridad (DDL)

> **Claude Code genera el SQL, NO lo aplica.** Las migraciones se aplican con confirmación humana explícita en sesión separada (hard-stop CLAUDE.md). DB compartida por 3 repos.

### Problema

Tres políticas RLS exponen datos cross-tenant:

1. `fce_notas_soap.fce_soap_select` con `USING(true)` → cualquier autenticado lee SOAP de cualquier clínica
2. `fce_evaluaciones.fce_evaluaciones_select` y `_update` con `USING(true)` → mismo problema
3. `profesionales.public_read_profesionales_activos` → SELECT sin autenticación, expone nombres y especialidades

Ni `fce_notas_soap` ni `fce_evaluaciones` tienen `id_clinica`, por lo que el filtro va via JOIN a `fce_encuentros`.

### Migración a generar

`supabase/migrations/20260601_01_hotfix_rls_tenant_isolation.sql`

```sql
-- Migration: 20260601_01_hotfix_rls_tenant_isolation
-- Sprint: P1 / Fase 0
-- Descripción: Cierra fuga cross-tenant en fce_notas_soap, fce_evaluaciones y profesionales
-- Impacto: Solo políticas RLS. No toca datos ni estructura.
-- Rollback: recrear las políticas con USING(true) (NO recomendado)

-- 1. fce_notas_soap — filtrar via JOIN a fce_encuentros
DROP POLICY IF EXISTS fce_soap_select ON fce_notas_soap;
CREATE POLICY fce_soap_select ON fce_notas_soap FOR SELECT TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 2. fce_evaluaciones — SELECT
DROP POLICY IF EXISTS fce_evaluaciones_select ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_select ON fce_evaluaciones FOR SELECT TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 3. fce_evaluaciones — UPDATE
DROP POLICY IF EXISTS fce_evaluaciones_update ON fce_evaluaciones;
CREATE POLICY fce_evaluaciones_update ON fce_evaluaciones FOR UPDATE TO authenticated
  USING (id_encuentro IN (
    SELECT id FROM fce_encuentros
    WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  ));

-- 4. profesionales — eliminar lectura pública sin auth
DROP POLICY IF EXISTS public_read_profesionales_activos ON profesionales;
-- profesionales_by_clinica ya cubre el SELECT autenticado por clínica.
```

### Verificación post-migration (SQL de prueba)

```sql
-- Debe retornar solo SOAPs de la clínica del usuario autenticado (0 si no hay encuentros)
SELECT COUNT(*) FROM fce_notas_soap;
-- Confirmar que la policy pública ya no existe
SELECT policyname FROM pg_policies WHERE tablename='profesionales';
```

### Criterios de aceptación Fase 0

- [ ] SQL generado y presentado para revisión humana
- [ ] NO aplicado por Claude Code
- [ ] Verificación documentada de que un profesional de clínica A no puede leer SOAP de clínica B
- [ ] El INSERT/UPDATE existente sigue funcionando (no romper el flujo de Korporis/rehab)

> **ATENCIÓN regresión**: `fce_notas_soap` y `fce_evaluaciones` son las tablas del modelo rehab que usa Korporis. Tras aplicar, correr `npm run test:sprint-r7` para confirmar que no se rompió el flujo de rehabilitación.

---

## FASE 1 — Registry de configuración por especialidad

### Problema

Hoy la información de qué necesita cada especialidad está dispersa: parte en `ESPECIALIDADES_REGISTRY` (registry.ts), parte en `modelos.ts`, parte hardcodeada en componentes. No hay un solo lugar que responda "¿qué ve un nutricionista al abrir un encuentro?".

### Solución

Crear `src/lib/modules/especialidad-config.ts` — fuente única de verdad de la personalización.

```typescript
import { ModeloClinico } from "./registry";

export interface SeccionNota {
  id: string;
  label: string;
  tipo: "texto_libre" | "estructurada";
  obligatoria: boolean;
}

export interface AccionRapida {
  id: string;
  label: string;
  modulo: string;          // "M7", "M8", "M10", "instrumento", etc.
  icon: string;            // nombre lucide-react
  requierePermiso?: "puede_prescribir" | "puede_indicar_examenes";
}

export interface EspecialidadConfig {
  modelo: ModeloClinico;
  instrumentosSugeridos: string[];   // códigos del catálogo, orden = relevancia
  modulosHabilitados: string[];      // M7, M8, M10 según especialidad
  tieneContraindicaciones: boolean;
  tieneEscalaFuncional: boolean;
  tieneCopilotoIA: boolean;
  tieneResumenIA: boolean;
  secciones: SeccionNota[];
  accionesRapidas: AccionRapida[];
}

export const ESPECIALIDAD_CONFIG: Record<string, EspecialidadConfig> = {
  "Kinesiología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "barthel"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],  // rehab usa SOAP estructurado, no secciones de nota libre
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Fonoaudiología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "ados2"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Masoterapia": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
  "Terapia Ocupacional": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "brief2", "vineland3", "sensory_profile2"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Podología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
  "Medicina General": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["phq9", "gad7", "mmse", "glasgow", "barthel", "downton", "lawton", "apgar", "eva", "conners3"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", tipo: "texto_libre", obligatoria: true },
      { id: "contenido", label: "Evolución", tipo: "texto_libre", obligatoria: true },
      { id: "diagnostico", label: "Diagnóstico (ICD-11)", tipo: "estructurada", obligatoria: false },
      { id: "plan", label: "Plan", tipo: "texto_libre", obligatoria: false },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Enfermería": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["braden", "downton", "glasgow", "lawton", "barthel", "apgar", "eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo", tipo: "texto_libre", obligatoria: true },
      { id: "contenido", label: "Evolución", tipo: "texto_libre", obligatoria: true },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Psicología": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["eva", "gad7", "mmse", "phq9", "adir", "cars2", "wiscv", "wppsi", "ados2", "conners3", "brief2", "vineland3"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", tipo: "texto_libre", obligatoria: true },
      { id: "contenido", label: "Evolución de sesión", tipo: "texto_libre", obligatoria: true },
      { id: "plan", label: "Plan terapéutico", tipo: "texto_libre", obligatoria: false },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Nutrición": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["eva"],  // pendiente seed MNA, SGA
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", tipo: "texto_libre", obligatoria: true },
      { id: "contenido", label: "Evaluación nutricional", tipo: "texto_libre", obligatoria: true },
      { id: "plan", label: "Plan alimentario", tipo: "texto_libre", obligatoria: false },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Odontología": {
    modelo: "odontologico",
    instrumentosSugeridos: ["eva", "mdas", "cpod", "oleary", "indice_gingival", "ipc"],
    modulosHabilitados: ["M7"],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", tipo: "texto_libre", obligatoria: true },
      { id: "contenido", label: "Evolución dental", tipo: "texto_libre", obligatoria: true },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
    ],
  },
  "Administración Clínica": {
    modelo: "ninguno",
    instrumentosSugeridos: [],
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
};

/**
 * Fuente única de verdad de la config de una especialidad.
 * Retorna la config de 'Administración Clínica' (modelo ninguno) si no existe.
 */
export function getEspecialidadConfig(especialidad: string): EspecialidadConfig {
  return ESPECIALIDAD_CONFIG[especialidad] ?? ESPECIALIDAD_CONFIG["Administración Clínica"];
}
```

### Reglas

- `getModeloDeEspecialidad()` en `modelos.ts` debe pasar a **derivar** de este config (`getEspecialidadConfig(esp).modelo`) para no duplicar el mapeo. NO romper su firma pública.
- Los códigos de `instrumentosSugeridos` DEBEN coincidir con `instrumentos_valoracion.codigo` en DB. Validar en el test.
- `tieneContraindicaciones` y `tieneEscalaFuncional` ya existen en `ESPECIALIDADES_REGISTRY` — mantener sincronizados o migrar el dato a este config y dejar el registry como referencia de estado/label.

### Criterios de aceptación Fase 1

- [ ] `especialidad-config.ts` creado con las 11 especialidades del catálogo
- [ ] Todos los `instrumentosSugeridos` existen en `instrumentos_valoracion.codigo` (test lo verifica)
- [ ] `getModeloDeEspecialidad()` deriva del nuevo config sin cambiar su firma
- [ ] `npm run build` 0 errores
- [ ] `scripts/test-sprint-p1-f1.ts` valida que cada código de instrumento sugerido existe en DB

---

## FASE 2 — Servicio → contexto del encuentro

### Problema

El encuentro nace de una cita (`fce_encuentros.id_cita` → `citas.id_profesional_servicio` → `servicios`). Hoy esa información se ignora. Un psicólogo que abre el encuentro de una cita "Evaluación TEA" debería ver ADOS-2 + ADI-R + CARS-2 sugeridos arriba, no buscarlos entre 12 instrumentos.

### Solución

Crear `src/lib/modules/servicio-config.ts` — mapeo servicio → instrumentos/contexto sugerido. Mapeo por **keywords del nombre del servicio** (robusto ante nombres ligeramente distintos entre clínicas), con override opcional por código de servicio.

```typescript
export interface ServicioContexto {
  instrumentosSugeridos: string[];   // override sobre los de la especialidad
  nota?: string;                     // hint para el profesional
}

/**
 * Mapeo por keywords. Se evalúa el nombre del servicio en minúsculas.
 * El primer match gana. Si no hay match, se usan los de la especialidad.
 */
const SERVICIO_KEYWORDS: Array<{ keywords: string[]; contexto: ServicioContexto }> = [
  {
    keywords: ["autismo", "tea", "ados", "adi-r"],
    contexto: {
      instrumentosSugeridos: ["ados2", "adir", "cars2"],
      nota: "Evaluación integral de autismo: aplicar ADOS-2 y ADI-R.",
    },
  },
  {
    keywords: ["tdah", "déficit atencional", "deficit atencional"],
    contexto: {
      instrumentosSugeridos: ["conners3", "brief2"],
      nota: "Evaluación de TDAH: Conners-3 y BRIEF-2 recomendados.",
    },
  },
  {
    keywords: ["wisc"],
    contexto: { instrumentosSugeridos: ["wiscv"], nota: "Psicometría WISC-V (niños)." },
  },
  {
    keywords: ["wais"],
    contexto: { instrumentosSugeridos: ["wppsi"], nota: "Psicometría WAIS-IV (adultos). Registrar resultado." },
  },
  {
    keywords: ["nutricional", "nutrición", "nutricion"],
    contexto: { instrumentosSugeridos: ["eva"], nota: "Valoración nutricional. (MNA/SGA pendientes en catálogo.)" },
  },
  {
    keywords: ["kinesiológic", "kinesiologic", "kinesiología"],
    contexto: { instrumentosSugeridos: ["eva", "barthel"] },
  },
  {
    keywords: ["plantillas ortopédicas", "plantillas ortopedicas"],
    contexto: { instrumentosSugeridos: ["eva"], nota: "Confección de plantillas: registrar evaluación de la marcha." },
  },
  {
    keywords: ["terapia de pareja", "familiar"],
    contexto: { instrumentosSugeridos: [], nota: "Terapia de pareja/familiar: nota libre, sin instrumentos por defecto." },
  },
];

/**
 * Devuelve el contexto sugerido por el nombre del servicio.
 * null si no hay match (el caller usa los instrumentos de la especialidad).
 */
export function getServicioContexto(nombreServicio: string | null): ServicioContexto | null {
  if (!nombreServicio) return null;
  const n = nombreServicio.toLowerCase();
  for (const entry of SERVICIO_KEYWORDS) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry.contexto;
  }
  return null;
}
```

### Server action de soporte

`actions/encuentros.ts` — al cargar el encuentro, resolver el nombre del servicio de la cita asociada:

```typescript
// Pseudo: dentro de getEncuentroContext(encuentroId)
// 1. fce_encuentros → id_cita
// 2. si id_cita: citas → id_profesional_servicio → servicios.nombre
// 3. retornar { especialidad, nombreServicio }
// Si id_cita es null (walk-in): nombreServicio = null
```

### Criterios de aceptación Fase 2

- [ ] `servicio-config.ts` creado con el mapeo por keywords
- [ ] Server action resuelve `nombreServicio` desde `fce_encuentros.id_cita`
- [ ] Walk-in (id_cita null) no rompe — cae a instrumentos de especialidad
- [ ] Todos los códigos referenciados existen en DB (test)
- [ ] `scripts/test-sprint-p1-f2.ts` prueba 3 servicios reales de cenupsi (TEA, kine, nutrición)

---

## FASE 3 — Workspace adaptado

### Problema

El workspace del encuentro hoy muestra lo mismo para todos. Debe consumir Fase 1 + Fase 2 para personalizar.

### Cambios

**1. Filtro de instrumentos por especialidad** (la brecha de UI del informe)

`actions/clinico/catalogo-instrumentos.ts`:
```typescript
// Recibir especialidad, filtrar con .contains('especialidades', [especialidad])
// .contains usa el operador @> de Postgres sobre el array especialidades[]
```

`components/clinico/InstrumentosPanel.tsx` + `InstrumentoLauncher.tsx`:
- Recibir prop `especialidad: string` (del profesional activo)
- Recibir prop `instrumentosSugeridos: string[]` (de Fase 1/2)
- Mostrar los sugeridos primero (sección "Sugeridos para este servicio"), el resto del catálogo de la especialidad debajo

**2. Launchers condicionados por config**

En el workspace (`encuentro/[id]/clinico/page.tsx`, `rehab/page.tsx`, `dental/page.tsx`):
- Leer `getEspecialidadConfig(especialidad)`
- Renderizar solo las `accionesRapidas` cuyo `requierePermiso` se cumple (chequear `profesional.puede_prescribir` / `puede_indicar_examenes`)
- Ocultar Copiloto IA si `!tieneCopilotoIA`, Resumen IA si `!tieneResumenIA`

**3. Secciones de nota dinámicas (solo clinico_general)**

`components/clinico/NotaClinicaForm.tsx`:
- Renderizar las `secciones` del config en vez de campos fijos
- Respetar `obligatoria` para validación

### Reglas

- La bifurcación por modelo sigue SOLO en el router de encuentro. Los componentes reciben `especialidad` y `config` como props, no los deducen (criterio técnico #11).
- NO tocar el modelo rehab existente más allá de pasarle la config. Korporis debe seguir funcionando idéntico.

### Criterios de aceptación Fase 3

- [ ] Un kinesiólogo ve 2 instrumentos, un psicólogo 12, filtrados por especialidad
- [ ] Instrumentos sugeridos por servicio aparecen destacados arriba
- [ ] Launcher de prescripción solo visible si `puede_prescribir`
- [ ] Launcher de examen solo visible si `puede_indicar_examenes`
- [ ] Copiloto IA solo donde `tieneCopilotoIA`
- [ ] Korporis (rehab) sin regresión — `npm run test:sprint-r7` pasa
- [ ] `npm run build` 0 errores
- [ ] `scripts/test-sprint-p1-f3.ts` valida el filtro de instrumentos por especialidad

---

## FASE 4 — Validación de especialidad + selector de perfil

### 4A. Validación de especialidad al crear/editar profesional

**Problema**: `profesionales.especialidad` es texto libre. Hoy un profesional puede crearse con `'Kinesiologia'` (sin tilde) y solo falla al crear un encuentro (trigger tardío). Raíz del bug de normalización.

**Solución**: en la server action que crea/edita profesionales (buscar en `actions/`), validar contra `especialidades_catalogo` ANTES del INSERT/UPDATE:
```typescript
// Validar que especialidad existe y está activa en especialidades_catalogo
// Si no: retornar ActionResult.error con mensaje claro
// Nunca normalizar el string — debe coincidir exacto (con tilde)
```

### 4B. Selector de perfil activo

**Problema**: `getProfesionalesDelUsuario()` existe pero si un login tiene N>1 perfiles, `getProfesionalActivo()` toma el primero sin que el profesional elija.

**Solución**:
- `lib/fce/profesional.ts`: `getProfesionalActivo()` lee cookie `id_profesional_activo`; si existe y es válida para el login, la usa; sino toma el primero
- `components/layout/TopBar.tsx`: si `getProfesionalesDelUsuario()` retorna N>1, mostrar selector (dropdown). Al cambiar, setear cookie y `router.refresh()`
- Badge de especialidad activa siempre visible en TopBar
- Modal de selección al primer ingreso si N>1 y no hay cookie

**Estado actual**: ningún login tiene N>1 hoy. Implementar de todas formas — el modelo lo soporta y es prerequisito para médicos multiespecialidad. El test debe simular un login con 2 perfiles.

### Criterios de aceptación Fase 4

- [ ] Crear profesional con especialidad inválida retorna error claro, no llega a DB
- [ ] Especialidad se guarda exacta (con tilde), nunca normalizada
- [ ] Selector aparece solo si N>1 perfiles
- [ ] Cookie `id_profesional_activo` persiste la elección
- [ ] `getProfesionalActivo()` respeta la cookie
- [ ] `scripts/test-sprint-p1-f4.ts` simula login con 2 perfiles y valida el cambio

---

## FASE 5 — Onboarding cenupsi (SQL)

> **Claude Code genera el SQL, NO lo aplica.** Confirmación humana.

### Problema

`clinicas_fce_config` de cenupsi tiene `modulos_activos=[M1,M6]` y `especialidades_activas=[]`. Con 4 profesionales activos (Kine, Nutrición, Psicología, TO) esperando. Sin esta config el sidebar no muestra los módulos correctos.

### SQL a generar

`supabase/migrations/20260601_02_onboarding_cenupsi_fce_config.sql`

```sql
-- Migration: 20260601_02_onboarding_cenupsi_fce_config
-- Sprint: P1 / Fase 5
-- Descripción: Activa módulos y especialidades reales de cenupsi
-- Impacto: UPDATE de 1 fila en clinicas_fce_config
-- Rollback: UPDATE volviendo a [M1_identificacion, M6_auditoria] y []

UPDATE clinicas_fce_config
SET
  modulos_activos = ARRAY[
    'M1_identificacion', 'M2_anamnesis', 'M3_evaluacion', 'M3b_instrumentos',
    'M4_soap', 'M4b_nota_clinica', 'M5_consentimiento', 'M6_auditoria',
    'M9_egresos', 'M10_plan_intervencion'
  ],
  especialidades_activas = ARRAY[
    'Kinesiología', 'Nutrición', 'Psicología', 'Terapia Ocupacional'
  ]
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'cenupsi');
```

> El trigger `validate_especialidades_fce_config` valida que cada especialidad exista en el catálogo — las 4 ya existen, pasará sin problema.

### Verificación

```sql
SELECT modulos_activos, especialidades_activas
FROM clinicas_fce_config
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug='cenupsi');
```

### Nota sobre servicios sin profesional

Detectado en auditoría: varios servicios de cenupsi no tienen profesional asignado en `profesional_servicios` (Fonoaudiología, Psicopedagogía, Educación diferencial, Consejería de matrona). Además, Masoterapia la ofrece el kinesiólogo. **Esto NO bloquea el sprint** — son servicios ofertados que se reservan pero cuyo profesional se asigna al confirmar. Documentar para que el equipo decida si asigna profesionales o desactiva esos servicios.

### Criterios de aceptación Fase 5

- [ ] SQL generado y presentado, NO aplicado por Claude Code
- [ ] Tras aplicar (humano): sidebar de cenupsi muestra los módulos correctos por especialidad
- [ ] Cada profesional ve su workspace correcto (kine → SOAP, nutri/psico → nota clínica)

---

## Fuera de scope (no tocar en P1)

- Seed de instrumentos nutricionales MNA/SGA → requiere validación clínica humana
- Recolección de `numero_registro`/`tipo_registro` → operacional, no código
- Migración ICD-11 pendiente → sprint separado
- Workspace adaptativo por servicio nivel 3 (formularios distintos por tipo de servicio) → P3
- Migrar `servicio-config.ts` a tabla DB editable por clínica → cuando una clínica lo necesite

---

## Cierre del sprint

- [ ] `docs/sprints.md` actualizado con P1 completado + commit hash
- [ ] `CLAUDE.md` actualizado: nuevo `especialidad-config.ts` como fuente de verdad, sección de personalización
- [ ] `docs/arquitectura-modelos.md` actualizado con la capa de config por especialidad/servicio
- [ ] Sección "Notas de implementación" de este doc llenada con aprendizajes
- [ ] Las 2 migraciones (Fase 0 y Fase 5) aplicadas por humano y verificadas

---

## Notas de implementación

_(Llenar al cerrar el sprint con lo aprendido que afecte sprints futuros.)_
