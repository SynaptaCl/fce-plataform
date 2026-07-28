'use server';

import { createClient } from '@/lib/supabase/server';
import { buscarCIF } from '@/lib/icd/search';
import type { ICDSearchResult } from '@/lib/icd/types';
import type { ActionResult } from '@/app/actions/patients';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Verifica sesión + pertenencia a clínica activa antes de consumir las
 * credenciales OMS compartidas. Evita abuso anónimo de la cuota de la plataforma.
 */
async function requireClinicMember(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: 'No autenticado' };

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id_clinica')
    .eq('auth_id', user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!admin?.id_clinica) {
    return { ok: false, error: 'Sin acceso a esta clínica' };
  }
  return { ok: true, userId: user.id };
}

export async function searchCIF(
  query: string,
  dominioPrefix?: string,
): Promise<ActionResult<ICDSearchResult[]>> {
  const auth = await requireClinicMember();
  if (!auth.ok) return { success: false, error: auth.error };

  if (query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const rl = checkRateLimit(`icd:cif:${auth.userId}`, 30, 60_000);
  if (!rl.allowed) {
    return { success: false, error: 'Demasiadas búsquedas. Espera un momento e inténtalo de nuevo.' };
  }

  try {
    const q = dominioPrefix ? `${dominioPrefix} ${query}` : query;
    const results = await buscarCIF(q);
    return { success: true, data: results };
  } catch {
    return { success: true, data: [] };
  }
}
