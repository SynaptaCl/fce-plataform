# Sprint G1 — Módulo GES (M13)

> **Estado**: Planificado · **Fecha**: 2026-07-30
> **Riesgo**: Alto (legal + fiscalización Superintendencia de Salud)
> **Pre-requisito de lectura**: `CLAUDE.md`, `docs/plan-redisenio/04-criterios-tecnicos.md`
> **Ruta destino**: `docs/plan-redisenio/sprints/G1-ges.md`

---

## 1. Objetivo

Permitir que un profesional detecte, emita, firme y haga seguimiento de la **Constancia de Información al Paciente GES** desde el workspace de encuentro, sin salir de la FCE.

**Módulo nuevo**: `M13_ges` — activable por clínica vía `clinicas_fce_config.modulos_activos`.

---

## 2. ALCANCE — leer antes de escribir código

### Lo que este módulo SÍ hace

- Sugiere patologías GES candidatas a partir del diagnóstico registrado
- Permite al profesional buscar y seleccionar manualmente del catálogo GES
- Genera el **Formulario de Constancia de Información al Paciente GES**
- Captura firma del paciente (o registra motivo de imposibilidad de firma)
- Hace tracking del plazo de garantía y del estado de la constancia
- Conserva el documento digital (obligación legal: mínimo 15 años)

### Lo que este módulo NO hace — HARD STOP DE PRODUCTO

**NO notifica a FONASA, SIGGES, ni a ninguna Isapre.**

SIGGES es un sistema cerrado de FONASA sin API pública para EHR de terceros. El registro ante el asegurador es un proceso administrativo separado, del prestador acreditado en la red GES.

Consecuencia obligatoria para el desarrollo:

- Ningún texto de UI, botón, toast, tipo TS, nombre de tabla, campo, o valor de enum puede sugerir notificación al asegurador
- Prohibidos: `notificar_isapre`, `enviar_fonasa`, `notificaciones_ges`, "Notificación enviada", "Registrado en GES"
- El estado se llama `notificado_paciente`, nunca `notificado` a secas
- El PDF y el modal de firma llevan disclaimer literal (ver §7)

Si el UX da a entender que la notificación al asegurador ya ocurrió, es exposición legal real para la clínica y para Synapta. Esto pesa más que cualquier consideración de UX.

---

## 3. Riesgo bloqueante: CIE-10 (GES) vs ICD-11 (repo)

El catálogo oficial GES de MINSAL está codificado en **CIE-10**. Este repo guarda diagnósticos en **ICD-11 MMS** (`fce_notas_clinicas.icd_codigos`, `fce_periograma.diagnostico_icd`). El mapeo ICD-11 → CIE-10 **no es 1:1**.

Decisión de diseño derivada:

1. La tabla guarda ambos: `cie10_codigos` (seed desde MINSAL) e `icd11_codigos` (se puebla progresivamente, arranca vacío)
2. **La vía primaria es la búsqueda manual del profesional** en el catálogo GES por nombre de patología
3. La detección automática por código es **asistencia opcional**, nunca determinante, y su ausencia nunca se interpreta como "no es GES"
4. La UI jamás afirma "esta patología es GES" — dice "posible patología GES, verificar criterios de confirmación"

No inviertas esfuerzo en mejorar el matching automático en este sprint. La precisión viene del catálogo validado, no del algoritmo.

---

## 4. Estado del catálogo — `validado: false`

El seed de las 87 patologías se genera con `validado = false` en todas las filas.

- Fuente: decreto GES vigente (MINSAL) + Circular IF/Nº469 (Superintendencia de Salud, 20-05-2024)
- **NO inventes criterios de confirmación, plazos, ni códigos CIE-10.** Si un dato no está en la fuente, va `null` y `criterios_confirmacion = '[PENDIENTE]'` (regla 7 del CLAUDE.md)
- La UI muestra badge de advertencia cuando `validado = false`
- Mismo patrón que datasets OMS LMS y seed MNA/MUST/SGA: entra a deuda técnica con prioridad **Alta** hasta validación por profesional con conocimiento GES

