"use server";

import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { COOKIE_FORMATO_NOTA, esFormatoNota } from "@/lib/modules/formato-nota";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 días

/** Guarda el formato de nota preferido (default para próximos encuentros de rehab). */
export async function setFormatoNotaPreferido(formato: string): Promise<void> {
  await requireAuth();
  if (!esFormatoNota(formato)) return;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_FORMATO_NOTA, formato, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
