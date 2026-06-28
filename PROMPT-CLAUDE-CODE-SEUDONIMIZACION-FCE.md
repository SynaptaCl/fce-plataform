# Auditoría de seudonimización en envíos de datos a Claude (FCE IA)

## Contexto

Synapta es un SaaS de salud (Chile) que procesa datos clínicos de pacientes bajo la Ley 21.719 (protección de datos, vigencia plena 1 dic 2026). Usamos Claude/Anthropic como único proveedor de IA, con Zero Data Retention (ZDR) confirmado.

Hay dos frentes de IA en el ecosistema. **Este prompt solo aplica al frente FCE** (el chatbot de agendamiento NO está en scope).

**Puntos de envío a Claude conocidos (NO exhaustivo — debes encontrar todos vía grep):**

| Función FCE | Modelo | Tabla de output |
|---|---|---|
| Resumen IA del paciente | Claude **Haiku** (`claude-haiku-4-5-20251001`) | `fce_resumenes_ia` |
| Copiloto de escritura (notas clínicas) | Claude **Sonnet** (`claude-sonnet-4-6`) | No persiste (inline) |
| Copiloto IA de informes clínicos (M12) | (verificar modelo en código) | `fce_informes` |

> Esta tabla es referencial. El Paso 1 debe descubrir **todos** los call sites del SDK de Anthropic, no solo estos tres. Si hay más, repórtalos.

## Tu tarea (en este orden estricto)

### Paso 1 — SOLO LEER, NO MODIFICAR

Encuentra **todas** las Server Actions, API routes, funciones o módulos que arman el prompt/contexto que se envía a la API de Anthropic desde la FCE. Busca:

- Llamadas a `api.anthropic.com` o SDK de Anthropic (`@anthropic-ai/sdk`). Haz grep de los imports y de `messages.create`.
- Funciones que construyen el `messages` array o el `system` prompt (resumen de paciente, copiloto de notas, copiloto de informes, y cualquier otro que aparezca).
- Los queries SQL/Supabase que alimentan esos prompts (qué tablas y columnas se consultan). Presta atención a las funciones de extracción en `src/lib/ia/extraccion/` (especialmente `demografico.ts`).

### Paso 2 — REPORTAR antes de tocar nada

Para cada punto de envío a Claude que encuentres, reporta en formato tabla:

```
| Archivo | Función | Qué datos del paciente entran al prompt | ¿Entra nombre/RUT/teléfono/email? | ¿Entra texto libre donde el profesional pudo escribir el nombre? |
```

Incluye el fragmento de código relevante (el query y la construcción del prompt).

### Paso 3 — DIAGNÓSTICO

Con la evidencia del paso 2, determina:

**A) Si ya está limpio:** el prompt solo recibe datos clínicos (diagnósticos, notas, signos vitales, evaluaciones) y NO recibe campos identificatorios (`nombre`, `apellido_paterno`, `apellido_materno`, `rut`, `telefono`, `email` de la tabla `pacientes`). En ese caso, reporta que no se requiere intervención y explica por qué.

**B) Si hay filtración de identidad:** lista exactamente qué campos identificatorios entran al prompt y en qué archivo/línea. Luego propón el fix mínimo:
- Excluir esos campos del query que alimenta el prompt.
- Reemplazar por datos no identificatorios útiles (edad calculada desde `fecha_nacimiento`, `sexo_registral`, `prevision`).
- Para texto libre (`fce_notas_clinicas.contenido`, `fce_notas_soap.subjetivo`, etc.): estos campos guardan **HTML sanitizado** (sprint RTE) y el flujo de IA ya aplica `stripHtml()` antes de enviar al modelo. Si propones regex de sanitización de RUT chileno (`\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]`), debe correr **sobre el texto plano resultante de `stripHtml()`**, NUNCA sobre el HTML crudo (matchearía tags/entidades y rompería contenido). Evalúa viabilidad sin romper el contenido clínico.

## Reglas

- **NO modifiques código en el Paso 1 y 2.** Solo lee y reporta.
- **NO agregues encriptación de campos en la base de datos.** El schema ya separa identidad (tabla `pacientes`) de datos clínicos (tablas `fce_*`) por FK UUID. La intervención, si es necesaria, es en la capa de aplicación que arma el prompt.
- **NO toques el flujo del chatbot de agendamiento.** Solo FCE.
- Si el código ya seudonimiza correctamente, dilo y cierra. No inventes trabajo.

## Referencia de schema (tablas clave)

**`pacientes`** — campos identificatorios a excluir del prompt:
`nombre`, `apellido_paterno`, `apellido_materno`, `rut`, `telefono`, `email`, `direccion`, `contacto_emergencia`

**`pacientes`** — campos clínicos OK para el prompt:
`fecha_nacimiento` (para calcular edad), `sexo_registral`, `identidad_genero`, `nacionalidad`, `ocupacion`, `prevision`, `estado_clinico`

**Tablas FCE** (contenido clínico, OK para el prompt):
`fce_anamnesis`, `fce_notas_soap`, `fce_notas_clinicas`, `fce_evaluaciones`, `fce_signos_vitales`, `fce_encuentros`, `fce_prescripciones`, `fce_ordenes_examen`, `fce_antropometria`, `fce_plan_tratamiento`, `fce_planes_intervencion`, `fce_plan_objetivos`, `fce_egresos`, `instrumentos_aplicados`, `fce_resumenes_ia`

**Tabla de output IA:**
`fce_resumenes_ia.reporte` (JSONB) — si el prompt envía nombre y Claude lo incluye en la respuesta, el nombre queda persistido aquí. La seudonimización del input también limpia el output.
