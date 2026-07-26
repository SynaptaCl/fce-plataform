import { SupabaseClient } from '@supabase/supabase-js'
import { extraerDemografico } from './extraccion/demografico'
import { extraerAnamnesis } from './extraccion/anamnesis'
import { extraerSignosVitales } from './extraccion/signos-vitales'
import { extraerMedicacion } from './extraccion/medicacion'
import { extraerEvolucion } from './extraccion/evolucion'
import { extraerExamenes } from './extraccion/examenes'
import { extraerInstrumentos } from './extraccion/instrumentos'
import { generarAlertas } from './extraccion/alertas'
import type { DemograficoResult } from './extraccion/demografico'
import type { AnamnesisResult } from './extraccion/anamnesis'
import type { SignosVitalesResult } from './extraccion/signos-vitales'
import type { MedicacionResult } from './extraccion/medicacion'
import type { AlertasResult } from './extraccion/alertas'
import type { EvolucionResult } from './extraccion/evolucion'
import type { ExamenesResult } from './extraccion/examenes'
import type { InstrumentosResult } from './extraccion/instrumentos'
import { log } from '@/lib/logger'

export interface ContextoClinico {
  demografico: DemograficoResult
  anamnesis: AnamnesisResult
  signos_vitales: SignosVitalesResult
  medicacion: MedicacionResult
  alertas: AlertasResult
  evolucion: EvolucionResult
  examenes: ExamenesResult
  instrumentos: InstrumentosResult
  secciones_vacias: string[]
  tokens_estimados: number
  tiene_datos_suficientes: boolean
  /** true si alguna sub-consulta falló por error real (RLS/red/permiso) — no simplemente "sin datos". */
  contexto_incompleto: boolean
  /** claves de sección que fallaron, para logging/label; ver SECTION_LABELS. */
  secciones_con_error: string[]
}

/** Etiquetas legibles para las claves de `secciones_con_error` (usadas en el aviso al profesional). */
export const SECTION_LABELS: Record<string, string> = {
  demografico: 'datos demográficos',
  anamnesis: 'anamnesis',
  signos_vitales: 'signos vitales',
  medicacion: 'medicación',
  evolucion: 'evolución clínica',
  examenes: 'exámenes',
  instrumentos: 'instrumentos de valoración',
}

/**
 * Guard híbrido para `generarResumenIA` (auditoría RLS 2026-07, Fase 2).
 * `alertas` no aparece aquí — se deriva de anamnesis/signos_vitales/medicacion/examenes
 * sin query propia (contexto-clinico.ts:~106), así que ya queda cubierta indirectamente
 * cuando cualquiera de esas 4 secciones falla. `evolucion` no entra en ninguna de las dos
 * listas: mantiene su propio hard-gate vía `tiene_datos_suficientes` en resumen-ia.ts.
 */
export const SECCIONES_CRITICAS: readonly string[] = ['anamnesis', 'medicacion']
export const SECCIONES_NO_CRITICAS: readonly string[] = ['demografico', 'signos_vitales', 'examenes', 'instrumentos']
export const MAX_SECCIONES_NO_CRITICAS = 2

const EMPTY_DEMOGRAFICO: DemograficoResult = { edad: null, sexo: null, prevision: null, fecha_primera_atencion: null }
const EMPTY_ANAMNESIS: AnamnesisResult = { motivo_consulta: null, antecedentes_medicos: null, alergias: null, farmacologia_cronica: null, habitos: null }
const EMPTY_SIGNOS_VITALES: SignosVitalesResult = { ultimo_registro: null, fc_promedio: null, pa_sistolica_promedio: null, pa_diastolica_promedio: null, spo2_minimo: null, temp_ultimo: null, total_registros: 0, alertas_vitales: [] }
const EMPTY_MEDICACION: MedicacionResult = { prescripciones_activas: [], prescripciones_historicas_count: 0 }
const EMPTY_EVOLUCION: EvolucionResult = { total_sesiones: 0, primera_sesion: null, ultima_sesion: null, dias_en_tratamiento: null, frecuencia_semanal_estimada: null, ultimas_notas: [] }
const EMPTY_EXAMENES: ExamenesResult = { pendientes: [], completados_count: 0 }
const EMPTY_INSTRUMENTOS: InstrumentosResult = { aplicaciones: [] }

export async function buildContextoClinico(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<ContextoClinico> {
  const [demograficoR, anamnesisR, signosVitalesR, medicacionR, evolucionR, examenesR, instrumentosR] =
    await Promise.allSettled([
      extraerDemografico(supabase, idPaciente, idClinica),
      extraerAnamnesis(supabase, idPaciente, idClinica),
      extraerSignosVitales(supabase, idPaciente, idClinica),
      extraerMedicacion(supabase, idPaciente, idClinica),
      extraerEvolucion(supabase, idPaciente, idClinica),
      extraerExamenes(supabase, idPaciente, idClinica),
      extraerInstrumentos(supabase, idPaciente, idClinica),
    ])

  // Deny-partial, no deny-all: una sección que falla no debe tumbar el resumen completo —
  // se registra el fallo y esa sección cae a su valor vacío, igual que "sin datos".
  const secciones_con_error: string[] = []
  function resolve<T>(label: string, settled: PromiseSettledResult<T>, fallback: T): T {
    if (settled.status === 'fulfilled') return settled.value
    secciones_con_error.push(label)
    // Nivel 'error' (no 'warn') + `error: settled.reason` real para que Sentry capture
    // la excepción y agrupe por fingerprint (mismo mensaje/stack) — un RLS roto o una
    // integración caída se ve como issue recurrente en el monitoreo sin necesitar un
    // contador de "fallos consecutivos" propio (Fase 2, punto D — approach más liviano).
    log('error', {
      action: 'contexto_clinico_seccion_fallida',
      id_clinica: idClinica,
      id_paciente: idPaciente,
      detail: label,
      error: settled.reason,
    })
    return fallback
  }

  const demografico = resolve('demografico', demograficoR, EMPTY_DEMOGRAFICO)
  const anamnesis = resolve('anamnesis', anamnesisR, EMPTY_ANAMNESIS)
  const signos_vitales = resolve('signos_vitales', signosVitalesR, EMPTY_SIGNOS_VITALES)
  const medicacion = resolve('medicacion', medicacionR, EMPTY_MEDICACION)
  const evolucion = resolve('evolucion', evolucionR, EMPTY_EVOLUCION)
  const examenes = resolve('examenes', examenesR, EMPTY_EXAMENES)
  const instrumentos = resolve('instrumentos', instrumentosR, EMPTY_INSTRUMENTOS)

  const secciones_vacias: string[] = []
  if (!anamnesis.motivo_consulta) secciones_vacias.push('anamnesis')
  if (signos_vitales.total_registros === 0) secciones_vacias.push('signos vitales')
  if (medicacion.prescripciones_activas.length === 0) secciones_vacias.push('medicación')
  if (evolucion.total_sesiones === 0) secciones_vacias.push('evolución clínica')
  if (instrumentos.aplicaciones.length === 0) secciones_vacias.push('instrumentos de valoración')

  const alertas = generarAlertas(anamnesis, signos_vitales, medicacion, examenes, secciones_vacias)

  const payload = { demografico, anamnesis, signos_vitales, medicacion, alertas, evolucion, examenes, instrumentos }
  const tokens_estimados = Math.ceil(JSON.stringify(payload).length / 4)

  return {
    ...payload,
    secciones_vacias,
    tokens_estimados,
    tiene_datos_suficientes: evolucion.total_sesiones > 0,
    contexto_incompleto: secciones_con_error.length > 0,
    secciones_con_error,
  }
}
