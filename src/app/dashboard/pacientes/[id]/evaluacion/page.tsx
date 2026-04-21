import type React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getPatientById } from "@/app/actions/patients";
import { getEvaluaciones } from "@/app/actions/evaluacion";
import { getTimelineClinico } from "@/app/actions/timeline";
import { EvaluacionTimeline } from "@/components/modules/EvaluacionTimeline";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KinesiologiaEval } from "@/components/modules/KinesiologiaEval";
import { FonoaudiologiaEval } from "@/components/modules/FonoaudiologiaEval";
import { MasoterapiaEval } from "@/components/modules/MasoterapiaEval";
import { GenericEval } from "@/components/modules/GenericEval";
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

// ── EVAL_COMPONENTS map ────────────────────────────────────────────────────

type EvalComponentProps = {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
  especialidad: string;
};

const EVAL_COMPONENTS: Partial<Record<EspecialidadCodigo, React.ComponentType<EvalComponentProps>>> = {
  "Kinesiología": KinesiologiaEval as React.ComponentType<EvalComponentProps>,
  "Fonoaudiología": FonoaudiologiaEval as React.ComponentType<EvalComponentProps>,
  "Masoterapia": MasoterapiaEval as React.ComponentType<EvalComponentProps>,
};

export default async function EvaluacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esp?: string }>;
}) {
  const { id } = await params;
  const { esp } = await searchParams;

  // Obtener sesión
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Fetch config de clínica y id_clinica en paralelo
  const [sessionResult, adminRes] = await Promise.all([
    getClinicaConfigFromSession(),
    supabase.from("admin_users").select("id_clinica, rol").eq("auth_id", user.id).single(),
  ]);

  const { config } = sessionResult;
  if (!config) notFound();
  requireModule(config, "M3_evaluacion");

  const idClinica = adminRes.data?.id_clinica ?? undefined;

  // Usar getProfesionalActivo — maneja correctamente el caso 1 auth_id → N profesionales
  const profesionalActivo = await getProfesionalActivo(supabase, user.id, idClinica);
  const rawEspecialidad = profesionalActivo?.especialidad ?? null;

  // Si rawEspecialidad es null: usuario es admin puro (sin perfil en profesionales)
  const isAdminUser = rawEspecialidad === null || rawEspecialidad === "Administración Clínica";
  // DB guarda el codigo exacto con tilde — usarlo directamente como EspecialidadCodigo.
  const profEspecialidad: EspecialidadCodigo | null = isAdminUser
    ? null
    : (rawEspecialidad as EspecialidadCodigo);

  // Tabs dinámicas desde config.especialidadesActivas (filtra Administración Clínica)
  const especialidadesTabs = config.especialidadesActivas
    .filter((codigo) => codigo !== "Administración Clínica")
    .map((codigo) => ({
      key: codigo,
      label: ESPECIALIDADES_REGISTRY[codigo]?.label ?? codigo,
    }));

  // Determinar tab activa (default: especialidad del profesional, o primera tab si admin puro)
  const validEsp = especialidadesTabs.map((t) => t.key as EspecialidadCodigo);
  const defaultEsp: EspecialidadCodigo =
    profEspecialidad ?? (especialidadesTabs[0]?.key ?? "Kinesiología");
  const activeEsp: EspecialidadCodigo = validEsp.includes(esp as EspecialidadCodigo)
    ? (esp as EspecialidadCodigo)
    : defaultEsp;

  // Fetch data en paralelo
  const [patientResult, evalResult, timelineResult] = await Promise.all([
    getPatientById(id),
    getEvaluaciones(id),
    idClinica ? getTimelineClinico(id, idClinica) : Promise.resolve(null),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const allEvals = evalResult.success ? evalResult.data : [];
  const timelineEntries = timelineResult?.success ? timelineResult.data : [];

  const evalsByEsp = (esp: string): Evaluation[] =>
    allEvals.filter((e) => e.especialidad === esp);

  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(p.fecha_nacimiento);
  const EvalComponent = EVAL_COMPONENTS[activeEsp] ?? GenericEval;

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
            {isAdminUser
              ? "Acceso completo — Admin"
              : `${profEspecialidad ? (ESPECIALIDADES_REGISTRY[profEspecialidad]?.label ?? profEspecialidad) : ""} — edición activa`}
          </Badge>
        </div>
      </div>

      {/* Clinical timeline */}
      <EvaluacionTimeline
        entries={timelineEntries}
        especialidadesActivas={config.especialidadesActivas}
      />

      {/* Section separator */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-kp-border" />
        <span className="text-xs font-semibold text-ink-3 uppercase tracking-widest">
          Tu evaluación
        </span>
        <div className="h-px flex-1 bg-kp-border" />
      </div>

      {/* Especialidad tabs */}
      <div className="flex gap-2 border-b border-kp-border pb-0">
        {especialidadesTabs.map((tab) => {
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
        <EvalComponent
          patientId={id}
          evaluaciones={evalsByEsp(activeEsp)}
          readOnly={!isAdminUser && profEspecialidad !== activeEsp}
          especialidad={activeEsp}
        />
      </Card>
    </div>
  );
}
