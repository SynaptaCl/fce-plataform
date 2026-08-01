import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  action: string;
  id_clinica?: string;
  id_paciente?: string;
  id_encuentro?: string;
  detail?: string;
  error?: unknown;
  [key: string]: unknown;
}

// Errores de Postgres (unique_violation, check constraint) a veces incluyen el
// valor literal que violó la constraint en .message/.details — ej. "Key (rut)=
// (11.111.111-1) already exists". Redactar antes de log/Sentry: cada call site
// de log()/dbError() solo pasa UUIDs en ctx, pero el objeto `error` en sí puede
// traer PII sin que el call site lo sepa. PII prohibido en logs (CLAUDE.md §22).
const RUT_RE = /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function redactPII(value: string): string {
  return value.replace(RUT_RE, "[RUT]").replace(EMAIL_RE, "[EMAIL]");
}

function redactErrorForLog(error: unknown): unknown {
  if (error instanceof Error) {
    const clone = new Error(redactPII(error.message));
    clone.name = error.name;
    clone.stack = error.stack;
    return clone;
  }
  if (error && typeof error === "object") {
    const redacted: Record<string, unknown> = { ...(error as Record<string, unknown>) };
    for (const key of ["message", "details", "hint"]) {
      if (typeof redacted[key] === "string") {
        redacted[key] = redactPII(redacted[key] as string);
      }
    }
    return redacted;
  }
  return error;
}

export function log(level: LogLevel, ctx: LogContext): void {
  const { error: rawError, ...rest } = ctx;
  const safeError = rawError !== undefined ? redactErrorForLog(rawError) : undefined;
  const safeCtx: LogContext = safeError !== undefined ? { ...rest, error: safeError } : rest;
  const entry = { timestamp: new Date().toISOString(), level, ...safeCtx };

  if (level === "error" && rawError !== undefined) {
    const forSentry =
      safeError instanceof Error ? safeError : new Error(redactPII(String(rawError)));
    Sentry.captureException(forSentry, { extra: safeCtx });
  }

  if (level === "warn") {
    Sentry.addBreadcrumb({ category: ctx.action, level: "warning", data: safeCtx });
  }

  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  fn("[FCE]", JSON.stringify(entry));
}
