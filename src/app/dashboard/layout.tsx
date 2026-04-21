import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector } from "@/components/layout/BrandingInjector";
import { requireAccesoFCE } from "@/lib/modules/guards";
import { mapBrandingToTokens, type Rol, type BrandingConfig } from "@/lib/modules/registry";
import { getClinicaConfig, type ClinicaConfig } from "@/lib/modules/config";
import { ClinicaSessionProvider } from "@/lib/modules/provider";

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

  // admin_users = fuente autoritativa de rol e id_clinica
  // profesionales = solo datos de display (nombre, especialidad)
  const [adminRes, profesionalRes] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id_clinica, rol, nombre, activo")
      .eq("auth_id", user.id)
      .eq("activo", true)
      .single(),
    supabase
      .from("profesionales")
      .select("nombre, especialidad")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);

  const adminRow = adminRes.data;
  if (!adminRow) {
    redirect("/login?error=sin-perfil");
  }

  const rol = adminRow.rol as Rol;
  const idClinica = adminRow.id_clinica;

  // Guard: recepcionista no accede a FCE
  requireAccesoFCE(rol);

  // Fetch paralelo: branding (para Sidebar) + FCE config (para ClinicaSessionProvider)
  const [brandingResult, fceConfig] = await Promise.all([
    idClinica
      ? supabase.from("clinicas").select("config").eq("id", idClinica).single()
      : Promise.resolve({ data: null }),
    idClinica ? getClinicaConfig(idClinica, supabase) : Promise.resolve(null),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branding: BrandingConfig | null = (brandingResult.data?.config as any)?.branding ?? null;

  // Fallback session config si la clínica no tiene clinicas_fce_config aún
  const sessionConfig: ClinicaConfig = fceConfig ?? {
    idClinica: idClinica ?? "",
    nombreDisplay: "Clínica",
    slug: "",
    clinicInitials: branding?.clinic_initials ?? "CL",
    logoUrl: branding?.logo_url ?? null,
    modulosActivos: [],
    especialidadesActivas: [],
    tokensColor: mapBrandingToTokens(branding),
    configModulos: {},
    updatedAt: null,
  };

  const profesional = profesionalRes.data;
  // Nombre: preferir admin_users.nombre, fallback a profesionales.nombre, luego email
  const nombre = adminRow.nombre || profesional?.nombre || user.email?.split("@")[0] || "Usuario";
  // Especialidad raw — código exacto del catálogo, sin normalizar
  const especialidadDisplay = profesional?.especialidad ?? null;

  const initials = nombre.split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <ClinicaSessionProvider session={{ config: sessionConfig, rol, userId: user.id }}>
      <BrandingInjector tokens={mapBrandingToTokens(branding)} />
      <DashboardShell
        practitionerName={nombre}
        practitionerInitials={initials}
        especialidad={especialidadDisplay}
        rol={rol}
        branding={branding}
      >
        {children}
      </DashboardShell>
    </ClinicaSessionProvider>
  );
}
