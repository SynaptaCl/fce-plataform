import { cache } from "react";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import { requireModule } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getPatientById } from "@/app/actions/patients";
import { Card } from "@/components/ui/Card";
import { PlanesIntervencionList } from "@/components/shared/PlanesIntervencionList";
import { calculateAge, formatRut } from "@/lib/utils";

// generateMetadata y la página piden el mismo paciente: cache() por request evita
// duplicar las queries y el registro de auditoría "ver_paciente".
const getPatient = cache(getPatientById);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatient(id);
  if (!result.success) return { title: "Plan de Intervención" };
  const p = result.data;
  return {
    title: `Plan de Intervención — ${p.apellido_paterno} ${p.nombre}`,
  };
}

export default async function PlanIntervencionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Config de clínica y paciente son independientes: en paralelo.
  const [{ config }, patientResult] = await Promise.all([
    getClinicaConfigFromSession(),
    getPatient(id),
  ]);
  requireModule(config, "M10_plan_intervencion");

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink
        href={`/dashboard/pacientes/${id}`}
        label={fullName}
        current="Plan de Intervención"
      />

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-kp-primary/10 border border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-sm font-bold shrink-0">
          {`${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">{fullName}</p>
          <p className="text-xs text-ink-3">
            {formatRut(p.rut)} · {age !== null ? `${age} años` : "Sin registro"}
          </p>
        </div>
      </div>

      {/* Planes de intervención */}
      <Card
        title="Plan de Intervención"
        icon={<ClipboardList className="w-4 h-4" />}
      >
        <PlanesIntervencionList idPaciente={id} />
      </Card>
    </div>
  );
}
