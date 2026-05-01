import type { AnamnesisResult } from './anamnesis'
import type { SignosVitalesResult } from './signos-vitales'
import type { MedicacionResult } from './medicacion'
import type { ExamenesResult } from './examenes'
import { differenceInDays } from 'date-fns'

export interface AlertasResult {
  criticas: string[]
  advertencias: string[]
  informativas: string[]
}

export function generarAlertas(
  anamnesis: AnamnesisResult,
  signos: SignosVitalesResult,
  medicacion: MedicacionResult,
  examenes: ExamenesResult,
  secciones_vacias: string[]
): AlertasResult {
  const criticas: string[] = []
  const advertencias: string[] = []
  const informativas: string[] = []

  // Críticas: alergias y vitales
  if (anamnesis.alergias && anamnesis.alergias.length > 0) {
    const agentes = anamnesis.alergias.map((a) => a.agente).join(', ')
    criticas.push(`Alergias registradas: ${agentes}`)
  }
  for (const alerta of signos.alertas_vitales) {
    criticas.push(alerta)
  }

  // Advertencias: signos vitales sin registro reciente y exámenes pendientes muy viejos
  if (signos.ultimo_registro) {
    const diasSinSignos = differenceInDays(new Date(), new Date(signos.ultimo_registro))
    if (diasSinSignos > 30) {
      advertencias.push(`Sin registro de signos vitales en los últimos ${diasSinSignos} días`)
    }
  } else if (signos.total_registros === 0) {
    advertencias.push('Sin registros de signos vitales')
  }

  for (const e of examenes.pendientes) {
    if (e.dias_pendiente > 30) {
      advertencias.push(`Examen pendiente hace ${e.dias_pendiente} días: ${e.examenes_solicitados}`)
    }
  }

  // Informativas: secciones vacías
  for (const seccion of secciones_vacias) {
    informativas.push(`Sin datos registrados: ${seccion}`)
  }

  return { criticas, advertencias, informativas }
}
