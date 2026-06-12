# Schema real — Synapta Product

Documento de referencia del schema actual en el proyecto Supabase `Synapta Product` (ref `vigyhfpwyxihrjiygfsa`, región `sa-east-1`).

Actualizado: 2026-04-17 · basado en introspección via Supabase MCP.

---

## Tablas relevantes para FCE

### `clinicas` (2 filas)

Tabla raíz del multi-tenant. Cada clínica = 1 fila.

Columnas clave:
- `id` uuid PK (generado)
- `owner_id` uuid
- `nombre` text
- `slug` text unique
- `plan` text check (`esencial | profesional | clinica`)
- `status` text check (`demo | active | inactive | churned`)
- `activa` boolean
- `config` jsonb — **payload grande con namespaces por feature**
- `stripe_account_id` text (Stripe Connect)
- `stripe_onboarding_complete` boolean
- `stripe_charges_enabled` boolean

**Namespaces actuales en `config` jsonb:**
```
config.chatbot         Prompts, restricciones, flujos de agendamiento del bot
config.ui_chat         Estética del widget (avatar, bubbles, background)
config.branding        PALETA DE COLORES + logo + initials — leída por el FCE
config.convenios       Fonasa, Isapres, etc.
config.servicios       Catálogo comercial de servicios
config.servicios_detalle  Detalle largo por servicio
config.sucursales      Direcciones, horarios
config.booking_flow    Categorías, payment_gateway, intent_keywords
config.booking_form    Campos del formulario de reserva
config.notificaciones  Emails al profesional/clínica
config.welcome_screen  Pantalla inicial del bot
config.especialidad    String libre descriptiva (NO usar para queries FCE)
config.normas_atencion Korporis: abono, cancelación, max_atraso
config.reglas_precio   Korporis: precios por especialidad/modalidad
config.manejo_dolor    Korporis: instrucciones al bot
config.tipo_clinica    "dental" | "multidisciplinaria_rehabilitacion" | ...
```

**`config.branding` estructura:**
```json
{
  "navy": "#006B6B",
  "navy_deep": "#004545",
  "primary": "#00B0A8",
  "primary_hover": "#009990",
  "light_bg": "#E6FAF9",
  "accent": "#F5A623",
  "logo_url": "https://...",
  "logo_dark_url": null,
  "favicon_url": null,
  "clinic_initials": "KP",
  "clinic_short_name": "Korporis"
}
```

El FCE consume este objeto via `mapBrandingToTokens()` en `src/lib/modules/registry.ts`.

---

### `clinicas_fce_config` (2 filas — NUEVA en sprint 1)

Config específica del FCE, aislada del jsonb general.

```
id_clinica              uuid PK, FK → clinicas(id) ON DELETE CASCADE
modulos_activos         text[] (ModuleId desde registry)
especialidades_activas  text[] (codigo desde especialidades_catalogo)
config_modulos          jsonb (overrides granulares por módulo)
created_at, updated_at, updated_by
```

**RLS:**
- SELECT: admin_users con `activo = true` de la misma clínica
- UPDATE: admin_users con rol `admin | director | superadmin`
- INSERT: solo service_role
- DELETE: nunca desde cliente (CASCADE desde clinicas via FK)

**Trigger:** `validate_especialidades_fce_config` — bloquea update si alguna especialidad no está en catálogo.

---

### `especialidades_catalogo` (10 filas — NUEVA en sprint 1)

Catálogo universal de especialidades permitidas.

```
codigo      text PK (ej: "Kinesiología")
label       text
activa      boolean default true
orden       integer
created_at
```

**Poblada con:** Kinesiología, Fonoaudiología, Masoterapia, Administración Clínica, Odontología, Medicina General, Psicología, Nutrición, Terapia Ocupacional, Podología.

**RLS:** SELECT a todos los autenticados; mutaciones solo service_role.

---

### `profesionales` (4 filas)

```
id, id_clinica (FK), nombre, especialidad, rut, email, telefono,
duracion_consulta, color_agenda, activo,
auth_id (FK → auth.users),   ← SIN UNIQUE constraint desde 2026-04-19
es_agendable, recibe_notificaciones,
numero_registro text,         ← NUEVO en R9 (SIS para médicos, Colegio para otros)
tipo_registro text,           ← NUEVO en R9 ('SIS' | 'Colegio Odontológico' | etc.)
puede_prescribir boolean      ← NUEVO en R9 (default false — activar manualmente)
```

Korporis tiene 3 profesionales (uno por especialidad), Nuvident 1 (Dra. Nuri Peralta, Odontología).

