/**
 * AMB-1 F2 — abstracción del proveedor STT (transcripción en tiempo real).
 *
 * El proveedor (AssemblyAI vs Deepgram) NO está decidido — el spike de F0
 * (AMB-1-ambient-scribe.md §6, "audio real de consulta chilena") sigue
 * bloqueado. Esta interfaz permite escribir el Route Handler y el componente
 * de captura AHORA sin acoplarlos a un SDK específico: cuando el spike
 * resuelva el proveedor, solo se reemplaza `issueEphemeralSttToken()` —
 * el resto del pipeline (guards, rate limit, componente cliente) no cambia.
 *
 * NUNCA exponer la API key real del proveedor al cliente — este módulo vive
 * exclusivamente server-side (Route Handler), nunca se importa desde 'use client'.
 */

export interface EphemeralSttToken {
  token: string;
  expiresInMs: number;
  /** URL de streaming del proveedor a la que el cliente abre el WebSocket. */
  wsUrl: string;
}

export class SttProviderNotConfiguredError extends Error {
  constructor() {
    super("Proveedor STT no configurado — pendiente spike F0 (AMB-1-ambient-scribe.md §6)");
    this.name = "SttProviderNotConfiguredError";
  }
}

/**
 * Emite un token efímero (TTL ≤60s) del proveedor STT elegido.
 *
 * Implementar tras cerrar el spike F0 + DPA (P2). Hoy lanza
 * SttProviderNotConfiguredError — el Route Handler la traduce a 503 y NUNCA
 * deja pasar un token falso o hardcodeado.
 */
export async function issueEphemeralSttToken(): Promise<EphemeralSttToken> {
  throw new SttProviderNotConfiguredError();
}
