import { redirect } from "next/navigation";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { ServiciosConfigurador } from "@/components/configuracion/ServiciosConfigurador";

export const metadata = { title: "Servicios — Configuración" };

export default async function ServiciosConfigPage() {
  const { config, rol, idClinica } = await getClinicaConfigFromSession();

  if (!rol || !(ROLES_QUE_CONFIGURAN as string[]).includes(rol)) {
    redirect("/dashboard");
  }
  if (!idClinica) redirect("/dashboard");

  const supabase = await createClient();

  // 1. Servicios de la clínica
  const { data: servicios } = await supabase
    .from("servicios")
    .select("id, nombre, categoria, activo")
    .eq("id_clinica", idClinica)
    .order("orden", { nullsFirst: false });

  // 2. Asignaciones activas + inactivas (para que el modal sepa el estado)
  const servicioIds = servicios?.map((s) => s.id) ?? [];
  const asignacionesRes =
    servicioIds.length > 0
      ? await supabase
          .from("profesional_servicios")
          .select("id_profesional, id_servicio, activo")
          .in("id_servicio", servicioIds)
      : {
          data: [] as {
            id_profesional: string;
            id_servicio: string;
            activo: boolean;
          }[],
        };

  // 3. Todos los profesionales activos (para los checkboxes del modal)
  const { data: profesionales } = await supabase
    .from("profesionales")
    .select("id, nombre, especialidad")
    .eq("id_clinica", idClinica)
    .eq("activo", true)
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
          Servicios
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-3, #94A3B8)",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Gestiona las asignaciones de profesionales a servicios de {clinicaNombre}
        </p>
      </div>
      <ServiciosConfigurador
        servicios={servicios ?? []}
        profesionales={profesionales ?? []}
        asignaciones={
          (asignacionesRes.data ?? []) as {
            id_profesional: string;
            id_servicio: string;
            activo: boolean;
          }[]
        }
      />
    </div>
  );
}
