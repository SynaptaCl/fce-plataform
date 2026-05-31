# Sprint N1 — Módulo M10: Plan de Intervención Neurodesarrollo

> **Para**: Claude Code · **Tipo**: implementación de código (DB ya migrada)
> **Pre-requisito de lectura**: `CLAUDE.md`, `docs/plan-redisenio/00-vision-general.md`, `docs/plan-redisenio/04-criterios-tecnicos.md`, `docs/plan-redisenio/contexto-neurodesarrollo.md`

---

## 0. Contexto y alcance

Implementar el módulo **M10 Plan de Intervención**, un módulo **compartido** (no un modelo clínico nuevo) que habilita a centros de rehabilitación neurodivergente (TEA, TDAH, trastornos del aprendizaje, TEL) a gestionar evaluaciones y planes de intervención longitudinales con objetivos por dominio y seguimiento de progreso.

**Principio rector clínico**: la atención parte de una **evaluación del profesional** y desde ella se desencadena el plan. El plan referencia el encuentro de origen (`id_encuentro_origen`). El plan es un **documento vivo** (evoluciona), no un documento inmutable como una nota firmada.

### LA DB YA ESTÁ MIGRADA — NO apliques migraciones

Todas las migraciones fueron aplicadas y verificadas en una sesión separada. **NO uses `apply_migration`. NO generes DDL.** Tu trabajo es exclusivamente código (types, server actions, componentes, integración). Si crees que falta una columna o tabla, documéntalo como hallazgo, no lo migres.

#### Lo que ya existe en DB (Supabase `vigyhfpwyxihrjiygfsa`)

**`instrumentos_valoracion`** — `tipo_renderer` ahora acepta un tercer valor: `'registro_externo'` (además de `escala_simple` y `componente_custom`).

**`fce_notas_clinicas`** — columna nueva `secciones_estructuradas jsonb DEFAULT NULL`. El trigger de inmutabilidad post-firma ya la protege.

**`plantillas_dominios`** (catálogo global, RLS: SELECT authenticated / ALL superadmin):
```
id, condicion_codigo (UNIQUE), condicion_label, descripcion,
dominios jsonb [{codigo, label, orden, descripcion}], activo, orden, created_at, updated_at
```
Seedeada con 4 condiciones: `tea`, `tdah`, `trastorno_aprendizaje`, `tel`.

**`fce_planes_intervencion`** (RLS: tenant_isolation por id_clinica):
```
id, id_clinica, id_paciente, id_encuentro_origen (→ fce_encuentros, nullable),
titulo, condicion_codigo (nullable), diagnostico, icd_codigos jsonb,
fecha_inicio date, fecha_revision date,
estado ('borrador'|'activo'|'en_revision'|'cerrado'),
firmado, firmado_at, firmado_por, snapshot_equipo jsonb,
created_by, created_at, updated_at
```

**`fce_plan_objetivos`** (RLS: tenant_isolation):
```
id, id_clinica, id_paciente, id_plan (→ fce_planes_intervencion, ON DELETE CASCADE),
dominio_codigo, dominio_label, descripcion, criterio_logro,
gas_menos_2, gas_menos_1, gas_0, gas_mas_1, gas_mas_2 (text, descripción de cada nivel GAS),
nivel_basal int (-2..2), nivel_actual int (-2..2),
prioridad ('alta'|'media'|'baja'), estado ('activo'|'logrado'|'reformulado'|'suspendido'),
responsable_principal (→ profesionales, nullable), orden,
created_by, created_at, updated_at
```

**`fce_plan_progreso`** (RLS: tenant_isolation):
```
id, id_clinica, id_paciente, id_objetivo (→ fce_plan_objetivos, ON DELETE CASCADE),
id_encuentro (→ fce_encuentros, nullable),
nivel_gas int (-2..2), observacion, estrategias,
registrado_por (→ profesionales), registrado_at, created_at
```

