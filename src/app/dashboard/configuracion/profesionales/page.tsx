import { redirect } from "next/navigation";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { ProfesionalesConfigurador } from "@/components/configuracion/ProfesionalesConfigurador";

export const metadata = { title: "Profesionales — Configuración" };

export default async function ProfesionalesConfigPage() {
  const { config, rol, idClinica } = await getClinicaConfigFromSession();

  if (!rol || !(ROLES_QUE_CONFIGURAN as string[]).includes(rol)) {
    redirect("/dashboard");
  }
  if (!idClinica) redirect("/dashboard");

  const supabase = await createClient();
  const { data: profesionales } = await supabase
    .from("profesionales")
    .select(
      "id, nombre, especialidad, auth_id, numero_registro, tipo_registro, activo, puede_prescribir, puede_indicar_examenes"
    )
    .eq("id_clinica", idClinica)
    .order("nombre");

  const clinicaNombre = config?.nombreDisplay ?? "tu clínica";

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-ink-1, #1E293B)",
            margin: 0,
          }}
        >
          Profesionales
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-3, #94A3B8)",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Gestiona el equipo profesional de {clinicaNombre}
        </p>
      </div>
      <ProfesionalesConfigurador profesionales={profesionales ?? []} />
    </div>
  );
}
