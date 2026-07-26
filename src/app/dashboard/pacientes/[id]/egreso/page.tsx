import { notFound, redirect } from "next/navigation";
import { requireModuloEgresos } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getEgresosByPaciente } from "@/app/actions/egresos";
import { getPatientById } from "@/app/actions/patients";
import { EgresoForm } from "@/components/shared/EgresoForm";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default async function EgresoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { config, userId } = await getClinicaConfigFromSession();
  if (!userId) redirect("/login");

  requireModuloEgresos(config);

  const [patientResult, egresoResult] = await Promise.all([
    getPatientById(id),
    getEgresosByPaciente(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Paciente";

  // Find unsigned egreso to edit (if any)
  const egresos = egresoResult.success ? egresoResult.data : [];
  const egresoActivo = egresos.find((e) => !e.firmado) ?? null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-ink-1">Egreso de {fullName}</h1>
        <p className="text-sm text-ink-3 mt-1">
          {egresoActivo
            ? "Completar y firmar el egreso"
            : "Nuevo egreso clínico"}
        </p>
      </div>

      {!egresoResult.success && (
        <AlertBanner variant="danger" title="No se pudo verificar el estado de egreso">
          No se pudo consultar si ya existe un egreso en curso para este paciente — no asumas
          que no lo hay. Recarga la página antes de continuar para evitar registros duplicados.
        </AlertBanner>
      )}

      <EgresoForm patientId={id} egresoExistente={egresoActivo} />
    </div>
  );
}
