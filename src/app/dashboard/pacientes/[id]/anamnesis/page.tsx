import { notFound } from "next/navigation";
import { ClipboardList, Activity } from "lucide-react";
import { requireModule } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getPatientById } from "@/app/actions/patients";
import { getAnamnesis, getLatestVitalSigns } from "@/app/actions/anamnesis";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";
import { AnamnesisForm } from "@/components/shared/AnamnesisForm";
import { VitalSignsPanel } from "@/components/shared/VitalSignsPanel";
import { calculateAge, formatRut } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Anamnesis" };
  const p = result.data;
  return {
    title: `Anamnesis — ${p.apellido_paterno} ${p.nombre}`,
  };
}

export default async function AnamnesisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { config, rol } = await getClinicaConfigFromSession();
  // admin/director/superadmin: lectura sin edición (decisión 2026-10-02)
  const soloLectura = rol !== "profesional";
  requireModule(config, "M2_anamnesis");

  const [patientResult, anamnesisResult, vitalSignsResult] = await Promise.all([
    getPatientById(id),
    getAnamnesis(id),
    getLatestVitalSigns(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const anamnesis = anamnesisResult.success ? anamnesisResult.data : null;
  const latestVitalSigns = vitalSignsResult.success ? vitalSignsResult.data : null;

  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink
        href={`/dashboard/pacientes/${id}`}
        label={fullName}
        current="Anamnesis"
      />

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-kp-primary/10 border border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-sm font-bold shrink-0">
          {`${p.nombre?.[0] ?? ""}${p.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">{fullName}</p>
          <p className="text-xs text-ink-3">
            {formatRut(p.rut)} · {age !== null ? `${age} años` : "Sin registro"} ·{" "}
            {p.sexo_registral === "M"
              ? "Masculino"
              : p.sexo_registral === "F"
                ? "Femenino"
                : "Otro"}
          </p>
        </div>
      </div>

      {/* Signos vitales */}
      {soloLectura && (
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={{ color: "var(--color-ink-3)", background: "var(--color-surface-0)" }}
        >
          Vista de solo lectura — la anamnesis y los signos vitales los registra el profesional tratante.
        </div>
      )}

      <Card title="Signos Vitales" icon={<Activity className="w-4 h-4" />}>
        <fieldset disabled={soloLectura} className="min-w-0 border-0 p-0 m-0">
          <VitalSignsPanel patientId={id} latestVitalSigns={latestVitalSigns} />
        </fieldset>
      </Card>

      {/* Anamnesis */}
      <Card
        title="Anamnesis"
        icon={<ClipboardList className="w-4 h-4" />}
      >
        <fieldset disabled={soloLectura} className="min-w-0 border-0 p-0 m-0">
          <AnamnesisForm patientId={id} initialData={anamnesis} />
        </fieldset>
      </Card>
    </div>
  );
}
