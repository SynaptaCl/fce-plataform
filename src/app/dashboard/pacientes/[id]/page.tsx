import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getPatientTimeline } from "@/app/actions/timeline";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { ActionBar } from "@/components/shared/ActionBar";
import { ClinicalTimeline } from "@/components/modules/ClinicalTimeline";
import { SummaryPanel } from "@/components/shared/SummaryPanel";
import { EncuentroLauncher } from "@/components/shared/EncuentroLauncher";
import { EgresoLauncher } from "@/components/shared/EgresoLauncher";
import { ReingresoBanner } from "@/components/shared/ReingresoBanner";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getEgresosByPaciente } from "@/app/actions/egresos";
import { ResumenIAButton } from "@/components/modules/ResumenIA";
import { logAudit } from "@/lib/audit";
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
  try {
    return await _patientDetailPage(params);
  } catch (error) {
    // Re-throw Next.js navigation errors (redirect, notFound) without logging
    const digest = (error as { digest?: string })?.digest ?? "";
    if (digest.startsWith("NEXT_")) throw error;
    console.error(
      "[FCE_DEBUG] PatientDetailPage error:",
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : ""
    );
    throw error;
  }
}

async function _patientDetailPage(
  params: Promise<{ id: string }>
) {
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

  void logAudit({
    supabase,
    actorId: user.id,
    accion: "ver_ficha_paciente",
    tipoEvento: "read_ficha",
    tablaAfectada: "pacientes",
    registroId: id,
    idClinica,
    idPaciente: id,
  });

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
    plan_activo: null,
  };
  const summary = timelineResult.success
    ? timelineResult.data.summary
    : emptySummary;

  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3 px-5 py-3">
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

      {/* PatientHeader — compact single line */}
      <PatientHeader patient={p} hasConsent={hasConsent} patientId={id} />

      {/* ActionBar — horizontal chips */}
      <ActionBar patientId={id} />

      {/* Below-header alerts and launchers */}
      <div className="space-y-3 px-5 pt-4">
        {/* Banner de egreso — si el paciente está egresado */}
        {p.estado_clinico === "egresado" && (
          <ReingresoBanner
            patientId={id}
            egresoFirmadoAt={egresosFirmados[0]?.firmado_at ?? null}
            tipoEgreso={egresosFirmados[0]?.tipo_egreso ?? null}
          />
        )}

        {/* Iniciar atención — solo para profesionales con especialidad activa y paciente no egresado */}
        {especialidadProfesional && p.estado_clinico !== "egresado" && (
          <EncuentroLauncher patientId={id} especialidad={especialidadProfesional} />
        )}

        {/* Egresar paciente — para roles permitidos con M9 activo */}
        <EgresoLauncher
          patientId={id}
          estadoClinico={p.estado_clinico ?? "activo"}
          rol={rol}
        />

        {/*
          Grid 2 columnas:
            xl  (≥1280px): [1fr  |  280px]
            <xl (mobile):  [1col stacked]
        */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">

          {/* ── Columna 1: Timeline clínico ── */}
          <div id="clinical-timeline" className="min-w-0">
            <ClinicalTimeline
              entries={entries}
              currentUserId={profesional?.id ?? ""}
              patientId={id}
              especialidadesActivas={especialidadesActivas}
              rolActual={rol}
            />
          </div>

          {/* ── Columna 2: Panel resumen — oculto en viewports < xl ── */}
          <div className="hidden xl:block xl:sticky xl:top-4 self-start">
            <SummaryPanel
              summary={summary}
              patientId={id}
              especialidadesActivas={especialidadesActivas}
              resumenIASlot={
                idClinica && !["recepcionista", "recepcion"].includes(rol)
                  ? <ResumenIAButton idPaciente={id} idClinica={idClinica} />
                  : undefined
              }
            />
          </div>

        </div>
      </div>
    </div>
  );
}
