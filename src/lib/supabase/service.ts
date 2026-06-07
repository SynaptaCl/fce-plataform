import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ADVERTENCIA: este cliente usa service_role — bypasa completamente RLS.
// Usarlo solo para operaciones de sistema que no pueden depender del JWT del usuario:
// audit logs post-acción, caché de IA, operaciones de seed/admin.
// NUNCA para leer datos clínicos del usuario — usar createClient() (server.ts) en su lugar.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
