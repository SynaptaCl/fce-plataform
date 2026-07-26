/**
 * PGRST116 = sin filas (`.single()`/`.maybeSingle()` sin match) — caso legítimo de "sin datos".
 * Cualquier otro código es un fallo real de consulta/permiso (RLS, red, etc.) que NO debe
 * tratarse como "sección vacía" — ver auditoría RLS 2026-07.
 */
export function isRealDbError(error: { code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code !== "PGRST116";
}
