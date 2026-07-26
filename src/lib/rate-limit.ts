/**
 * Rate limiter in-memory (sliding window) para Server Actions que consumen
 * recursos caros (Anthropic, OMS). Primera capa contra loops accidentales o
 * abuso por sesión comprometida.
 *
 * LIMITACIÓN: el estado vive en el proceso servidor. En serverless multi-instancia
 * (Vercel) cada instancia tiene su propio contador, por lo que el límite real se
 * multiplica por el nº de instancias warm. Para un límite estricto y distribuido,
 * migrar a Upstash Ratelimit (Redis) o Vercel KV. Esta implementación ya bloquea
 * ráfagas dentro de una misma instancia, que cubre el caso típico de loop de UI.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Limpieza periódica de buckets expirados para evitar crecimiento de memoria.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number, windowMs: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Sliding window: cuenta cuántas llamadas realizó `key` en los últimos
 * `windowMs`. Permite hasta `limit` llamadas en esa ventana.
 *
 * @param key    Identificador estable (p.ej. `ia:copiloto:${user.id}`).
 * @param limit  Máximo de llamadas permitidas en la ventana.
 * @param windowMs Tamaño de la ventana en ms.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now, windowMs);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: limit - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

/** Conveniencia para acciones IA: prefija el key por namespace + userId. */
export function iaRateLimit(
  action: string,
  userId: string,
  limit = 8,
  windowMs = 60_000
): RateLimitResult {
  return checkRateLimit(`ia:${action}:${userId}`, limit, windowMs);
}