---

## 5. Fases

### G1-F1 — DB (SQL generado, NO aplicado)

Claude Code genera los archivos en `supabase/migrations/`, los presenta, y **espera aprobación humana**. No ejecuta DDL. No usa `apply_migration`.

**Antes de escribir SQL**: verificar vía MCP Supabase o `docs/schema-real.md` cómo `fce_consentimientos` almacena la firma del paciente y cómo `fce_prescripciones` almacena `profesional_snapshot`. Replicar esos patrones exactos — no inventar columnas nuevas para lo mismo.

#### `20260730_01_patologias_ges.sql` — catálogo global

```sql
CREATE TABLE patologias_ges (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                  int UNIQUE NOT NULL,          -- 1..87, número oficial del problema de salud
  nombre                  text NOT NULL,
  decreto                 text NOT NULL,                -- decreto GES que la define
  cie10_codigos           text[] NOT NULL DEFAULT '{}',
  icd11_codigos           text[] NOT NULL DEFAULT '{}', -- se puebla progresivamente
  criterios_confirmacion  text NOT NULL DEFAULT '[PENDIENTE]',
  aplica_sospecha         boolean NOT NULL DEFAULT false, -- solo oncológicas notifican en sospecha
  plazo_garantia_dias     int,                          -- nullable: varía por prestación
  restriccion_etaria      text,                         -- ej. 'menores de 15 años'
  validado                boolean NOT NULL DEFAULT false,
  validado_por            text,
  validado_at             timestamptz,
  activo                  boolean NOT NULL DEFAULT true,
  version                 text NOT NULL DEFAULT '1.0',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patologias_ges_cie10  ON patologias_ges USING gin (cie10_codigos);
CREATE INDEX idx_patologias_ges_icd11  ON patologias_ges USING gin (icd11_codigos);

ALTER TABLE patologias_ges ENABLE ROW LEVEL SECURITY;
-- SELECT: authenticated (catálogo global, mismo patrón que instrumentos_valoracion)
-- ALL:    solo superadmin vía admin_users
```

`aplica_sospecha` refleja una regla real: las patologías GES **no oncológicas** se notifican al momento de la **confirmación**; el recuadro "sospecha" solo existe para las oncológicas (Circular IF/469). El formulario debe respetar esto.

#### `20260730_02_constancias_ges.sql`

```sql
CREATE TABLE constancias_ges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica          uuid NOT NULL REFERENCES clinicas(id),
  id_paciente         uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro        uuid REFERENCES fce_encuentros(id),
  id_patologia_ges    uuid NOT NULL REFERENCES patologias_ges(id),

  tipo                text NOT NULL CHECK (tipo IN ('sospecha','confirmacion')),
  fecha_evento        date NOT NULL,          -- fecha de sospecha o confirmación diagnóstica
  plazo_vence_at      timestamptz,            -- server-side: fecha_evento + plazo_garantia_dias

  patologia_snapshot  jsonb NOT NULL,         -- congela el catálogo al emitir (versionado)
  profesional_snapshot jsonb,                 -- mismo patrón que fce_prescripciones

  estado              text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','notificado_paciente','rechazado_paciente','anulada')),

  motivo_no_firma     text,                   -- fiscalización verifica imposibilidad caso a caso
  observaciones       text,

  firmado             boolean NOT NULL DEFAULT false,
  firma_paciente      text,                   -- seguir patrón exacto de fce_consentimientos
  firmado_por         uuid,                   -- profesionales.id que emite
  firmado_at          timestamptz,

  created_by          uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_constancias_ges_paciente ON constancias_ges(id_paciente, created_at DESC);
CREATE INDEX idx_constancias_ges_clinica  ON constancias_ges(id_clinica);
CREATE INDEX idx_constancias_ges_plazo    ON constancias_ges(plazo_vence_at)
  WHERE estado = 'pendiente';

ALTER TABLE constancias_ges ENABLE ROW LEVEL SECURITY;
-- tenant_isolation vía get_clinica_ids_for_user(auth.uid()) — patrón de 20260606_02
```

