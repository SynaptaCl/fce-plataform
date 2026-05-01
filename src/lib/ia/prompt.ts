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
      ultimas_notas: contexto.evolucion.ultimas_notas,
    },
    examenes: contexto.examenes,
    instrumentos: contexto.instrumentos,
    secciones_vacias: contexto.secciones_vacias,
  }
  return JSON.stringify(payload)
}
