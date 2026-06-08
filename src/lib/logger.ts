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

export function log(level: LogLevel, ctx: LogContext): void {
  const entry = { timestamp: new Date().toISOString(), level, ...ctx };

  if (level === "error" && ctx.error) {
    Sentry.captureException(
      ctx.error instanceof Error ? ctx.error : new Error(String(ctx.error)),
      { extra: ctx }
    );
  }

  if (level === "warn") {
    Sentry.addBreadcrumb({ category: ctx.action, level: "warning", data: ctx });
  }

  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  fn("[FCE]", JSON.stringify(entry));
}