**Importante:** `especialidad` en esta tabla NO tiene check constraint. Puede contener "Odontología general y estética" (Nuvident) aunque el registry FCE lo tipifica como solo "Odontología". Al cruzar con FCE, tomar el codigo del registry, no este campo libre.

---

### `pacientes` (2 filas)

```
id, id_clinica (FK), nombre, apellido_paterno, apellido_materno,
rut, telefono, email, fecha_nacimiento, sexo_registral, identidad_genero,
nacionalidad, direccion (jsonb), ocupacion,
prevision (jsonb), contacto_emergencia (jsonb),
canal_origen, canal_preferido, acepta_recordatorios,
consentimiento_datos, consentimiento_fecha, consentimiento_ip,
notas, activo, created_at, updated_at
```

Campos FCE-specific dentro de JSONB:
- `direccion`: `{region, comuna, calle, numero}`
- `prevision`: `{tipo: FONASA|Isapre|Particular, tramo?, isapre?}`
- `contacto_emergencia`: `{nombre, parentesco, telefono}`

---

### `admin_users` (5 filas)

```
id, auth_id (FK → auth.users), id_clinica (FK),
rol check (superadmin | director | admin | profesional | recepcionista),
nombre, email, activo, created_at
```

Poblada actualmente:
- Korporis: 1 superadmin (Synapta Admin), 2 directores, 1 admin
- Nuvident: 1 admin (inactivo)

---

### Tablas FCE

**`fce_anamnesis` (0 filas)**
```
id, id_clinica (FK), id_paciente (FK),
motivo_consulta, antecedentes_medicos (jsonb), antecedentes_quirurgicos (jsonb),
farmacologia (jsonb), alergias (jsonb), red_flags (jsonb), habitos (jsonb),
created_by (FK profesionales), created_at, updated_at
```

**`fce_encuentros` (0 filas)**
```
id, id_clinica (FK), id_paciente (FK), id_profesional (FK), id_cita (FK nullable),
especialidad text (validado por trigger contra especialidades_catalogo),
modalidad check (presencial | domicilio | virtual),
status check (planificado | en_progreso | finalizado | cancelado),
started_at, ended_at, created_at
```

**`fce_signos_vitales` (0 filas)**
```
id, id_paciente (FK), id_encuentro (FK),
presion_arterial text, frecuencia_cardiaca int, spo2 int,
temperatura numeric, frecuencia_respiratoria int,
recorded_by (FK profesionales), recorded_at,
id_clinica (FK nullable — REQUERIDO en nuevos inserts)
```

**`fce_evaluaciones` (0 filas)** — SIN id_clinica, filtrar vía JOIN
```
id, id_encuentro (FK nullable), id_paciente (FK),
especialidad text (validado por trigger),
sub_area text,
data jsonb — campos flexibles por especialidad
contraindicaciones_certificadas jsonb — hard-stop certificado para maso/podo/odonto
created_by (FK), created_at
```

**`fce_notas_soap` (0 filas)** — SIN id_clinica
```
id, id_encuentro (FK), id_paciente (FK),
subjetivo text, objetivo text,
analisis_cif jsonb default {contexto, funciones, actividades, participacion},
plan text, intervenciones jsonb, tareas_domiciliarias text,
proxima_sesion date,
firmado boolean default false, firmado_at, firmado_por (FK profesionales),
created_at
```

**Inmutabilidad post-firma:** el código debe rechazar UPDATE si `firmado = true`. Idealmente un trigger también.

**`fce_consentimientos` (0 filas)**
```
id, id_clinica (FK), id_paciente (FK),
tipo check (general | menores | teleconsulta),
version int, contenido text,
firma_paciente jsonb, firma_profesional jsonb,
firmado boolean, firmado_at,
created_by (FK), created_at
```

**`medicamentos_catalogo` (0 filas — NUEVA en R9, seed pendiente)**
```
id, principio_activo (NOT NULL), nombre_comercial, presentacion (NOT NULL),
forma_farmaceutica (NOT NULL), concentracion,
via_administracion (NOT NULL), dosis_adulto_sugerida, dosis_pediatrica_sugerida,
indicaciones_comunes text[], contraindicaciones_clave text[],
grupo_terapeutico, codigo_atc, es_controlado bool, requiere_receta bool,
especialidades_comunes text[],
origen ('seed'|'clinica'|'admin'), id_clinica (FK nullable),
activo, notas, created_at, updated_at
```
RLS: SELECT para autenticados (global + su clínica). Manage global: solo superadmin. Manage de clínica: admin+.
Índices: idx_medic_principio_activo, idx_medic_nombre_comercial, idx_medic_search (GIN full-text español).