**Instrumentos `registro_externo` ya seedeados** (9): `ados2`, `adir`, `cars2`, `vineland3`, `wisc5`, `wppsi`, `conners3`, `brief2`, `sensory_profile`. Todos con `schema_items = {"validado": true, "subescalas": []}`.

---

## 1. Decisiones de arquitectura (LOCKED — no las reabras)

1. **M10 es módulo compartido**, no modelo clínico. Se accede desde cualquier workspace (clinico, rehab, dental) si está activo. NO crear `/neurodesarrollo/page.tsx`. NO tocar `modelos.ts` (no hay modelo nuevo).
2. **No crear entidad "proceso de evaluación"**. Cada sesión es un encuentro normal. El plan los conecta vía `id_encuentro_origen` + el progreso vía `id_encuentro`.
3. **El plan es documento vivo, NO inmutable post-firma**. La firma aprueba el plan en un momento (para informes); los cambios posteriores quedan en `logs_auditoria` (cumple Decreto 41: autenticidad de cambios, no congelamiento). **NO crear trigger de inmutabilidad para las tablas del plan.** Las notas de sesión SÍ siguen siendo inmutables (eso ya existe).
4. **GAS (Goal Attainment Scaling)** es el método de medición: niveles -2 a +2, 0 = resultado esperado. `nivel_actual` en `fce_plan_objetivos` se denormaliza desde el último `fce_plan_progreso` para lectura rápida.
5. **`registro_externo`** es un `tipo_renderer` nuevo, NO un componente del `CUSTOM_REGISTRY`. Se rutea en `InstrumentoLauncher` por `tipo_renderer`, igual que `escala_simple`. No pasa por `calcularPuntaje()`.
6. **Sin flag `puede_crear_plan`** en profesionales. Cualquier profesional con acceso FCE y rol que firma puede crear/editar planes. Usar `requireAccesoFCE` / `assertPuedeFirmar` existentes.
7. **Activación por clínica** vía patrón M7: `array_append(modulos_activos, 'M10_plan_intervencion')` + `config_modulos['M10_plan_intervencion']`. Guard `assertModuleEnabled(config, 'M10_plan_intervencion')` en cada server action.

---

## 2. Tareas de implementación

Sigue las fases en orden. Cada fase debe cerrar con `npm run build` en 0 errores y 0 warnings.

### Fase A — Tipos y registry

**A1.** `src/lib/modules/registry.ts`: agregar `"M10_plan_intervencion"` a la unión `ModuleId`. No tocar `ModeloClinico` ni `ESPECIALIDADES_REGISTRY`.

**A2.** `src/types/instrumento.ts`:
- Ampliar `tipo_renderer` para incluir `"registro_externo"`.
- El tipo de `respuestas` y `InstrumentoCustomProps.valor`/`onChange`: cambiar `Record<string, number>` a `Record<string, number | string>` para soportar campos cualitativos. Verificar que `calcularPuntaje` siga tipando correctamente (solo opera sobre valores numéricos; ignorar strings o tiparlos con guard).
- Nuevo tipo `RegistroExternoResultado` para el payload de `registro_externo`:
  ```typescript
  interface RegistroExternoResultado {
    modulo_version?: string;      // "Módulo 3", "Forma completa"
    puntaje_general?: string;     // texto libre (puede ser "8 (comparación)" etc.)
    subescalas?: { label: string; valor: string }[];
    clasificacion?: string;       // "Riesgo alto", "Dentro de rango", etc.
    observaciones?: string;
    adjunto_url?: string;         // opcional, PDF del informe externo
  }
  ```

**A3.** Nuevos archivos de tipos:
- `src/types/plan-intervencion.ts`: `PlanIntervencion`, `EstadoPlan`, `PlanObjetivo`, `PrioridadObjetivo`, `EstadoObjetivo`, `PlanProgreso`, niveles GAS.
- `src/types/plantilla-dominio.ts`: `PlantillaDominio`, `Dominio`.
- Re-exportar desde `src/types/index.ts`.

