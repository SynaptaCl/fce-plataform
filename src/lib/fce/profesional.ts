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
  puede_indicar_examenes: boolean;   // default false — activado manualmente
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
    .select('id, nombre, especialidad, id_clinica, duracion_consulta, color_agenda, activo, es_agendable, rut, numero_registro, tipo_registro, puede_prescribir, puede_indicar_examenes')
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

const COOKIE_NAME_PERFIL = "id_profesional_activo";

/**
 * Obtiene el perfil profesional ACTIVO del usuario.
 * Lee la cookie `id_profesional_activo` si está disponible para respetar la
 * selección del profesional cuando tiene múltiples perfiles. Si la cookie no
 * existe o el ID no es válido para este usuario/clínica, cae al primero.
 */
export async function getProfesionalActivo(
  supabase: SupabaseClient,
  authId: string,
  idClinica?: string
): Promise<ProfesionalPerfil | null> {
  const perfiles = await getProfesionalesDelUsuario(supabase, authId, idClinica);
  if (perfiles.length === 0) return null;

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const preferredId = cookieStore.get(COOKIE_NAME_PERFIL)?.value;
    if (preferredId) {
      const found = perfiles.find((p) => p.id === preferredId);
      if (found) return found;
    }
  } catch {
    // Si next/headers no está disponible (edge, test), caer al primero
  }

  return perfiles[0];
}
