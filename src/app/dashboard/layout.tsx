import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector } from "@/components/layout/BrandingInjector";
import { requireAccesoFCE } from "@/lib/modules/guards";
import { mapBrandingToTokens, type Rol, type BrandingConfig } from "@/lib/modules/registry";
import { getClinicaConfig, type ClinicaConfig } from "@/lib/modules/config";
import { getClinicaBranding } from "@/lib/modules/branding";
import { ClinicaSessionProvider } from "@/lib/modules/provider";
import { getProfesionalActivo, getProfesionalesDelUsuario } from "@/lib/fce/profesional";

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

  // Contraseña temporal (recuperación self-service): cambio obligatorio en Synapta.
  if (user.user_metadata?.must_change_password === true) {
    redirect("https://synapta.cl/admin/olvide-contrasena");
  }

  // admin_users = fuente autoritativa de rol e id_clinica
  const adminRes = await supabase
    .from("admin_users")
    .select("id_clinica, rol, nombre, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const adminRow = adminRes.data;
  if (!adminRow) {
    redirect("/login?error=sin-perfil");
  }

  const rol = adminRow.rol as Rol;
  const idClinica = adminRow.id_clinica;

  // Guard: recepcionista no accede a FCE
  requireAccesoFCE(rol);

  // Guard: admin / director / superadmin son SOLO lectura administrativa
  // (decisión 2026-09-29, spec 2026-09-29-roles-admin-director-solo-lectura.md).
  // No acceden a rutas de contenido clínico (anamnesis, consentimiento, encuentro,
  // egreso, fhir) ni por URL directa. La defensa real de datos vive en RLS
  // (es_profesional_clinico); este guard evita pantallas vacías/confusas y filtra
  // rutas cuyos datos ya no pueden leer.
  if (rol !== "profesional") {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    const m = pathname.match(
      /^\/dashboard\/pacientes\/([^/]+)\/(consentimiento|encuentro|egreso)(\/|$)/
    );
    if (m) {
      redirect(`/dashboard/pacientes/${m[1]}`);
    }
  }

  // Fetch paralelo: branding (para Sidebar) + nombre clínica + FCE config + perfil profesional
  const [brandingResult, clinicaRes, fceConfig, profesionalActivo, perfilesProfesional] = await Promise.all([
    idClinica ? getClinicaBranding(supabase, idClinica) : Promise.resolve(null),
    idClinica
      ? supabase.from("clinicas").select("nombre").eq("id", idClinica).single()
      : Promise.resolve({ data: null }),
    idClinica ? getClinicaConfig(idClinica, supabase) : Promise.resolve(null),
    getProfesionalActivo(supabase, user.id, idClinica ?? undefined),
    getProfesionalesDelUsuario(supabase, user.id, idClinica ?? undefined),
  ]);

  const branding: BrandingConfig | null = brandingResult;
  const clinicFullName: string = (clinicaRes.data as { nombre?: string } | null)?.nombre ?? "Clínica";

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

  // Nombre: preferir admin_users.nombre, fallback a profesionales.nombre, luego email
  const nombre = adminRow.nombre || profesionalActivo?.nombre || user.email?.split("@")[0] || "Usuario";
  // Especialidad raw — código exacto del catálogo, sin normalizar
  const especialidadDisplay = profesionalActivo?.especialidad ?? null;

  const initials = nombre.split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <ClinicaSessionProvider session={{ config: sessionConfig, rol, userId: user.id, profesionalActivo }}>
      <BrandingInjector tokens={mapBrandingToTokens(branding)} />
      <DashboardShell
        practitionerName={nombre}
        practitionerInitials={initials}
        especialidad={especialidadDisplay}
        rol={rol}
        branding={branding}
        clinicFullName={clinicFullName}
        perfilesProfesional={perfilesProfesional}
        perfilActivoId={profesionalActivo?.id ?? ""}
      >
        {children}
      </DashboardShell>
    </ClinicaSessionProvider>
  );
}
