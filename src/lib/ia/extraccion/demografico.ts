import { differenceInYears } from 'date-fns'
import { SupabaseClient } from '@supabase/supabase-js'

export interface DemograficoResult {
  edad: number | null
  sexo: string | null
  prevision: string | null
  fecha_primera_atencion: string | null
}

export async function extraerDemografico(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<DemograficoResult> {
  const [pacienteRes, primeraAtencionRes] = await Promise.all([
    supabase
      .from('pacientes')
      .select('fecha_nacimiento, sexo_registral, prevision')
      .eq('id', idPaciente)
      .eq('id_clinica', idClinica)
      .single(),
    supabase
      .from('fce_encuentros')
      .select('started_at')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .order('started_at', { ascending: true })
      .limit(1)
      .single(),
  ])

  const p = pacienteRes.data
  if (!p) return { edad: null, sexo: null, prevision: null, fecha_primera_atencion: null }

  const edad = p.fecha_nacimiento ? differenceInYears(new Date(), new Date(p.fecha_nacimiento)) : null
  const prevision = (p.prevision as { tipo?: string } | null)?.tipo ?? null

  const fecha_primera_atencion = primeraAtencionRes.data?.started_at
    ? new Date(primeraAtencionRes.data.started_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
    : null

  return {
    edad,
    sexo: p.sexo_registral ?? null,
    prevision,
    fecha_primera_atencion,
  }
}
