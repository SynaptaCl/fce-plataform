import { notFound, redirect } from "next/navigation";
import { requireModuloEgresos } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getEgreso } from "@/app/actions/egresos";
import { getPatientById } from "@/app/actions/patients";
import { EgresoForm } from "@/components/shared/EgresoForm";

export default async function EgresoDetallePage({
  params,
}: {
  params: Promise<{ id: string; egresoId: string }>;
}) {
  const { id, egresoId } = await params;

  const { config, userId } = await getClinicaConfigFromSession();
  if (!userId) redirect("/login");

  requireModuloEgresos(config);

  const [patientResult, egresoResult] = await Promise.all([
    getPatientById(id),
    getEgreso(egresoId),
  ]);

  if (!patientResult.success) notFound();
  if (!egresoResult.success) notFound();

  const p = patientResult.data;
  const egreso = egresoResult.data;

  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Paciente";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-ink-1">Egreso de {fullName}</h1>
        <p className="text-sm text-ink-3 mt-1">
          {egreso.firmado
            ? "Documento firmado — solo lectura"
            : "Borrador de egreso"}
        </p>
      </div>

      <EgresoForm
        patientId={id}
        egresoExistente={egreso}
        readOnly={egreso.firmado}
      />
    </div>
  );
}