### Fase B — Instrumento registro_externo

**B1.** `src/components/clinico/RegistroResultadoExterno.tsx`: nuevo componente que implementa la interfaz de renderer (recibe `schema`, `valor`, `onChange`, `readOnly`). Renderiza un formulario genérico: módulo/versión, puntaje general, lista dinámica de subescalas (label + valor), clasificación, observaciones, adjunto opcional. Guarda el resultado como JSON en `respuestas` (que es jsonb, soporta esta estructura). Usar componentes `ui/` (Input, Textarea, Button). Tokens vía `var(--color-kp-*)`.

**B2.** `src/components/clinico/InstrumentoLauncher.tsx`: agregar branch de ruteo: si `tipo_renderer === 'registro_externo'` → renderizar `RegistroResultadoExterno`. (Hoy rutea entre `escala_simple` → `EscalaSimpleRenderer` y `componente_custom` → CUSTOM_REGISTRY.)

**B3.** `src/app/actions/clinico/instrumentos.ts`: en `aplicarInstrumento`, manejar el caso `registro_externo`: NO llamar `calcularPuntaje` ni `interpretarPuntaje`; guardar `respuestas` tal cual, `puntaje_total = null`, `interpretacion` = el campo `clasificacion` del payload. Mantener audit log. Verificar que `getCatalogoInstrumentos` ya devuelve estos instrumentos (sí, por filtro de especialidad).

### Fase C — Server actions del Plan de Intervención

**C1.** `src/app/actions/clinico/plantillas-dominios.ts`:
- `getPlantillasDominios()` — lista catálogo activo.
- `getPlantillaDominio(condicionCodigo)` — una plantilla.

**C2.** `src/app/actions/clinico/plan-intervencion.ts` — todas con `assertModuleEnabled(config, 'M10_plan_intervencion')` al inicio, `ActionResult<T>`, audit log en escrituras, filtro `id_clinica` vía `getIdClinica`:
- `getPlanesIntervencion(patientId)` — lista de planes del paciente.
- `getPlanIntervencionDetalle(planId)` — plan + objetivos + último progreso por objetivo.
- `crearPlanIntervencion({ patientId, idEncuentroOrigen?, condicionCodigo?, titulo })` — crea plan en `borrador`. Si `condicionCodigo`, opcionalmente pre-cargar objetivos vacíos por dominio de la plantilla (o dejar que el cliente lo haga). Retornar `{ planId }`.
- `actualizarPlanIntervencion(planId, campos)` — editar cabecera (titulo, diagnostico, icd_codigos, fecha_revision, estado).
- `upsertObjetivo(planId, objetivo)` — crear/editar objetivo con campos GAS, prioridad, dominio, responsable.
- `eliminarObjetivo(objetivoId)` — solo si plan no cerrado.
- `registrarProgreso({ objetivoId, idEncuentro?, nivelGas, observacion?, estrategias? })` — INSERT en `fce_plan_progreso` + UPDATE `fce_plan_objetivos.nivel_actual = nivelGas`. Audit log.
- `firmarPlanIntervencion(planId)` — `firmado=true`, `firmado_at`, `firmado_por`, snapshot del equipo (objetivos con responsables). NO bloquea edición posterior (documento vivo).

**Importante**: `fce_plan_objetivos` y `fce_plan_progreso` tienen `id_clinica` directo → filtrar por él, no por JOIN.

### Fase D — Componentes UI del Plan

Seguir el patrón `PrescripcionLauncher` / `OrdenExamenLauncher` (launcher en workspace → modal/panel). Todos en `src/components/shared/` (módulo compartido).

**D1.** `PlanIntervencionLauncher.tsx` — botón en el workspace que abre el panel del plan. Muestra si hay plan activo o permite crear uno.

