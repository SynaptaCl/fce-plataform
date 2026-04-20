import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector } from "@/components/layout/BrandingInjector";
import { ClinicaSessionProvider } from "@/lib/modules/provider";
import { getClinicaConfig } from "@/lib/modules/config";
import { requireAccesoFCE } from "@/lib/modules/guards";
import type { Rol } from "@/lib/modules/registry";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch admin_users (rol autoritativo) + profesionales (display) en paralelo
  const [adminRes, profesionalRes] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id_clinica, rol, nombre, activo")
      .eq("auth_id", user.id)
      .single(),
    supabase
      .from("profesionales")
      .select("nombre, especialidad")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);

  const adminRow = adminRes.data;
  if (!adminRow || !adminRow.activo) {
    redirect("/login?error=sin-perfil");
  }

  const rol = adminRow.rol as Rol;

  // Bloquear recepcionistas — no tienen acceso al FCE
  requireAccesoFCE(rol);

  const config = await getClinicaConfig(adminRow.id_clinica, supabase);
  if (!config) {
    redirect("/login?error=sin-config");
  }

  // Datos de display del profesional (best-effort)
  const profesional = profesionalRes.data;
  const nombre =
    profesional?.nombre ?? adminRow.nombre ?? user.email?.split("@")[0] ?? "Usuario";
  const especialidadDisplay: string | null = profesional?.especialidad ?? null;

  const initials = (nombre[0] ?? "U").toUpperCase();

  return (
    <ClinicaSessionProvider session={{ config, rol, userId: user.id }}>
      <BrandingInjector tokens={config.tokensColor} />
      <DashboardShell
        practitionerName={nombre}
        practitionerInitials={initials}
        especialidad={especialidadDisplay}
      >
        {children}
      </DashboardShell>
    </ClinicaSessionProvider>
  );
}
