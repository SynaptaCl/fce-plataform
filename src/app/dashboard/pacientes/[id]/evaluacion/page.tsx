import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getPatientById } from "@/app/actions/patients";
import { getEvaluaciones } from "@/app/actions/evaluacion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KinesiologiaEval } from "@/components/modules/KinesiologiaEval";
import { FonoaudiologiaEval } from "@/components/modules/FonoaudiologiaEval";
import { MasoterapiaEval } from "@/components/modules/MasoterapiaEval";
import { calculateAge, formatRut } from "@/lib/utils";
import { ESPECIALIDADES_REGISTRY } from "@/lib/modules/registry";
import type { EspecialidadCodigo } from "@/lib/modules/registry";
import type { Evaluation } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Evaluación" };
  const p = result.data;
  return { title: `Evaluación — ${p.apellido_paterno} ${p.nombre}` };
}

// ── Especialidad tabs ──────────────────────────────────────────────────────

const ESPECIALIDAD_TABS: { key: EspecialidadCodigo; label: string }[] = [
  { key: "Kinesiología", label: "Kinesiología" },
  { key: "Fonoaudiología", label: "Fonoaudiología" },
  { key: "Masoterapia", label: "Masoterapia" },
];

export default async function EvaluacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esp?: string }>;
}) {
  const { id } = await params;
  const { esp } = await searchParams;

  const { config } = await getClinicaConfigFromSession();
  requireModule(config, "M3_evaluacion");

  // Obtener sesión y especialidad del profesional
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profesional } = await supabase
    .from("profesionales")
    .select("especialidad")
    .eq("auth_id", user.id)
    .maybeSingle();

  const rawEspecialidad = profesional?.especialidad ?? "Kinesiología";
  const isAdminUser = rawEspecialidad === "Administración Clínica";
  // DB guarda el codigo exacto con tilde — usarlo directamente como EspecialidadCodigo.
  const profEspecialidad: EspecialidadCodigo = isAdminUser
    ? "Kinesiología"
    : (rawEspecialidad as EspecialidadCodigo);

  // Determinar tab activa (default: especialidad del profesional)
  const validEsp = ESPECIALIDAD_TABS.map((t) => t.key);
  const activeEsp: EspecialidadCodigo = validEsp.includes(esp as EspecialidadCodigo)
    ? (esp as EspecialidadCodigo)
    : profEspecialidad;

  // Fetch data en paralelo
  const [patientResult, evalResult] = await Promise.all([
    getPatientById(id),
    getEvaluaciones(id),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const allEvals = evalResult.success ? evalResult.data : [];

  const evalsByEsp = (esp: string): Evaluation[] =>
    allEvals.filter((e) => e.especialidad === esp);

  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">M3 · Evaluación</span>
      </div>

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
        <div className="ml-auto">
          <Badge variant="teal">
            {isAdminUser ? "Acceso completo — Admin" : `${ESPECIALIDADES_REGISTRY[profEspecialidad]?.label ?? profEspecialidad} — edición activa`}
          </Badge>
        </div>
      </div>

      {/* Especialidad tabs */}
      <div className="flex gap-2 border-b border-kp-border pb-0">
        {ESPECIALIDAD_TABS.map((tab) => {
          const hasData = allEvals.some((e) => e.especialidad === tab.key);
          const isActive = activeEsp === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/dashboard/pacientes/${id}/evaluacion?esp=${tab.key}`}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2 hover:border-kp-border",
              ].join(" ")}
            >
              {tab.label}
              {hasData && !isActive && (
                <span className="ml-1.5 text-[0.5rem] text-kp-accent">●</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Specialty panel */}
      <Card
        title={`${ESPECIALIDADES_REGISTRY[activeEsp]?.label ?? activeEsp}`}
        icon={<Stethoscope className="w-4 h-4" />}
      >
        {activeEsp === "Kinesiología" && (
          <KinesiologiaEval
            patientId={id}
            evaluaciones={evalsByEsp("Kinesiología")}
            readOnly={!isAdminUser && profEspecialidad !== "Kinesiología"}
          />
        )}
        {activeEsp === "Fonoaudiología" && (
          <FonoaudiologiaEval
            patientId={id}
            evaluaciones={evalsByEsp("Fonoaudiología")}
            readOnly={!isAdminUser && profEspecialidad !== "Fonoaudiología"}
          />
        )}
        {activeEsp === "Masoterapia" && (
          <MasoterapiaEval
            patientId={id}
            evaluaciones={evalsByEsp("Masoterapia")}
            readOnly={!isAdminUser && profEspecialidad !== "Masoterapia"}
          />
        )}
      </Card>
    </div>
  );
}
