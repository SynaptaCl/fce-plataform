# N1 + N2 — Antropometría Nutricional

> **Estado**: Propuesta — pendiente de aprobación
> **Fecha**: 2026-06-12
> Pre-requisito de lectura: `00-vision-general.md`, `01-modelo-de-datos.md`, `04-criterios-tecnicos.md`
> Schema verificado en vivo contra Supabase `vigyhfpwyxihrjiygfsa` el 2026-06-12

---

## Objetivo

Dar a Nutrición una herramienta de antropometría de primera clase: cálculo automático y server-side de IMC, clasificación, composición corporal y evolución, cubriendo los tres escenarios reales de consulta (adulto, pediátrico, gestacional). La antropometría es el núcleo del seguimiento nutricional — la evolución de peso/IMC **es** el tratamiento.

Principio rector: **fricción mínima en consulta**. Peso + talla → IMC y clasificación en el acto, embebido en el workspace, sin abrir modales ni "aplicar instrumento".

---

## Decisión de arquitectura

**Tabla nueva `fce_antropometria`**, no extensión de `fce_signos_vitales`.

Razones:
- `fce_signos_vitales` no tiene peso/talla (verificado) — no hay duplicación que evitar.
- Antropometría tiene campos propios que crecen (perímetros, pliegues, composición) y un consumo específico (gráfico de tendencia). Tabla dedicada = query limpio para timeline y chart.
- Mantiene el principio del CLAUDE.md: lo específico de un modelo no contamina lo compartido.

**Una sola tabla con columnas nullable según modo.** El modo (adulto/pediátrico/gestacional) lo determina edad + flag de embarazo, no tablas distintas. Más simple para timeline y chart.

**Patrón RLS**: `id_clinica NOT NULL` + policy con `get_clinica_ids_for_user()` (patrón vigente de las migraciones 2026-06-06), NO el patrón viejo `admin_users WHERE auth_id` de los docs `01`. El helper cubre superadmin/owner.

---

## Hallazgos del schema que condicionan el diseño

1. **`pacientes.fecha_nacimiento` (date, nullable)** y **`pacientes.sexo_registral` (text, nullable)** existen — son los inputs de z-score pediátrico y Atalah. Al ser nullable, el panel debe **degradar con gracia**: si falta el dato, no rompe; ofrece modo adulto IMC simple y solicita el dato faltante.

2. **Las curvas OMS y Atalah son biológicas** → se calculan sobre `sexo_registral`, nunca `identidad_genero`. El cálculo lee `sexo_registral` explícitamente. Modos pediátrico/gestacional exigen `sexo_registral` poblado.

3. **`fce_anamnesis` no tiene campo de embarazo** (verificado) — se agrega en N2.

4. **`fce_signos_vitales.id_clinica` es nullable** (deuda CRÍTICA de auditoría) — `fce_antropometria` se crea correcta desde el inicio: `id_clinica NOT NULL`.

---

## Corte de los dos sprints

### Riesgo separado deliberadamente
N1 es aritmética determinista sobre fórmulas conocidas (IMC, pliegues adulto). N2 mete los datasets de referencia OMS/Atalah, que son el grueso del trabajo de validación clínica y donde está el riesgo legal/mala praxis. El riesgo va concentrado en N2.

---

## SPRINT N1 — Antropometría adulto + infraestructura

### Alcance
- Migración `fce_antropometria` (tabla nueva)
- Cálculo server-side: IMC + clasificación OMS adulto
- Composición corporal por pliegues con **fórmula seleccionable** (solo modo adulto)
- Datasets de fórmulas de pliegues (estáticos en repo)
- Panel embebido en workspace Nutrición + validación Zod
- Chart de evolución peso/IMC

### Schema `fce_antropometria`

