import { SupabaseClient } from '@supabase/supabase-js'

export interface AnamnesisResult {
  motivo_consulta: string | null
  antecedentes_medicos: Array<{ condicion: string; diagnosticado?: string }> | null
  alergias: Array<{ agente: string; reaccion?: string; severidad?: string }> | null
  farmacologia_cronica: Array<{ medicamento: string; frecuencia?: string }> | null
  habitos: Record<string, string> | null
}

export async function extraerAnamnesis(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<AnamnesisResult> {
  const { data } = await supabase
    .from('fce_anamnesis')
    .select('motivo_consulta, antecedentes_medicos, alergias, farmacologia, habitos')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return { motivo_consulta: null, antecedentes_medicos: null, alergias: null, farmacologia_cronica: null, habitos: null }

  return {
    motivo_consulta: data.motivo_consulta ?? null,
    antecedentes_medicos: (data.antecedentes_medicos as Array<{ condicion: string; diagnosticado?: string }> | null) ?? null,
    alergias: (data.alergias as Array<{ agente: string; reaccion?: string; severidad?: string }> | null) ?? null,
    farmacologia_cronica: (data.farmacologia as Array<{ medicamento: string; frecuencia?: string }> | null) ?? null,
    habitos: (data.habitos as Record<string, string> | null) ?? null,
  }
}
