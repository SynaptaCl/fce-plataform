import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getPatientTimeline } from "@/app/actions/timeline";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { PatientActionNav } from "@/components/modules/PatientActionNav";
import { ClinicalTimeline } from "@/components/modules/ClinicalTimeline";
import { SummaryPanel } from "@/components/shared/SummaryPanel";
import { EncuentroLauncher } from "@/components/shared/EncuentroLauncher";
import { ReingresoBanner } from "@/components/shared/ReingresoBanner";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getEgresosByPaciente } from "@/app/actions/egresos";
import { ResumenIAButton } from "@/components/modules/ResumenIA";
import type { PatientSummary } from "@/app/actions/timeline";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Paciente" };
  const p = result.data;
  const fullName = [p.nombre, p.apellido_paterno, p.apellido_materno]
    .filter(Boolean)
    .join(" ");
  return { title: fullName || "Paciente" };
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ── Auth ───────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // ── id_clinica del usuario (para config) ──────────────────────────────
  const adminRes = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const idClinica = adminRes.data?.id_clinica ?? null;
  const rol = adminRes.data?.rol ?? "";
  const isAdmin = ["admin", "director", "superadmin"].includes(rol);

  // ── Fetch paralelo ─────────────────────────────────────────────────────
  const [patientResult, timelineResult, consentResult, fceConfigRes, profesional, egresosResult] =
    await Promise.all([
      getPatientById(id),
      getPatientTimeline(id),
      supabase
        .from("fce_consentimientos")
        .select("id", { count: "exact", head: true })
        .eq("id_paciente", id)
        .eq("firmado", true),
      idClinica
        ? supabase
            .from("clinicas_fce_config")
            .select("especialidades_activas")
            .eq("id_clinica", idClinica)
            .single()
        : Promise.resolve({ data: null }),
      getProfesionalActivo(supabase, user.id, idClinica ?? undefined),
      getEgresosByPaciente(id),
    ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const hasConsent = (consentResult.count ?? 0) > 0;
  const especialidadesActivas: string[] =
    fceConfigRes.data?.especialidades_activas ?? [];
  const especialidadProfesional = rol === "profesional" ? (profesional?.especialidad ?? null) : null;

  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";

  const entries = timelineResult.success ? timelineResult.data.entries : [];
  const egresos = egresosResult.success ? egresosResult.data : [];
  const egresosFirmados = egresos.filter((e) => e.firmado);

  const emptySummary: PatientSummary = {
    motivo_consulta: null,
    red_flags_activos: [],
    cif_activos: 0,
    diagnosticos_recientes: [],
    plan_actual: null,
    proxima_sesion: null,
    vitales: null,
    indicaciones_farmacologicas: [],
    antecedentes: null,
  };
  const summary = timelineResult.success
    ? timelineResult.data.summary
    : emptySummary;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href="/dashboard/pacientes"
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Pacientes
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium truncate">{fullName}</span>
      </div>

      {/* PatientHeader — banner M1 */}
      <PatientHeader
        patient={p}
        hasConsent={hasConsent}
        patientId={id}
        primaryAction={
          especialidadProfesional && p.estado_clinico !== "egresado" ? (
            <EncuentroLauncher patientId={id} especialidad={especialidadProfesional} />
          ) : undefined
        }
      />

      {/* Banner de egreso — si el paciente está egresado */}
      {p.estado_clinico === "egresado" && (
        <ReingresoBanner
          patientId={id}
          egresoFirmadoAt={egresosFirmados[0]?.firmado_at ?? null}
          tipoEgreso={egresosFirmados[0]?.tipo_egreso ?? null}
        />
      )}

      {/*
        Grid 3 columnas:
          xl  (≥1280px): [220px  |  1fr  |  280px]
          lg  (≥1024px): [200px  |  1fr]            — panel resumen oculto
          <lg (mobile):  [1col stacked]
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr_280px] gap-4 items-start">

        {/* ── Columna 1: Nav de acciones ── */}
        <div className="lg:sticky lg:top-4 self-start">
          <PatientActionNav
            patientId={id}
            isAdmin={isAdmin}
            resumenIA={
              idClinica && !["recepcionista", "recepcion"].includes(rol) ? (
                <ResumenIAButton idPaciente={id} idClinica={idClinica} />
              ) : undefined
            }
          />
        </div>

        {/* ── Columna 2: Timeline clínico ── */}
        <div id="clinical-timeline" className="min-w-0">
          <ClinicalTimeline
            entries={entries}
            currentUserId={user.id}
            patientId={id}
            especialidadesActivas={especialidadesActivas}
          />
        </div>

        {/* ── Columna 3: Panel resumen (mobile+md: bajo timeline; lg: oculto; xl: col 3) ── */}
        <div className="lg:hidden xl:block xl:sticky xl:top-4 self-start">
          <SummaryPanel summary={summary} patientId={id} especialidadesActivas={especialidadesActivas} />
        </div>

      </div>
    </div>
  );
}
