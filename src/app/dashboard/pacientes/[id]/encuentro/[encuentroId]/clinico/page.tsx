import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { NotaClinicaForm } from "@/components/clinico/NotaClinicaForm";
import { InstrumentosPanel } from "@/components/clinico/InstrumentosPanel";
import { getPatientById } from "@/app/actions/patients";
import { getNotaClinica } from "@/app/actions/clinico/nota-clinica";
import { getProfesionalActivo } from "@/lib/fce/profesional";

export default async function ClinicoPage({
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

  const idClinica = adminRes.data?.id_clinica ?? null;
  const rol = adminRes.data?.rol ?? "";

  const [patientResult, encuentroRes, notaResult] = await Promise.all([
    getPatientById(id),
    supabase
      .from("fce_encuentros")
      .select("id, especialidad, status")
      .eq("id", encuentroId)
      .eq("id_paciente", id)
      .single(),
    getNotaClinica(encuentroId),
    getProfesionalActivo(supabase, user.id, idClinica ?? undefined),
  ]);

  if (!patientResult.success || encuentroRes.error || !encuentroRes.data) notFound();

  const patient = patientResult.data;
  const encuentro = encuentroRes.data;
  const nota = notaResult.success ? notaResult.data : null;

  // Permisos: admin/director/superadmin pueden ver siempre; profesional solo si es su encuentro
  const isAdmin = ["admin", "director", "superadmin"].includes(rol);
  const isProfesional = rol === "profesional";

  // Solo mostrar formulario si el encuentro está en progreso o es readOnly (finalizado)
  const encuentroFinalizado = encuentro.status === "finalizado";
  const readOnly = encuentroFinalizado || (nota?.firmado ?? false);

  // Profesional sin nota firmada y encuentro finalizado → readOnly
  // Profesional sin nota → puede crear (si encuentro en_progreso)
  const canWrite = isAdmin || isProfesional;

  if (!canWrite) notFound();

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} hasConsent={false} patientId={id} />

      {/* Workspace */}
      <div className="rounded-xl border border-kp-border bg-surface-1">
        {/* Header del workspace */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-kp-border">
          <div>
            <p className="text-xs font-semibold text-kp-accent uppercase tracking-wide">
              Modelo Clínico General
            </p>
            <h1 className="text-base font-semibold text-ink-1 mt-0.5">
              Nota clínica — {encuentro.especialidad}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {encuentroFinalizado && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-medium">
                Encuentro cerrado
              </span>
            )}
            {!encuentroFinalizado && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                En progreso
              </span>
            )}
          </div>
        </div>

        {/* Workspace: 2/3 nota + 1/3 instrumentos */}
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-6 lg:border-r border-kp-border">
            <NotaClinicaForm
              encuentroId={encuentroId}
              patientId={id}
              notaExistente={nota}
              readOnly={readOnly}
            />
          </div>
          <div className="w-full lg:w-80 xl:w-96 p-6 bg-surface-0">
            <InstrumentosPanel
              encuentroId={encuentroId}
              patientId={id}
              especialidad={encuentro.especialidad}
              encuentroFinalizado={encuentroFinalizado}
            />
          </div>
        </div>
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