**`fce_prescripciones` (0 filas — NUEVA en R9)**
```
id, id_clinica (FK NOT NULL), id_paciente (FK NOT NULL), id_encuentro (FK nullable),
folio_numero int, folio_anio int,
folio_display text GENERATED ('RX-YYYY-00001'),
tipo check ('farmacologica'|'indicacion_general'),
medicamentos jsonb, indicaciones_generales text, diagnostico_asociado text,
modo_firma check ('impresa'|'canvas'), firma_canvas text,
firmado bool default false, firmado_at, firmado_por (FK profesionales),
prof_nombre_snapshot, prof_rut_snapshot, prof_registro_snapshot,
prof_tipo_registro_snapshot, prof_especialidad_snapshot,
created_by (FK), created_at, updated_at
CONSTRAINT uq_folio_clinica_anio UNIQUE (id_clinica, folio_anio, folio_numero)
```
Trigger `trg_assign_folio_presc`: asigna folio correlativo por clínica+año con advisory lock.
Trigger `trg_block_update_signed_presc`: bloquea update de campos clínicos post-firma.
RLS: tenant isolation por id_clinica.

**`logs_auditoria` (4 filas)**
```
id, id_clinica (FK nullable), actor_id uuid nullable,
actor_tipo check (admin | profesional | bot | sistema | paciente),
accion text, tabla_afectada text, registro_id uuid nullable,
datos_antes jsonb, datos_despues jsonb,
ip_address, user_agent, canal,
id_paciente (FK nullable — agregado después),
created_at
```

Indices útiles ya creados:
- `idx_auditoria_id_paciente`

---

## Tablas de otros repos (READ-only desde fce-plataform)

### `citas`, `disponibilidad`, `plantillas_horario`, `recordatorio_logs`
Scope: `synapta-agenda` (repo futuro) o actualmente parte de `synapta-web`.
Relación con FCE: `fce_encuentros.id_cita` → `citas.id` (FK existente). Leer para contexto, no escribir.

### `pagos`
Scope: synapta-web / synapta-agenda. Tiene integración Stripe + MercadoPago + Webpay + Flow.
No tocar desde FCE.

### `conversaciones`, `sesiones_chat`
Scope: widget de chatbot en synapta-web.
No tocar.

### `tickets`, `ticket_mensajes`
Scope: synapta-admin (sistema de soporte Synapta ↔ clínicas).
No tocar.

---

## Enums de PostgreSQL relevantes

```
canal_contacto:   web_widget | whatsapp | instagram_dm | telefono | otro
rol_mensaje:      user | assistant | system
estado_cita:      pendiente_pago | agendada | recordatorio_enviado | confirmada | completada | anulada | no_asiste
estado_pago:      pendiente | aprobado | rechazado | reembolsado
```

---

## auth schema

5 usuarios en `auth.users`, espejados 1-a-1 en `admin_users` por `auth_id`. MFA disponible (tabla `mfa_factors`, `mfa_amr_claims`) pero no masivo.

---

## Storage

1 bucket, 1 objeto (logo de Korporis: `logo_korporis.svg`).

URL pública: `https://vigyhfpwyxihrjiygfsa.supabase.co/storage/v1/object/public/clinic-assets/logo_korporis.svg`

---

## Edge Functions

Ninguna desplegada actualmente.

---

## Tablas Sprint N1 — M10 Plan de Intervención

### `plantillas_dominios` (catálogo global)
- RLS: SELECT authenticated / ALL superadmin
- Columnas: `id`, `condicion_codigo` (UNIQUE), `condicion_label`, `descripcion`, `dominios jsonb`, `activo`, `orden`, `created_at`, `updated_at`
- Seedeada con: tea, tdah, trastorno_aprendizaje, tel

### `fce_planes_intervencion` (RLS: tenant_isolation por id_clinica)
- Columnas: `id`, `id_clinica`, `id_paciente`, `id_encuentro_origen` (nullable), `titulo`, `condicion_codigo`, `diagnostico`, `icd_codigos jsonb`, `fecha_inicio date`, `fecha_revision date`, `estado` (borrador|activo|en_revision|cerrado), `firmado bool`, `firmado_at`, `firmado_por`, `snapshot_equipo jsonb`, `created_by`, `created_at`, `updated_at`
- **Documento vivo** — no hay trigger de inmutabilidad post-firma

