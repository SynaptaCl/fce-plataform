import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Rate limiter distribuido (Upstash Redis) para Server Actions que consumen
 * recursos caros (Anthropic, OMS). Reemplaza el limiter in-memory original:
 * ese vivía en memoria del proceso, así que en Vercel serverless
 * multi-instancia cada instancia warm tenía su propio contador y el límite
 * real quedaba multiplicado por el nº de instancias. Con Redis compartido
 * el conteo es el mismo sin importar qué instancia atienda el request.
 *
 * Fail-open por diseño: si Redis no responde en 5s (timeout default de la
 * SDK), la llamada se permite — no queremos que un blip de infra bloquee
 * el flujo clínico.
 */

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

// Cachea un Ratelimit por combinación (limit, windowMs) — evita recrearlo
// en cada invocación de Server Action.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
      prefix: "fce-rl",
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
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
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const { success, remaining, reset } = await getLimiter(limit, windowMs).limit(key);
  return {
    allowed: success,
    remaining,
    retryAfterMs: Math.max(0, reset - Date.now()),
  };
}

/** Conveniencia para acciones IA: prefija el key por namespace + userId. */
export async function iaRateLimit(
  action: string,
  userId: string,
  limit = 8,
  windowMs = 60_000
): Promise<RateLimitResult> {
  return checkRateLimit(`ia:${action}:${userId}`, limit, windowMs);
}
