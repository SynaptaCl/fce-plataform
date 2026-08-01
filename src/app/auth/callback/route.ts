import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

/**
 * Intercambia el `code` (PKCE) enviado por Supabase en el link de recuperación
 * de contraseña por una sesión activa, y redirige a `next` (default /reset-password).
 * Sin esto, el link del email deja al usuario en una URL con `?code=...` que
 * nadie consume y el flujo de reset nunca se completa.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    log("warn", {
      action: "auth_callback_exchange_failed",
      detail: "exchangeCodeForSession error",
    });
  }

  return NextResponse.redirect(
    `${origin}/login?error=recovery_link_invalido`
  );
}