#### `20260730_03_trg_block_update_signed_constancia_ges.sql`

Trigger de inmutabilidad post-firma. Mismo patrón que `block_update_signed_nota_clinica`. Bloquea UPDATE de campos clínicos cuando `firmado = true`.

Excepción explícita: se permite pasar `estado` a `'anulada'` (y solo eso) sobre una constancia firmada. **Nunca DELETE** — retención legal mínima 15 años.

#### `20260730_04_seed_patologias_ges.sql`

87 filas, `validado = false`. Ver §4.

### G1-F2 — Tipos y server actions

```
src/types/ges.ts
  → PatologiaGES, ConstanciaGES, TipoConstanciaGES, EstadoConstanciaGES,
    PatologiaSnapshot, CandidatoGES

src/lib/ges/
  → catalogo.ts   → buscarPatologiaGES(query), getPatologiaGES(id)
  → deteccion.ts  → detectarCandidatosGES(icd11: string[], cie10?: string[])
                    función pura sobre el catálogo, retorna candidatos con
                    nivel de coincidencia — NUNCA booleano "es GES"
  → plazos.ts     → calcularVencimiento(fechaEvento, plazoDias)
                    estadoPlazo(constancia) → 'vigente'|'por_vencer'|'vencido'
                    'vencido' se CALCULA, no se persiste — no hay cron en este stack
  → pdf-renderer.ts → renderConstanciaGesPdf (hex hardcoded, escapeHtml)

src/app/actions/ges.ts
  → getConstanciasGES(patientId)
  → detectarGES(icdCodigos)              -- lectura de catálogo
  → crearConstanciaGES(params)           -- estado 'pendiente'
  → firmarConstanciaGES(id, firmaPaciente | motivoNoFirma)
  → anularConstanciaGES(id, motivo)
```

Reglas obligatorias en cada acción de escritura:

- `assertModuleEnabled(config, 'M13_ges')`
- `getProfesionalActivo()` — no `.eq('auth_id', userId).single()`
- `logAudit` en toda escritura: `constancia_ges_creada`, `constancia_ges_firmada`, `constancia_ges_anulada`
- `plazo_vence_at` y `patologia_snapshot` se resuelven **server-side**. Nunca confiar en el cliente
- Retorno `ActionResult<T>` desde `guards.ts`
- `log()` de `lib/logger.ts` en catch, nunca `console.error`. Solo UUIDs, cero PII
- `observaciones` y `motivo_no_firma` son campos planos → **no** pasar por `sanitizeRichText`

Zona horaria Santiago para todo cálculo de fecha (`America/Santiago`).

### G1-F3 — UI

```
src/components/ges/
  → GesAlertBanner.tsx       → banner en NotaClinicaForm cuando hay candidatos
  → GesLauncher.tsx          → abre modal; visible si M13 activo
  → PatologiaGesSearch.tsx   → buscador del catálogo (vía primaria, ver §3)
  → ConstanciaGesForm.tsx    → tipo, fecha_evento, observaciones, firma
  → ConstanciaGesCard.tsx    → resumen + estado de plazo
  → ConstanciaGesPdfView.tsx → formulario oficial, html2pdf dynamic import
```

Enganche: `GesLauncher` en `clinico/page.tsx` y `dental/page.tsx`, condicionado a M13 activo — mismo patrón que `PrescripcionLauncher`.

- Firma del paciente: reutilizar `SignatureBlock` (patrón consentimientos). No construir canvas nuevo
- `tipo = 'sospecha'` solo seleccionable si `patologia.aplica_sospecha = true`
- Badge visible cuando `patologia.validado = false`
- Tokens: `var(--color-kp-*)` con fallback. Nunca `var(--kp-*)`
- Server Components por defecto; `'use client'` solo en form y firma

### G1-F4 — Timeline, plazos y tests

