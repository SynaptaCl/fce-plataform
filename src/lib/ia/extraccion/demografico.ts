import { differenceInYears } from 'date-fns'
import { SupabaseClient } from '@supabase/supabase-js'

export interface DemograficoResult {
  nombre_completo: string | null
  rut: string | null
  edad: number | null
  sexo: string | null
  prevision: string | null
  contacto_emergencia: string | null
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
      .select('nombre, apellido_paterno, apellido_materno, rut, fecha_nacimiento, sexo_registral, prevision, contacto_emergencia')
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
  if (!p) return { nombre_completo: null, rut: null, edad: null, sexo: null, prevision: null, contacto_emergencia: null, fecha_primera_atencion: null }

  const nombre_completo = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ') || null
  const edad = p.fecha_nacimiento ? differenceInYears(new Date(), new Date(p.fecha_nacimiento)) : null
  const prevision = (p.prevision as { tipo?: string } | null)?.tipo ?? null

  const ce = p.contacto_emergencia as { nombre?: string; parentesco?: string } | null
  const contacto_emergencia = ce?.nombre
    ? [ce.nombre, ce.parentesco].filter(Boolean).join(' (') + (ce.parentesco ? ')' : '')
    : null

  const fecha_primera_atencion = primeraAtencionRes.data?.started_at
    ? new Date(primeraAtencionRes.data.started_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
    : null

  return {
    nombre_completo,
    rut: p.rut ?? null,
    edad,
    sexo: p.sexo_registral ?? null,
    prevision,
    contacto_emergencia,
    fecha_primera_atencion,
  }
}