### `fce_plan_objetivos` (RLS: tenant_isolation)
- Columnas: `id`, `id_clinica`, `id_paciente`, `id_plan` (→ fce_planes_intervencion, ON DELETE CASCADE), `dominio_codigo`, `dominio_label`, `descripcion`, `criterio_logro`, `gas_menos_2..gas_mas_2 text`, `nivel_basal int`, `nivel_actual int` (-2..2), `prioridad` (alta|media|baja), `estado` (activo|logrado|reformulado|suspendido), `responsable_principal`, `orden`, `created_by`, `created_at`, `updated_at`
- `nivel_actual` se denormaliza desde `fce_plan_progreso` al registrar progreso

### `fce_plan_progreso` (RLS: tenant_isolation)
- Columnas: `id`, `id_clinica`, `id_paciente`, `id_objetivo` (→ fce_plan_objetivos, ON DELETE CASCADE), `id_encuentro` (nullable), `nivel_gas int` (-2..2), `observacion`, `estrategias`, `registrado_por` (→ profesionales), `registrado_at`, `created_at`

### Cambios a tablas existentes (Sprint N1)
- `fce_notas_clinicas`: columna `secciones_estructuradas jsonb DEFAULT NULL` (conductas_observadas, participacion_cuidador, estrategias, asistencia)
- `instrumentos_valoracion`: `tipo_renderer` ahora acepta `'registro_externo'` (además de escala_simple y componente_custom)

---

## Tablas Sprint Nutri-N1 + Nutri-N2 — Antropometría Nutricional

Migraciones aplicadas en producción el 2026-06-12:
- `20260612_01_fce_antropometria`
- `20260612_02_fce_anamnesis_embarazo`

### `fce_antropometria` (NUEVA — Nutri-N1/N2)

Tabla dedicada para registros antropométricos nutricionales. Modelo `clinico_general`, especialidad Nutrición. **Dato vivo, NO inmutable** — sin trigger de bloqueo post-firma.

RLS: `id_clinica NOT NULL` + policy `get_clinica_ids_for_user()` (patrón post-2026-06-06).

```
id                uuid PK DEFAULT gen_random_uuid()
id_clinica        uuid NOT NULL FK → clinicas(id)
id_paciente       uuid NOT NULL FK → pacientes(id)
id_encuentro      uuid nullable FK → fce_encuentros(id)
modo              text NOT NULL DEFAULT 'adulto'  -- 'adulto' | 'pediatrico' | 'gestacional'
peso_kg           numeric NOT NULL
talla_cm          numeric NOT NULL
imc               numeric nullable  -- calculado server-side
clasificacion     text nullable     -- clasificación OMS adulto / z-score / Atalah
zscore_imc        numeric nullable  -- pediátrico: z-score IMC/edad OMS
zscore_peso       numeric nullable  -- pediátrico: z-score peso/edad OMS (si disponible)
zscore_talla      numeric nullable  -- pediátrico: z-score talla/edad OMS (si disponible)
percentil_imc     numeric nullable  -- pediátrico: percentil calculado desde z-score
circ_cintura_cm   numeric nullable
circ_cadera_cm    numeric nullable
riesgo_cintura    text nullable     -- 'normal' | 'leve' | 'alto'
pliegues          jsonb nullable    -- { biceps, triceps, subescapular, suprailiaco, ... } en mm
formula_grasa     text nullable     -- 'durnin_womersley' | 'jackson_pollock_3' | 'jackson_pollock_7' | 'faulkner'
perc_grasa        numeric nullable  -- % grasa corporal (SOLO modo adulto)
masa_magra_kg     numeric nullable
semana_gestacional int nullable     -- gestacional: calculado desde fur o ingresado manualmente
imc_pregestacional numeric nullable -- gestacional: IMC antes del embarazo (semana < 12)
rango_ganancia_min numeric nullable -- gestacional: rango ganancia total recomendado (Atalah)
rango_ganancia_max numeric nullable
observaciones     text nullable
registrado_por    uuid NOT NULL FK → profesionales(id)
registrado_at     timestamptz NOT NULL DEFAULT now()
created_at        timestamptz NOT NULL DEFAULT now()
```

Índices: `(id_clinica, id_paciente, registrado_at DESC)` para timeline y chart.

### Cambios a `fce_anamnesis` (Nutri-N2)

4 columnas nuevas para contexto gestacional:

```
embarazo_activo        boolean NOT NULL DEFAULT false
fur                    date nullable  -- fecha última regla
semana_gestacional_base int nullable  -- semana gestacional capturada en evaluación
fecha_eval_gestacional  date nullable -- fecha en que se calculó la semana gestacional
```

`semana_gestacional_base` + `fecha_eval_gestacional` permiten recalcular la semana actual sin re-preguntar el FUR en cada visita.
