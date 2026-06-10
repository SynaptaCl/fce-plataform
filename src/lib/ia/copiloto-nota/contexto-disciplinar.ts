// src/lib/ia/copiloto-nota/contexto-disciplinar.ts

/**
 * Contexto clínico por especialidad inyectado al system prompt del Copiloto.
 * Cada entrada describe marcos teóricos, terminología y enfoque de documentación
 * propios de la disciplina para que el modelo genere notas con lenguaje apropiado.
 *
 * Para agregar una especialidad: añadir key exacta del catálogo + string de contexto.
 */

export const CONTEXTO_DISCIPLINAR: Record<string, string> = {
  Kinesiología: `
Disciplina de rehabilitación centrada en el movimiento humano y la función física.
Marcos: modelo biopsicosocial, CIF (funciones corporales, actividades, participación).
Terminología clave: ROM (rango articular), fuerza muscular (escala Daniels 0-5), tono muscular (Ashworth modificada), propiocepción, control motor, patrón de marcha, capacidad funcional, resistencia aeróbica.
Pruebas frecuentes: goniometría, dinamometría, TUG, 6MWT, Berg, Tinetti, EVA.
Notas documentan: estado funcional basal, hallazgos de evaluación cuantificables, técnicas aplicadas con parámetros (series, repeticiones, carga), respuesta del paciente, progresión funcional.`,

  Fonoaudiología: `
Disciplina de rehabilitación de la comunicación, lenguaje, habla, voz y deglución.
Marcos: modelo CIF, enfoque funcional-comunicativo, modelos psicolingüísticos.
Terminología clave: articulación, fluidez, prosodia, comprensión auditiva, expresión verbal, pragmática, deglución (fases oral/faríngea/esofágica), disfagia, disartria, afasia, TEL/TDL.
Pruebas frecuentes: TEPROSIF-R, TECAL, STSG, ADOS-2, EAT-10, FOIS, evaluación miofuncional orofacial.
Notas documentan: modalidades comunicativas evaluadas, rendimiento en tareas específicas, conducta comunicativa funcional, técnicas de estimulación aplicadas, facilitaciones, nivel de asistencia requerida.`,

  Masoterapia: `
Disciplina de terapia manual centrada en tejidos blandos y manejo del dolor musculoesquelético.
Marcos: modelo biomecánico, cadenas miofasciales, puntos gatillo (Travell & Simons).
Terminología clave: contractura, hipertonía, punto gatillo (PG) activo/latente, banda tensa, dolor referido, restricción fascial, adherencia, fibrosis, espasmo protector.
Técnicas frecuentes: masaje descontracturante, liberación miofascial, compresión isquémica, fricción transversa (Cyriax), drenaje linfático manual, stretching, crioterapia/termoterapia.
Notas documentan: localización anatómica precisa (músculos específicos), hallazgos palpatorios, técnicas aplicadas con duración/intensidad, respuesta inmediata del tejido, contraindicaciones evaluadas.`,

  'Terapia Ocupacional': `
Disciplina de rehabilitación centrada en el desempeño ocupacional y la independencia funcional.
Marcos: MOHO (Modelo de Ocupación Humana), Modelo Canadiense (CMOP-E), Integración Sensorial Ayres, Marco de Trabajo AOTA.
Terminología clave: desempeño ocupacional, AVD básicas/instrumentales, destrezas de ejecución (motoras, de proceso, de interacción social), factores del cliente, demandas de la actividad, contexto/entorno, roles ocupacionales, volición, habituación.
Áreas de ocupación: autocuidado, productividad (educación/trabajo), juego/ocio, participación social, descanso/sueño.
Evaluaciones frecuentes: FIM/MIF, Barthel, Lawton, COPM, Sensory Profile, BRIEF-2, Vineland-3, evaluación de AVD estructurada.
Notas documentan: análisis de actividad, nivel de independencia por área, adaptaciones/ayudas técnicas, estrategias compensatorias, facilitadores y barreras del entorno, objetivos funcionales.`,

  'Medicina General': `
Atención médica integral ambulatoria con enfoque diagnóstico-terapéutico.
Marcos: razonamiento clínico hipotético-deductivo, medicina basada en evidencia, enfoque biopsicosocial.
Terminología clave: anamnesis próxima/remota, examen físico segmentario, hipótesis diagnóstica, diagnóstico diferencial, indicaciones farmacológicas, plan terapéutico, derivación, control.
Estructura típica: motivo de consulta → anamnesis → examen físico → hipótesis diagnóstica → plan (indicaciones, fármacos, exámenes, derivaciones, control).
Notas documentan: hallazgos positivos y negativos pertinentes, impresión diagnóstica con fundamentación, conducta terapéutica con posología cuando aplica.`,

  Enfermería: `
Disciplina de cuidado integral centrada en valoración, procedimientos y continuidad del cuidado.
Marcos: Proceso de Atención de Enfermería (PAE), patrones funcionales de Gordon, NANDA-NIC-NOC.
Terminología clave: valoración de enfermería, diagnóstico enfermero, intervención/procedimiento, evolución, indicaciones médicas cumplidas, CSV (control signos vitales), balance hídrico, escala de dolor, estado de conciencia, integridad cutánea, dispositivos invasivos.
Escalas frecuentes: Braden (LPP), Downton/J.H. Morse (caídas), Glasgow, EVA, Norton, Barthel, Lawton.
Notas documentan: estado general del paciente, CSV, procedimientos realizados, medicamentos administrados, respuesta a intervenciones, educación al paciente/familia, alertas de seguridad.`,

  Psicología: `
Atención de salud mental centrada en evaluación, intervención psicoterapéutica y seguimiento.
Marcos: según enfoque del profesional — cognitivo-conductual (TCC), sistémico, psicodinámico, humanista, neuropsicología. Documentar desde el marco declarado.
Terminología clave: motivo de consulta, estado mental (orientación, afecto, pensamiento, sensopercepción, juicio, insight), alianza terapéutica, hipótesis clínica, objetivos terapéuticos, técnicas aplicadas, tareas intersesión.
Evaluaciones frecuentes: PHQ-9, GAD-7, BDI-II, MMSE, MoCA, WISC-V, WAIS-IV, Rorschach, HTP, test de la familia.
Notas documentan: estado anímico y mental observado, contenido relevante de la sesión (sin transcribir verbatim), técnicas/intervenciones aplicadas, respuesta del paciente, plan de trabajo, riesgo si aplica.
Sensibilidad: respetar confidencialidad; no incluir contenido que el paciente no autorizó registrar.`,

  Nutrición: `
Atención nutricional con enfoque en evaluación antropométrica, dietética y educación alimentaria.
Marcos: proceso de atención nutricional (NCP), diagnóstico nutricional IDNT (PES), guías alimentarias chilenas MINSAL.
Terminología clave: evaluación antropométrica (IMC, circunferencia cintura, pliegues), anamnesis alimentaria (recordatorio 24h, frecuencia de consumo), diagnóstico nutricional (según PES: problema, etiología, signos/síntomas), plan alimentario, metas nutricionales, educación alimentaria.
Clasificación estado nutricional: bajo peso (<18.5), normal (18.5-24.9), sobrepeso (25-29.9), obesidad I/II/III (≥30/35/40).
Notas documentan: datos antropométricos con valores, ingesta habitual resumida, diagnóstico nutricional estructurado, objetivos y plan alimentario, indicaciones específicas, próximo control.`,

  Odontología: `
Atención odontológica con documentación por piezas dentarias y procedimientos.
Marcos: odontograma universal/FDI, índice COPD, índice de placa, clasificación periodontal AAP/EFP 2018.
Terminología clave: pieza dentaria (notación FDI), caries (clasificación Black/ICDAS), enfermedad periodontal (gingivitis/periodontitis), sondaje periodontal, nivel de inserción clínica (NIC), recesión gingival, movilidad dentaria, plan de tratamiento por prioridad.
Notas documentan: hallazgos por pieza, procedimiento realizado con detalle técnico (material, técnica), anestesia utilizada, indicaciones post-operatorias, derivaciones.`,

  Podología: `
Atención podológica centrada en evaluación y tratamiento del pie.
Marcos: biomecánica del pie, evaluación vascular periférica, clasificación de riesgo de pie diabético (Wagner, Texas).
Terminología clave: onicocriptosis, onicomicosis, hiperqueratosis, heloma, tiloma, hallux valgus, pie plano/cavo, pulsos pedios, llenado capilar, monofilamento, índice tobillo-brazo (ITB), dermatitis, fisuras.
Notas documentan: inspección visual del pie, hallazgos ungueales y dérmicos, evaluación vascular/neurológica cuando aplica, procedimiento realizado, indicaciones de cuidado, derivación si riesgo alto.`,
}

/**
 * Retorna el bloque de contexto disciplinario para una especialidad.
 * Si la especialidad no tiene contexto configurado, retorna string vacío
 * (el prompt base sigue funcionando sin contexto adicional).
 */
export function getContextoDisciplinar(especialidad: string): string {
  return CONTEXTO_DISCIPLINAR[especialidad] ?? ''
}