```sql
CREATE TABLE fce_antropometria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid REFERENCES fce_encuentros(id),  -- nullable: control fuera de encuentro

  -- básico (siempre)
  peso_kg         numeric NOT NULL CHECK (peso_kg > 0 AND peso_kg < 400),
  talla_cm        numeric NOT NULL CHECK (talla_cm > 0 AND talla_cm < 260),
  imc             numeric,            -- calculado server-side
  clasificacion   text,              -- snapshot: 'Normopeso' / z-score / Atalah segun modo

  modo            text NOT NULL CHECK (modo IN ('adulto','pediatrico','gestacional')),

  -- circunferencias (opcional)
  circ_cintura_cm numeric CHECK (circ_cintura_cm IS NULL OR circ_cintura_cm > 0),
  circ_cadera_cm  numeric CHECK (circ_cadera_cm IS NULL OR circ_cadera_cm > 0),

  -- composición corporal (solo adulto)
  pliegues        jsonb,             -- {biceps, triceps, subescapular, ...} valores crudos
  formula_grasa   text,              -- snapshot de la ecuación usada
  perc_grasa      numeric,           -- calculado server-side
  masa_magra_kg   numeric,           -- calculado server-side

  -- pediátrico (N2)
  zscore_imc      numeric,
  zscore_peso     numeric,
  zscore_talla    numeric,
  percentil_imc   numeric,

  -- gestacional (N2)
  semana_gestacional int,
  imc_pregestacional numeric,
  rango_ganancia_min numeric,
  rango_ganancia_max numeric,

  observaciones   text,
  registrado_por  uuid NOT NULL,     -- profesionales.id
  registrado_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_antrop_paciente  ON fce_antropometria(id_paciente, registrado_at DESC);
CREATE INDEX idx_antrop_clinica   ON fce_antropometria(id_clinica);
CREATE INDEX idx_antrop_encuentro ON fce_antropometria(id_encuentro);

ALTER TABLE fce_antropometria ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_antropometria_all ON fce_antropometria
  FOR ALL TO authenticated
  USING (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())))
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid())));
```

**Decisión de inmutabilidad**: la antropometría **no es inmutable** — es un dato vivo, como signos vitales. No lleva trigger de firma. Si se corrige un peso mal tipeado, queda en `logs_auditoria`. (A diferencia de notas firmadas.)

### Fórmulas de pliegues — regla de implementación crítica

El profesional elige la ecuación **primero**; el form muestra **solo los pliegues que esa ecuación requiere**. Sin esto, alguien mide 4 pliegues, elige Jackson-Pollock 7, y el sistema calcula con campos vacíos = basura.

| Ecuación | Pliegues | Población |
|---|---|---|
| Durnin-Womersley | bíceps, tríceps, subescapular, suprailíaco | Adultos ambos sexos |
| Jackson-Pollock 3 | ♂ pecho/abdomen/muslo · ♀ tríceps/suprailíaco/muslo | Adultos |
| Jackson-Pollock 7 | 7 sitios | Adultos/atletas |
| Faulkner | tríceps, subescapular, suprailíaco, abdominal | Uso clínico general |

- Cada ecuación → densidad corporal → % grasa vía **Siri** (snapshot también de qué conversión se usó).
- `formula_grasa` guarda la ecuación. Resultado reproducible y auditable.
- **% grasa por pliegues SOLO en modo adulto.** Las ecuaciones no están validadas en niños/embarazadas — en esos modos el panel no ofrece la sección.
- Datasets de coeficientes en `lib/nutricion/pliegues.ts` (estático, sin React, testeable).

### Cálculo server-side (`lib/nutricion/antropometria.ts`)
- IMC = peso / (talla_m)²
- Clasificación OMS adulto: <18.5 bajo peso / 18.5–24.9 normo / 25–29.9 sobrepeso / 30–34.9 obesidad I / 35–39.9 II / ≥40 III
- Riesgo cardiometabólico por circunferencia de cintura (corte por sexo)
- Todo snapshoteado en `clasificacion` al guardar

### Validación Zod (cliente, primera capa)
Rangos fisiológicos: peso 0.5–400, talla 20–260, pliegues 1–100mm, circunferencias 20–250. Rechaza el imposible antes de salir del cliente. CHECK constraints en DB = última línea.

### Criterios de aceptación N1
- [ ] Migración `fce_antropometria` aplicada (con confirmación humana + backup)
- [ ] IMC + clasificación OMS adulto, cálculo server-side, snapshot
- [ ] Pliegues con fórmula seleccionable; form muestra solo campos requeridos
- [ ] % grasa solo habilitado en modo adulto
- [ ] Panel embebido en workspace Nutrición (sin modal)
- [ ] Chart de evolución peso/IMC
- [ ] `scripts/test-sprint-n1.ts` valida cálculos contra valores de referencia conocidos
- [ ] `npm run build` 0 errores / 0 warnings

