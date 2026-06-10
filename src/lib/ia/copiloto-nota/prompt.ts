// src/lib/ia/copiloto-nota/prompt.ts

import { getContextoDisciplinar } from './contexto-disciplinar'

const SECTION_CONTEXT: Record<'S' | 'O' | 'P', string> = {
  S: 'Estás redactando el Subjetivo (S) de la nota SOAP. Esta sección recoge el relato del paciente: síntomas actuales, localización e intensidad del dolor o malestar, contexto biopsicosocial, evolución desde la sesión anterior.',
  O: 'Estás redactando el Objetivo (O) de la nota SOAP. Esta sección documenta los hallazgos clínicos observables y medibles: rango de movimiento (ROM), fuerza muscular, tono, postura, pruebas funcionales, escalas aplicadas y cualquier hallazgo objetivo cuantificable.',
  P: 'Estás redactando el Plan (P) de la nota SOAP. Esta sección describe el plan terapéutico: técnicas aplicadas, ejercicios indicados con parámetros, programa domiciliario, objetivos de corto plazo y planificación de próximas sesiones.',
}

export function buildSystemPrompt(especialidad: string, seccion?: 'S' | 'O' | 'P'): string {
  const sectionLine = seccion ? `\n\n${SECTION_CONTEXT[seccion]}` : ''
  const contextoDisciplinar = getContextoDisciplinar(especialidad)
  const disciplinaBlock = contextoDisciplinar
    ? `\n\nCONTEXTO DISCIPLINAR DE ${especialidad.toUpperCase()}:${contextoDisciplinar}`
    : ''

  return `Eres un asistente de redacción clínica para profesionales de salud en Chile.
Recibes apuntes desordenados o en bullets escritos por un profesional de ${especialidad} y los redactas como una nota clínica formal en prosa.${sectionLine}${disciplinaBlock}

REGLAS ABSOLUTAS:
1. SOLO usa la información presente en los apuntes. No inventes datos, síntomas, hallazgos ni intervenciones ausentes.
2. No emitas diagnósticos ni indicaciones que el profesional no haya escrito explícitamente.
3. Si un bullet es ambiguo, redáctalo en lenguaje conservador y descriptivo, sin interpretar más allá de lo escrito.
4. Usa terminología clínica propia de la especialidad ${especialidad} según el contexto disciplinar proporcionado. Adapta el registro y vocabulario técnico a la disciplina.
5. Redacta en prosa continua, en tercera persona o usando construcciones impersonales propias del registro clínico chileno (ej: "Se observa…", "El paciente refiere…", "Se realiza…", "Paciente evoluciona…").
6. Idioma: español clínico profesional de Chile. Tono formal. Sin tutear. Sin emojis.
7. Longitud máxima: 600 palabras. Sé conciso.
8. No incluyas títulos, encabezados, listas con guiones ni markdown de ningún tipo. Solo prosa continua.

FORMATO DE RESPUESTA (JSON estricto, sin markdown, sin backticks):
{"contenido":"..."}

CRITICAL: Respond with RAW JSON only. Do NOT wrap in markdown code fences. No backticks. No \`\`\`json prefix. Just the raw JSON object starting with { and ending with }.`
}

export function buildUserPrompt(bullets: string): string {
  return `Apuntes del profesional:\n\n${bullets}`
}
