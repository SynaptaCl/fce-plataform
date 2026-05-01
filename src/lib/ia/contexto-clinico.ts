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
}

export async function buildContextoClinico(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<ContextoClinico> {
  const [demografico, anamnesis, signos_vitales, medicacion, evolucion, examenes, instrumentos] =
    await Promise.all([
      extraerDemografico(supabase, idPaciente, idClinica),
      extraerAnamnesis(supabase, idPaciente, idClinica),
      extraerSignosVitales(supabase, idPaciente, idClinica),
      extraerMedicacion(supabase, idPaciente, idClinica),
      extraerEvolucion(supabase, idPaciente, idClinica),
      extraerExamenes(supabase, idPaciente, idClinica),
      extraerInstrumentos(supabase, idPaciente, idClinica),
    ])

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
  }
}