---

## SPRINT N2 — Pediátrico + gestacional

### Alcance
- Datasets LMS OMS (peso/edad, talla/edad, IMC/edad; 0–19; por sexo) → z-score y percentiles
- Curva Atalah gestacional + clasificación ganancia de peso
- Campo embarazo/FUR en `fce_anamnesis` (DDL sobre tabla compartida)
- Panel cambia de modo según edad/embarazo
- Chart con curvas de referencia OMS/Atalah de fondo

### Datasets de referencia (estáticos en repo)

**OMS LMS** — `lib/nutricion/oms-lms/` JSON por indicador y sexo. z-score = ((valor/M)^L − 1) / (L·S). Cálculo server-side puro. Fuente: tablas OMS oficiales.

**Atalah gestacional** — `lib/nutricion/atalah.ts`. IMC pre-gestacional → categoría → rango de ganancia esperable por semana. Estándar MINSAL Chile.

> **Riesgo clínico/legal (heredado, regla CLAUDE.md)**: los datasets OMS/Atalah deben ser **fieles a la fuente oficial**. Implementación incorrecta = riesgo de mala praxis. **Validación humana de un nutricionista obligatoria antes de dar N2 por cerrado.** Claude genera el código; no se da por validado solo.

### DDL sobre `fce_anamnesis` (tabla compartida — HARD STOP)

```sql
ALTER TABLE fce_anamnesis
  ADD COLUMN embarazo_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN fur date,                          -- fecha última regla
  ADD COLUMN semana_gestacional_base int,       -- si se conoce por eco
  ADD COLUMN fecha_eval_gestacional date;       -- fecha base del cálculo
```

Diseñado para **no interferir con el flujo adulto**: todo nullable/default false. La UI de embarazo solo aparece si el profesional marca `embarazo_activo`. Embarazadas y prematuros son atenciones menos frecuentes — no deben agregar campos al flujo común.

### Lógica de selección de modo
1. `embarazo_activo = true` → modo **gestacional** (requiere FUR o semana base + `sexo_registral`)
2. edad < 19 (de `fecha_nacimiento`) → modo **pediátrico** (requiere `sexo_registral`)
3. resto → modo **adulto**
4. falta `sexo_registral` o `fecha_nacimiento` para modo no-adulto → degradar a adulto IMC simple + avisar dato faltante

### Criterios de aceptación N2
- [ ] DDL `fce_anamnesis` aplicado (confirmación humana + backup — tabla compartida)
- [ ] Datasets OMS LMS cargados y verificados contra fuente
- [ ] z-score + percentil pediátrico server-side
- [ ] Atalah gestacional: clasificación + rango de ganancia
- [ ] Panel cambia de modo automáticamente; degrada con gracia si falta dato
- [ ] Chart con curvas de referencia de fondo
- [ ] **Validación de un nutricionista registrada antes del cierre**
- [ ] `scripts/test-sprint-n2.ts` valida z-score/Atalah contra casos conocidos
- [ ] `npm run build` 0 errores / 0 warnings

---

## Screenings nutricionales (fuera de N1/N2 — track de catálogo)

MNA, MUST, NRS-2002 (escala_simple) + SGA (componente_custom) van al catálogo `instrumentos_valoracion` con `especialidades: ['Nutrición']`, vía el track de instrumentos existente — NO en estas migraciones. Mismo riesgo de validación clínica + licencia (SGA). Se seedean por separado cuando un nutricionista valide los items.

---

## Hard stops de estos sprints
- **Migración `fce_antropometria` (N1)**: DDL sobre DB compartida → confirmación explícita + backup antes de aplicar vía MCP.
- **DDL `fce_anamnesis` (N2)**: tabla compartida por los tres modelos y los tres repos (synapta, korporis-fce, fce-plataform) → confirmación explícita + backup. Mayor cuidado que N1.
- Ningún `apply_migration` se ejecuta sin tu "sí" explícito en el momento.
