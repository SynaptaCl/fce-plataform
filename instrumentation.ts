import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[FCE_DEBUG] instrumentation: initializing Sentry for nodejs runtime");
    await import("./sentry.server.config");
    console.log("[FCE_DEBUG] instrumentation: Sentry server init complete");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
