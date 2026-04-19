import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector, type BrandingConfig } from "@/components/layout/BrandingInjector";
import type { Especialidad, Rol as LegacyRol } from "@/lib/constants";
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

  // Config FCE + branding raw en paralelo (branding needed for BrandingInjector/DashboardShell)
  const [config, clinicaRes] = await Promise.all([
    getClinicaConfig(adminRow.id_clinica, supabase),
    supabase
      .from("clinicas")
      .select("config")
      .eq("id", adminRow.id_clinica)
      .single(),
  ]);

  if (!config) {
    redirect("/login?error=sin-config");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branding: BrandingConfig | null = (clinicaRes.data?.config as any)?.branding ?? null;

  // Datos de display del profesional (best-effort — columna especialidad es texto libre)
  const profesional = profesionalRes.data;
  const nombre =
    profesional?.nombre ?? adminRow.nombre ?? user.email?.split("@")[0] ?? "Usuario";
  const rawEsp = profesional?.especialidad as string | undefined;
  const especialidad: Especialidad = rawEsp
    ? (rawEsp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as Especialidad)
    : "kinesiologia";

  const initials = (nombre[0] ?? "U").toUpperCase();

  return (
    <ClinicaSessionProvider session={{ config, rol, userId: user.id }}>
      <BrandingInjector branding={branding} />
      <DashboardShell
        practitionerName={nombre}
        practitionerInitials={initials}
        especialidad={especialidad}
        rol={rol as unknown as LegacyRol}
        branding={branding}
      >
        {children}
      </DashboardShell>
    </ClinicaSessionProvider>
  );
}