- `TimelineEntryType: 'constancia_ges'` en `types/timeline.ts`
- `ConstanciaGesExpandedCard` en `components/modules/timeline/`
- Query del timeline en `actions/timeline.ts` (dentro del `Promise.all` existente, no query suelta)
- Indicador de plazo por vencer en `PatientHeader` vía slot `statusBadge`
- `scripts/test-sprint-g1.ts` + entrada en `package.json` (`test:sprint-g1`)

Cobertura mínima de tests:
- RLS: constancia de clínica A invisible desde clínica B
- Trigger: UPDATE de campo clínico sobre constancia firmada → error
- Trigger: UPDATE de `estado` a `'anulada'` sobre firmada → permitido
- `calcularVencimiento` con `plazo_garantia_dias = null` → `plazo_vence_at = null`, sin crash
- `detectarCandidatosGES([])` → array vacío, sin error
- `crearConstanciaGES` sin M13 activo → falla con error explícito

---

## 6. Formulario oficial — no improvisar

El PDF debe replicar el **Formulario de Constancia de Información al Paciente GES** vigente (Circular IF/Nº469, ajustes de mayo 2024), disponible en superdesalud.gob.cl.

Claude Code **no inventa la estructura del formulario**. Descarga el PDF oficial, extrae los campos exactos, y los replica. Si no puede acceder, deja el renderer con los campos que sí conoce y marca el archivo con `// PENDIENTE_VALIDACION: contrastar contra formulario oficial IF/469`.

Campos que la circular v4 exige y que este repo ya tiene:

- **Nombre social** — `pacientes.identidad_genero`. Es requisito del formulario, no opcional
- Datos del prestador, del profesional (`profesional_snapshot`), y de la patología

Fuera de alcance de G1 (documentar, no implementar):
- Excepción de urgencia: reemplazo del formulario por el DAU en 14 problemas de salud. No aplica a clínica ambulatoria
- Derecho al olvido oncológico (Ley 21.656 sobre Ley 21.258)

---

## 7. Disclaimer legal — texto literal, no modificar

En el modal de firma y en el pie del PDF:

> "Este documento deja constancia de que se informó al paciente sobre un problema de salud con Garantías Explícitas en Salud (GES), conforme a la obligación del prestador establecida en la Circular IF/Nº469 de la Superintendencia de Salud. Esta constancia no constituye registro ni notificación ante FONASA, SIGGES o Isapre. La gestión de las garantías ante el asegurador es un proceso administrativo independiente, de responsabilidad del prestador."

En el banner de detección automática:

> "Posible patología GES. Verifique los criterios de confirmación diagnóstica antes de emitir la constancia. La detección automática es orientativa y no reemplaza el juicio clínico."

Mismo tratamiento que los disclaimers de Resumen IA y Copiloto: literal, no editable, no resumible.

---

## 8. Criterios de aceptación

- [ ] `npm run build` — 0 errores, 0 warnings
- [ ] 4 archivos SQL en `supabase/migrations/`, **presentados y no aplicados**
- [ ] `M13_ges` en `registry.ts`; nada visible si el módulo está inactivo
- [ ] Ningún string en el repo sugiere notificación a FONASA/SIGGES/Isapre
- [ ] `grep -r "var(--kp-" src/` sin resultados nuevos
- [ ] Constancia firmada inmutable, verificado contra DB
- [ ] Disclaimers presentes en modal y PDF, texto literal
- [ ] `test:sprint-g1` en verde
- [ ] `CLAUDE.md` actualizado: M13 en §7, tablas en §8, sección de módulo, deuda técnica
- [ ] Deuda técnica registrada: seed GES `validado:false` — prioridad **Alta**

---

## 9. Commits

```
sql(sprint-g1)(ges): catálogo patologias_ges + constancias_ges + trigger
feat(sprint-g1)(ges): tipos, lib/ges y server actions
feat(sprint-g1)(ges): UI constancia + PDF formulario oficial
feat(sprint-g1)(ges): timeline + indicador de plazos
test(sprint-g1)(ges): suite de integración
docs(sprint-g1): CLAUDE.md módulo M13
```

Scope nuevo: `(ges)`.

---

## 10. Notas de implementación

_(llenar al cerrar el sprint — aprendizajes que afectan sprints futuros)_
