import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { getPatientById } from "@/app/actions/patients";

export default async function RehabPage({
  params,
}: {
  params: Promise<{ id: string; encuentroId: string }>;
}) {
  const { id, encuentroId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [patientResult, encuentroRes] = await Promise.all([
    getPatientById(id),
    supabase
      .from("fce_encuentros")
      .select("id, especialidad, status")
      .eq("id", encuentroId)
      .eq("id_paciente", id)
      .single(),
  ]);

  if (!patientResult.success || encuentroRes.error || !encuentroRes.data) notFound();

  const patient = patientResult.data;
  const encuentro = encuentroRes.data;

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} hasConsent={false} patientId={id} />

      <div className="rounded-xl border border-kp-border bg-surface-1 p-8 text-center space-y-3">
        <p className="text-sm font-medium text-kp-accent uppercase tracking-wide">
          Modelo Rehabilitación
        </p>
        <h1 className="text-xl font-semibold text-ink-1">
          Espacio de trabajo — {encuentro.especialidad}
        </h1>
        <p className="text-ink-3 text-sm">
          Encuentro <code className="font-mono text-xs bg-surface-0 px-1 rounded">{encuentroId.slice(0, 8)}…</code>
          {" · "}Estado: <span className="font-medium">{encuentro.status}</span>
        </p>
        <p className="text-ink-3 text-sm italic">
          Los módulos SOAP, Evaluación y CIF se implementan en Sprint R7.
        </p>
      </div>

      <div className="flex justify-start">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="text-sm text-ink-3 hover:text-kp-accent transition-colors"
        >
          ← Volver a la ficha
        </Link>
      </div>
    </div>
  );
}