**D2.** `PlanIntervencionPanel.tsx` — vista principal del plan: cabecera (titulo, diagnóstico, estado, fechas), lista de objetivos agrupados por dominio, botón firmar/exportar. Si nace de un encuentro de evaluación, mostrar el vínculo al origen.

**D3.** `ObjetivoEditor.tsx` — formulario de objetivo con: dominio (select desde plantilla o libre), descripción, criterio de logro, los 5 niveles GAS, nivel basal, prioridad, responsable. React Hook Form + zod.

**D4.** `ProgresoRegistro.tsx` — registrar avance de un objetivo en la sesión actual: selector de nivel GAS (-2..+2 con sus descripciones del objetivo), observación, estrategias.

**D5.** `ProgresoChart.tsx` — gráfico de evolución del nivel GAS por objetivo/dominio en el tiempo. Usar la librería de charts ya presente en el repo (verificar cuál: recharts/chart.js). Línea temporal por objetivo.

**D6.** `PlanIntervencionPdfView.tsx` — vista para exportar el plan como PDF (patrón `RecetaPdfView` / `EpicrisisPdfView`, con `html2pdf.js` dynamic import). Incluir cabecera de marca, objetivos por dominio, niveles GAS, progreso. Este es el insumo de los informes a familia/derivador.

### Fase E — Integración en workspace y nota de sesión

**E1.** `src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/clinico/page.tsx`: agregar `PlanIntervencionLauncher` a la barra de acciones del workspace (junto a `PrescripcionLauncher` y `OrdenExamenLauncher`), condicionado a `assertModuleEnabled / getModuleConfig` de M10. Cargar plan activo del paciente en el Promise.all del Server Component.

**E2.** `src/components/clinico/NotaClinicaForm.tsx`: si M10 está activo, mostrar secciones estructuradas opcionales (conductas observadas, participación cuidador, estrategias, asistencia) que se guardan en `fce_notas_clinicas.secciones_estructuradas`. Además, permitir registrar progreso de objetivos del plan activo desde la nota (llama `registrarProgreso` con `idEncuentro` actual). El progreso vive en `fce_plan_progreso`, las secciones cualitativas en la nota — no duplicar el nivel GAS en ambos lados.

**E3.** (Opcional, si M10 activo en rehab/dental) Replicar `PlanIntervencionLauncher` en `/rehab/page.tsx`. Evaluar si el centro neurodivergente usa esos modelos.

### Fase F — Timeline y resumen

**F1.** `src/app/actions/timeline.ts`: agregar `TimelineEntryType` `"plan_intervencion"`. Agregar query a `fce_planes_intervencion` en el Promise.all + mapeo a `TimelineEntry`. (El progreso individual no necesita entry propio; se ve dentro del plan. La nota de sesión ya aparece.)

**F2.** `src/components/modules/timeline/PlanIntervencionExpandedCard.tsx`: card de plan en el timeline (titulo, estado, nº objetivos, % logrados).

**F3.** `PatientSummary` (en `timeline.ts` o donde viva): agregar `plan_activo` (titulo + próxima revisión + nº objetivos activos) al resumen lateral del paciente, si M10 activo.

### Fase G — Activación y documentación

**G1.** Documentar en `docs/` cómo activar M10 para una clínica (UPDATE a `clinicas_fce_config`, ejemplo SQL para que un humano lo ejecute — NO lo ejecutes tú). Incluir estructura esperada de `config_modulos['M10_plan_intervencion']` (ej: `{ "habilitado": true, "plantillas_default": ["tea"], "periodo_revision_dias": 90 }`).

**G2.** Actualizar `CLAUDE.md`: sección de módulos (agregar M10), tablas DB (las 4 nuevas + columna nueva), `ModuleId`.

**G3.** Actualizar `docs/schema-real.md` con las tablas nuevas.

