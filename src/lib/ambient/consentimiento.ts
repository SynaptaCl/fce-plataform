import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/modules/guards";

/**
 * AMB-1 F1 — consentimiento de grabación (Ambient Scribe).
 *
 * Modelo: reusa `fce_consentimientos` con el MISMO patrón de versionado que ya
 * usa `createConsentimiento()` para M5 (una fila nueva por versión, +1 sobre la
 * más alta del mismo tipo). "Vigente" = la versión más alta de tipo='grabacion_ia'
 * está firmada.
 *
 * `tipo` tiene CHECK constraint (`fce_consentimientos_tipo_check`) — 'grabacion_ia'
 * se agregó vía `supabase/migrations/20260819_02_add_grabacion_ia_a_consentimientos_tipo.sql`
 * (aplicada 2026-08-19, verificada vía MCP Supabase). Antes de esa fecha este
 * comentario asumía incorrectamente "sin CHECK constraint" — quedó corregido acá
 * y en el resto de comentarios que lo repetían.
 *
 * Por qué versionado y no `revocado_at`: AMB-1-ambient-scribe.md §5 proponía una
 * columna nueva para revocación, pero choca con `trg_block_update_signed_consent`
 * (UPDATE sobre fila firmada) y con regla 15 CLAUDE.md (Claude Code no aplica DDL).
 * Revocar = insertar una nueva versión con firmado=false. Sin migration de columnas
 * nuevas, sin UPDATE a filas firmadas, mismo mecanismo que ya audita cada versión.
 *
 * NO usa el tipo `ConsentType`/`Consent` de `@/types/consent.ts` — ese union es
 * cerrado a los 3 tipos de M5 (general/menores/teleconsulta) y `ConsentManager`
 * asume que todo lo que venga de `getConsentimientos()` tiene un template en
 * `CONSENT_TEMPLATES`. Mezclar 'grabacion_ia' ahí rompe esa asunción — por eso
 * este módulo tiene su propio tipo de fila y sus propias queries.
 */

export const TIPO_CONSENTIMIENTO_GRABACION = "grabacion_ia";

export interface ConsentimientoGrabacionRow {
  id: string;
  version: number;
  firmado: boolean;
  created_at: string | null;
}

/**
 * Trae la versión más alta de tipo='grabacion_ia' para el paciente, o null si no existe ninguna.
 *
 * Tiebreak por `created_at` además de `version`: `fce_consentimientos` NO tiene
 * UNIQUE en (id_paciente, id_clinica, tipo, version), así que dos INSERTs casi
 * simultáneos (doble submit, o el path `web_agenda` de `synapta` corriendo en
 * paralelo con una revocación desde la ficha) pueden leer el mismo "última
 * versión" antes de que ninguno haga commit y terminar con dos filas de igual
 * versión. Sin el segundo `order`, `ORDER BY version DESC` sobre ese empate no
 * es determinístico — el guard de grabación (hard-stop) podría leer cualquiera
 * de las dos en cada llamada. Esto NO cierra la ventana de carrera (requeriría
 * una función transaccional / UNIQUE constraint — DDL, fuera de alcance sin
 * aprobación humana) — solo hace determinista cuál gana como "vigente".
 * synapta replica el mismo tiebreak en `lib/consent/grabacion.ts`.
 */
export async function getUltimaVersionGrabacion(
  supabase: SupabaseClient,
  idPaciente: string
): Promise<ConsentimientoGrabacionRow | null> {
  const { data } = await supabase
    .from("fce_consentimientos")
    .select("id, version, firmado, created_at")
    .eq("id_paciente", idPaciente)
    .eq("tipo", TIPO_CONSENTIMIENTO_GRABACION)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ConsentimientoGrabacionRow | null) ?? null;
}

/**
 * Pura, sin DB — misma regla que getUltimaVersionGrabacion pero sobre una lista
 * ya cargada, incluido el tiebreak por `created_at` en empates de versión.
 */
export function esConsentimientoGrabacionVigente(
  versiones: { tipo: string; firmado: boolean; version: number; created_at?: string | null }[]
): boolean {
  const relevantes = versiones.filter((v) => v.tipo === TIPO_CONSENTIMIENTO_GRABACION);
  if (relevantes.length === 0) return false;
  const ultima = relevantes.reduce((a, b) => {
    if (b.version !== a.version) return b.version > a.version ? b : a;
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    return bTime > aTime ? b : a;
  });
  return ultima.firmado === true;
}

/**
 * Hard-stop server-side. Usar ANTES de emitir el token STT (F2) y antes de
 * generarNotaAmbient() (F3) — nunca confiar solo en el badge de UI.
 */
export async function assertConsentimientoGrabacion(
  supabase: SupabaseClient,
  idPaciente: string
): Promise<ActionResult<true>> {
  const ultima = await getUltimaVersionGrabacion(supabase, idPaciente);
  if (!ultima || !ultima.firmado) {
    return {
      success: false,
      error: "El paciente no tiene consentimiento vigente de grabación. No es posible iniciar Ambient Scribe.",
    };
  }
  return { success: true, data: true };
}
