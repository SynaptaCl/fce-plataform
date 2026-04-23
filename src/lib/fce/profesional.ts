import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfesionalPerfil {
  id: string;
  nombre: string;
  especialidad: string;
  id_clinica: string;
  duracion_consulta: number;
  color_agenda: string | null;
  activo: boolean;
  es_agendable: boolean;
  rut: string | null;
  numero_registro: string | null;    // número de registro profesional (SIS, Colegio, etc.)
  tipo_registro: string | null;      // 'SIS' | 'Colegio Odontológico' | etc.
  puede_prescribir: boolean;         // default false — activado manualmente
}

/**
 * Obtiene TODOS los perfiles profesionales vinculados al usuario autenticado.
 * Un mismo auth_id puede tener múltiples perfiles (ej: médico internista + nefrólogo).
 * Ordenados por created_at ASC para que el "perfil activo por defecto" sea determinista.
 */
export async function getProfesionalesDelUsuario(
  supabase: SupabaseClient,
  authId: string,
  idClinica?: string
): Promise<ProfesionalPerfil[]> {
  let query = supabase
    .from('profesionales')
    .select('id, nombre, especialidad, id_clinica, duracion_consulta, color_agenda, activo, es_agendable, rut, numero_registro, tipo_registro, puede_prescribir')
    .eq('auth_id', authId)
    .eq('activo', true)
    .order('created_at', { ascending: true });

  if (idClinica) {
    query = query.eq('id_clinica', idClinica);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Obtiene el perfil profesional ACTIVO del usuario.
 * Por ahora retorna el primero encontrado (ordenado por created_at).
 *
 * TODO(fase-2): Cuando se implemente selector de perfil en UI, leer la selección
 * desde cookie/localStorage y retornar ese perfil específico. Si no hay selección
 * guardada, caer al primero como ahora.
 */
export async function getProfesionalActivo(
  supabase: SupabaseClient,
  authId: string,
  idClinica?: string
): Promise<ProfesionalPerfil | null> {
  const perfiles = await getProfesionalesDelUsuario(supabase, authId, idClinica);
  return perfiles[0] ?? null;
}
