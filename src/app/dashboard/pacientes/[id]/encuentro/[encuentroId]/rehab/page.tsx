import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PatientHeader } from "@/components/layout/PatientHeader";
import {
  SoapForm,
  KinesiologiaEval,
  FonoaudiologiaEval,
  MasoterapiaEval,
  GenericEval,
} from "@/components/rehab";
import { getPatientById } from "@/app/actions/patients";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { SoapNote } from "@/types";
import type { Evaluation } from "@/types";

export default async function RehabPage({
  params,
}: {
  params: Promise<{ id: string; encuentroId: string }>;
}) {
  const { id, encuentroId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const adminRes = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const idClinica = adminRes.data?.id_clinica ?? null;
  const rol = adminRes.data?.rol ?? "";

  const [patientResult, encuentroRes, soapRes, evaluacionesRes] =
    await Promise.all([
      getPatientById(id),
      supabase
        .from("fce_encuentros")
        .select("id, especialidad, status")
        .eq("id", encuentroId)
        .eq("id_paciente", id)
        .single(),
      supabase
        .from("fce_notas_soap")
        .select("*")
        .eq("id_encuentro", encuentroId)
        .maybeSingle(),
      supabase
        .from("fce_evaluaciones")
        .select("*")
        .eq("id_paciente", id)
        .order("created_at", { ascending: false }),
      getProfesionalActivo(supabase, user.id, idClinica ?? undefined),
    ]);

  if (!patientResult.success || encuentroRes.error || !encuentroRes.data)
    notFound();

  const patient = patientResult.data;
  const encuentro = encuentroRes.data;
  const soapNote = (soapRes.data as SoapNote | null) ?? null;
  const evaluaciones = (evaluacionesRes.data ?? []) as Evaluation[];

  // Permisos
  const isAdmin = ["admin", "director", "superadmin"].includes(rol);
  const isProfesional = rol === "profesional";
  const canWrite = isAdmin || isProfesional;
  if (!canWrite) notFound();

  const encuentroFinalizado = encuentro.status === "finalizado";
  const readOnly = encuentroFinalizado || (soapNote?.firmado ?? false);

  // Eval component por especialidad
  const especialidad = encuentro.especialidad as string;

  function renderEval() {
    if (especialidad === "Kinesiología") {
      return (
        <KinesiologiaEval
          patientId={id}
          evaluaciones={evaluaciones}
          readOnly={readOnly}
        />
      );
    }
    if (especialidad === "Fonoaudiología") {
      return (
        <FonoaudiologiaEval
          patientId={id}
          evaluaciones={evaluaciones}
          readOnly={readOnly}
        />
      );
    }
    if (especialidad === "Masoterapia") {
      return (
        <MasoterapiaEval
          patientId={id}
          evaluaciones={evaluaciones}
          readOnly={readOnly}
        />
      );
    }
    return (
      <GenericEval
        patientId={id}
        evaluaciones={evaluaciones}
        readOnly={readOnly}
        especialidad={especialidad}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} hasConsent={false} patientId={id} />

      {/* Workspace */}
      <div className="rounded-xl border border-kp-border bg-surface-1">
        {/* Header del workspace */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-kp-border">
          <div>
            <p className="text-xs font-semibold text-kp-accent uppercase tracking-wide">
              Modelo Rehabilitación
            </p>
            <h1 className="text-base font-semibold text-ink-1 mt-0.5">
              Nota clínica — {encuentro.especialidad}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {encuentroFinalizado ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-medium">
                Encuentro cerrado
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                En progreso
              </span>
            )}
          </div>
        </div>

        {/* Two-column workspace: 2/3 SOAP + 1/3 Evaluación */}
        <div className="flex flex-col lg:flex-row">
          {/* Left: SoapForm (includes CIF internally in the A quadrant) */}
          <div className="flex-1 p-6 lg:border-r border-kp-border">
            <SoapForm
              patientId={id}
              initialNote={soapNote}
              readOnly={readOnly}
            />
          </div>

          {/* Right: Eval component based on speciality */}
          <div className="w-full lg:w-96 p-6 bg-surface-0">
            {renderEval()}
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
