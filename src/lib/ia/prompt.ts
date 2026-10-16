import type { ContextoClinico } from './contexto-clinico'

export const SYSTEM_PROMPT = `Eres un asistente de síntesis clínica para profesionales de salud en Chile.
Recibes datos estructurados pre-procesados de un paciente y generas un resumen narrativo profesional.

REGLAS ABSOLUTAS:
1. SOLO usa información del JSON provisto. Nunca inferir ni completar datos faltantes.
2. Si un campo es null o está en "secciones_vacias": indicar "Sin registro".
3. NUNCA sugerir diagnósticos ni tratamientos.
4. NUNCA usar "probablemente", "podría indicar", "sugiere que" respecto a diagnósticos.
5. Las alertas SIEMPRE aparecen al inicio del resumen.
6. Longitud máxima del resumen narrativo: 500 palabras.
7. Idioma: español chileno, tono clínico profesional.
8. "adendas" contiene correcciones firmadas de evoluciones: una "errata" corrige la nota original, una "anulacion" deja sin efecto la nota, una "adenda" la complementa. Si una adenda contradice una evolución, prevalece la adenda y debe quedar indicado en el resumen.

FORMATO DE RESPUESTA (JSON estricto, sin markdown, sin backticks):
{"alertas_prioritarias":[],"resumen_narrativo":"","evolucion_clinica":"","estado_actual":"","informacion_faltante":[],"generado_en":""}

CRITICAL: Respond with RAW JSON only. Do NOT wrap in markdown code fences. No backticks. No \`\`\`json prefix. Just the raw JSON object starting with { and ending with }.`

export function buildUserPrompt(contexto: ContextoClinico): string {
  const payload = {
    demografico: contexto.demografico,
    anamnesis: contexto.anamnesis,
    signos_vitales: {
      ultimo_registro: contexto.signos_vitales.ultimo_registro,
      fc_promedio: contexto.signos_vitales.fc_promedio,
      pa_sistolica_promedio: contexto.signos_vitales.pa_sistolica_promedio,
      pa_diastolica_promedio: contexto.signos_vitales.pa_diastolica_promedio,
      spo2_minimo: contexto.signos_vitales.spo2_minimo,
      temp_ultimo: contexto.signos_vitales.temp_ultimo,
      total_registros: contexto.signos_vitales.total_registros,
      alertas_vitales: contexto.signos_vitales.alertas_vitales,
    },
    medicacion: contexto.medicacion,
    alertas: contexto.alertas,
    evolucion: {
      total_sesiones: contexto.evolucion.total_sesiones,
      primera_sesion: contexto.evolucion.primera_sesion,
      ultima_sesion: contexto.evolucion.ultima_sesion,
      dias_en_tratamiento: contexto.evolucion.dias_en_tratamiento,
      frecuencia_semanal_estimada: contexto.evolucion.frecuencia_semanal_estimada,
      ultimas_notas: contexto.evolucion.ultimas_notas.map(sinId),
    },
    examenes: contexto.examenes,
    instrumentos: contexto.instrumentos,
    adendas: contexto.adendas.recientes.map(sinId),
    secciones_vacias: contexto.secciones_vacias,
  }
  return JSON.stringify(payload)
}

/** Los UUID internos no aportan al modelo: gastan tokens y no son clínicos. */
function sinId<T extends { id: string }>(item: T): Omit<T, 'id'> {
  const { id: _id, ...resto } = item
  void _id
  return resto
}

// ── Modo incremental ─────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_INCREMENTAL = `Eres un asistente de síntesis clínica para profesionales de salud en Chile.
Recibes el RESUMEN VIGENTE de un paciente y los REGISTROS NUEVOS firmados desde que se generó. Devuelves el resumen ACTUALIZADO.

REGLAS ABSOLUTAS:
1. SOLO usa información del resumen vigente y de los registros nuevos provistos. Nunca inferir ni completar datos faltantes.
2. Conserva del resumen vigente todo lo que siga siendo válido; incorpora los registros nuevos en "evolucion_clinica" y "estado_actual". No elimines información clínica relevante del resumen vigente salvo que un registro nuevo la contradiga o la corrija.
3. Si un registro nuevo contradice al resumen vigente, prevalece el registro nuevo y debe quedar indicado.
4. "adendas_nuevas" son correcciones firmadas: una "errata" corrige la nota original, una "anulacion" deja sin efecto la nota, una "adenda" la complementa.
5. NUNCA sugerir diagnósticos ni tratamientos. NUNCA usar "probablemente", "podría indicar", "sugiere que" respecto a diagnósticos.
6. Las alertas SIEMPRE aparecen al inicio; usa "alertas_actuales" como fuente de verdad de alertas.
7. Longitud máxima del resumen narrativo: 500 palabras. Idioma: español chileno, tono clínico profesional.

FORMATO DE RESPUESTA (JSON estricto, sin markdown, sin backticks):
{"alertas_prioritarias":[],"resumen_narrativo":"","evolucion_clinica":"","estado_actual":"","informacion_faltante":[],"generado_en":""}

CRITICAL: Respond with RAW JSON only. Do NOT wrap in markdown code fences. No backticks. No \`\`\`json prefix. Just the raw JSON object starting with { and ending with }.`

export interface ResumenPrevioParaPrompt {
  alertas_prioritarias: string[]
  resumen_narrativo: string
  evolucion_clinica: string
  estado_actual: string
  informacion_faltante: string[]
  generado_en: string
}

export function buildUserPromptIncremental(args: {
  contexto: ContextoClinico
  previo: ResumenPrevioParaPrompt
  idsNuevos: string[]
  idsAdendasNuevas: string[]
}): string {
  const nuevosSet = new Set(args.idsNuevos)
  const adendasSet = new Set(args.idsAdendasNuevas)
  const { contexto, previo } = args
  const payload = {
    resumen_vigente: {
      alertas_prioritarias: previo.alertas_prioritarias,
      resumen_narrativo: previo.resumen_narrativo,
      evolucion_clinica: previo.evolucion_clinica,
      estado_actual: previo.estado_actual,
      informacion_faltante: previo.informacion_faltante,
      generado_en: previo.generado_en,
    },
    evoluciones_nuevas: contexto.evolucion.ultimas_notas.filter((n) => nuevosSet.has(n.id)).map(sinId),
    adendas_nuevas: contexto.adendas.recientes.filter((a) => adendasSet.has(a.id)).map(sinId),
    alertas_actuales: contexto.alertas,
    evolucion: {
      total_sesiones: contexto.evolucion.total_sesiones,
      primera_sesion: contexto.evolucion.primera_sesion,
      ultima_sesion: contexto.evolucion.ultima_sesion,
      dias_en_tratamiento: contexto.evolucion.dias_en_tratamiento,
      frecuencia_semanal_estimada: contexto.evolucion.frecuencia_semanal_estimada,
    },
  }
  return JSON.stringify(payload)
}
