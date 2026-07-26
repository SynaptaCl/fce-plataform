import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { DentalWorkspace } from "@/components/dental/DentalWorkspace";
import { getPatientById } from "@/app/actions/patients";
import { getNotaClinica } from "@/app/actions/clinico/nota-clinica";
import { getModeloDeEspecialidad } from "@/lib/modules/modelos";
import { getPlanActivo } from "@/app/actions/dental/plan-tratamiento";
import { getProcedimientosCatalogo } from "@/app/actions/dental/procedimientos";
import { getPeriograma } from "@/app/actions/dental/periograma";
import { getOdontograma } from "@/app/actions/dental/odontograma";
import { AlertBanner } from "@/components/ui/AlertBanner";

function calcularDenticion(fechaNacimiento: string | null): "adulto" | "nino" | "mixta" {
  if (!fechaNacimiento) return "adulto";
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const diff = new Date(hoy).getTime() - new Date(fechaNacimiento).getTime();
  const años = diff / (1000 * 60 * 60 * 24 * 365.25);
  if (años < 6) return "nino";
  if (años <= 12) return "mixta";
  return "adulto";
}

export default async function DentalPage({
  params,
}: {
  params: Promise<{ id: string; encuentroId: string }>;
}) {
  const { id, encuentroId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const adminRes = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const rol = adminRes.data?.rol ?? "";
  const idClinica = adminRes.data?.id_clinica ?? "";
  const canAccess = ["superadmin", "director", "admin", "profesional"].includes(rol);
  if (!canAccess) redirect("/dashboard");

  const [patientResult, encuentroRes, notaResult, periogramaResult, planResult, catalogoResult, piezasResult] =
    await Promise.all([
      getPatientById(id),
      supabase
        .from("fce_encuentros")
        .select("id, especialidad, status")
        .eq("id", encuentroId)
        .eq("id_paciente", id)
        .single(),
      getNotaClinica(encuentroId),
      getPeriograma(encuentroId),
      getPlanActivo(id),
      getProcedimientosCatalogo(),
      getOdontograma(id),
    ]);

  if (!patientResult.success || encuentroRes.error || !encuentroRes.data) notFound();

  const encuentro = encuentroRes.data;

  // Guardia de modelo: solo Odontología llega aquí
  if (getModeloDeEspecialidad(encuentro.especialidad) !== "odontologico") notFound();

  const patient = patientResult.data;
  const nota = notaResult.success ? notaResult.data : null;
  const periograma = periogramaResult.success ? periogramaResult.data : null;
  const planInicial = planResult.success ? planResult.data : null;
  const catalogo = catalogoResult.success ? catalogoResult.data : [];
  const piezasIniciales = piezasResult.success ? piezasResult.data : [];
  // No colapsar un fallo de consulta al mismo estado vacío que "sin registro dental aún" —
  // en este workspace un falso "vacío" puede llevar a sobrescribir un odontograma/plan existente.
  const hasLoadFailures =
    !notaResult.success ||
    !periogramaResult.success ||
    !planResult.success ||
    !piezasResult.success;
  const encuentroFinalizado = encuentro.status === "finalizado";
  const readOnly = encuentroFinalizado || (nota?.firmado ?? false);
  const denticionInicial = calcularDenticion(patient.fecha_nacimiento ?? null);

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} hasConsent={false} patientId={id} />

      {hasLoadFailures && (
        <AlertBanner variant="danger" title="No se pudo cargar todo el registro dental">
          Falló la carga de una o más secciones (nota, periograma, plan de tratamiento u
          odontograma). No asumas que están vacías — recarga antes de continuar para evitar
          sobrescribir información existente.
        </AlertBanner>
      )}

      <DentalWorkspace
        paciente={patient}
        encuentroId={encuentroId}
        especialidad={encuentro.especialidad}
        idClinica={idClinica}
        notaExistente={nota}
        periogramaExistente={periograma}
        planInicial={planInicial}
        catalogo={catalogo}
        piezasIniciales={piezasIniciales}
        denticionInicial={denticionInicial}
        encuentroFinalizado={encuentroFinalizado}
        readOnly={readOnly}
      />

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