**G4.** `scripts/test-sprint-n1.ts`: test de integración del flujo completo: crear plan desde encuentro → agregar objetivo con GAS → registrar progreso → verificar `nivel_actual` actualizado → firmar plan → verificar que sigue editable (documento vivo) → verificar RLS (otra clínica no ve el plan).

---

## 3. Convenciones obligatorias (de `04-criterios-tecnicos.md` y `CLAUDE.md`)

- `npm run build` = **0 errores, 0 warnings** al cierre de cada fase.
- **TypeScript strict**, sin `any` implícitos.
- Tokens **`var(--color-kp-*)`** (con prefijo `--color-`), nunca `var(--kp-*)`, nunca hex hardcoded, nunca Tailwind genérico de color.
- **Filtrar por `id_clinica`** en toda query (`getIdClinica`). Las tablas del plan tienen `id_clinica` directo.
- **Audit log** (`logs_auditoria`) en toda escritura: crear/editar/firmar plan, upsert objetivo, registrar progreso, aplicar instrumento externo.
- **Server Components por defecto**; `'use client'` solo en formularios con estado / charts.
- **`getProfesionalActivo()`** para el profesional (auth_id no es UNIQUE).
- **Especialidades**: strings exactos del catálogo, nunca normalizar antes de escribir.
- **`ActionResult<T>`** como retorno de toda server action.
- **Diagnósticos**: usar el `DiagnosticoSearch` ICD-11 existente, no reinventar.
- **Copiloto IA**: el `CopilotoNotaButton/Panel` existente es reutilizable para redactar descripciones de objetivos si aplica.

---

## 4. Hard-stops (NO hacer sin confirmación humana)

- **NO aplicar migraciones / DDL** — la DB ya está migrada. No uses `apply_migration`.
- **NO inventar contenido clínico**: no crear ítems ni scoring de instrumentos (M-CHAT, SNAP-IV, CARS, etc.). Esos requieren contenido aportado y validado por un profesional clínico. Si se necesitan, déjalos como `[PENDIENTE — validación clínica]`.
- **NO crear modelo clínico nuevo** ni tocar `modelos.ts`.
- **NO hacer inmutable el plan** post-firma (es documento vivo).
- **NO afectar `synapta` ni `korporis-fce`**.
- **NO ejecutar el UPDATE de activación** de M10 en ninguna clínica — solo documentarlo.

---

## 5. Criterios de aceptación

- [ ] Build limpio (0/0).
- [ ] Un instrumento `registro_externo` (ej: ADOS-2) se puede aplicar desde el workspace clínico y queda en el timeline con su clasificación.
- [ ] Desde un encuentro de evaluación se puede crear un plan que referencia `id_encuentro_origen`.
- [ ] Se pueden agregar objetivos por dominio (desde plantilla o libres) con los 5 niveles GAS.
- [ ] Se puede registrar progreso de un objetivo en una sesión; `nivel_actual` se actualiza.
- [ ] El gráfico muestra la evolución GAS en el tiempo.
- [ ] El plan se puede firmar y **sigue siendo editable** después (documento vivo).
- [ ] El PDF del plan se genera correctamente con branding de la clínica.
- [ ] La nota de sesión muestra secciones estructuradas cuando M10 está activo y las oculta cuando no.
- [ ] RLS verificado: una clínica no ve planes de otra.
- [ ] `CLAUDE.md`, `docs/schema-real.md` y `docs/sprints.md` actualizados.
- [ ] `test-sprint-n1.ts` pasa.

---

## 6. Orden sugerido de ejecución

Fase A → B (instrumento externo, valor demostrable rápido) → C → D → E → F → G.
Cerrar cada fase con build limpio antes de avanzar. No mezclar fases en un mismo commit.

Convención de commits: `feat(sprint-n1)(clinico): ...`, `feat(sprint-n1)(shared): ...`, `feat(sprint-n1)(registry): ...`.
