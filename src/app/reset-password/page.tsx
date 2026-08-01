import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión de recuperación activa (link vencido, ya usado, o acceso directo
  // a la ruta) no hay nada que actualizar — de vuelta al login.
  if (!user) {
    redirect("/login?error=recovery_link_invalido");
  }

  return <ResetPasswordForm />;
}
