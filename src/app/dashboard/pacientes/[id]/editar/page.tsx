import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getPatientById } from "@/app/actions/patients";
import { PatientForm } from "@/components/shared/PatientForm";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";
import { formatRut } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Editar Paciente" };
  const p = result.data;
  return { title: `Editar — ${p.apellido_paterno} ${p.nombre}` };
}

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);

  if (!result.success) notFound();

  const patient = result.data;
  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";

  return (
    <div className="max-w-2xl space-y-5">
      <BackLink
        href="/dashboard/pacientes"
        label="Pacientes"
        intermediate={{ href: `/dashboard/pacientes/${id}`, label: fullName }}
        current="Editar M1"
      />

      <div>
        <h2 className="text-2xl font-bold text-ink-1 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-kp-accent" />
          Editar Ficha — M1
        </h2>
        <p className="text-sm text-ink-3 mt-0.5">
          RUT:{" "}
          <span className="font-mono font-semibold text-ink-2">
            {formatRut(patient.rut)}
          </span>{" "}
          · {fullName}
        </p>
      </div>

      <Card>
        <PatientForm mode="edit" patientId={id} initialData={patient} />
      </Card>
    </div>
  );
}
