"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/modules/guards";
import type { Patient } from "@/types";
import type { FichaClinicaData, AdendaPdfRow } from "@/lib/ficha-clinica/pdf-renderer";
import type { OdontogramaEntry } from "@/types/odontograma";
import type { Periograma } from "@/types/periograma";
import type { PlanTratamiento, PlanTratamientoItem } from "@/types/plan-tratamiento";

function buildDentalData(
  odontogramaRes: { data: unknown },
  periogramaRes: { data: unknown },
  planTratamientoRes: { data: unknown }
): FichaClinicaData["dental"] {
  const odontograma = (odontogramaRes.data as OdontogramaEntry[] | null) ?? [];
  const periograma = (periogramaRes.data as Periograma[] | null) ?? [];
  const planTratamiento =
    (planTratamientoRes.data as Array<PlanTratamiento & { items: PlanTratamientoItem[] }> | null) ?? [];

  if (odontograma.length === 0 && periograma.length === 0 && planTratamiento.length === 0) {
    return null;
  }

  return {
    odontograma,
    periograma,
    planTratamiento: planTratamiento.map((p) => ({
      ...p,
      items: (p.items ?? []).sort((a, b) => a.orden - b.orden),
    })),
  };
}

/**
 * Compila la ficha clínica electrónica completa del paciente (Decreto 41 / Ley 20.584):
 * identificación, anamnesis, encuentros, signos vitales, evoluciones SOAP, notas clínicas,
 * evaluaciones, instrumentos, consentimientos, prescripciones, órdenes de examen,
 * plan de intervención y egreso.
 *
 * Se invoca solo cuando el usuario hace clic en "Descargar ficha completa (PDF)" —
 * el audit log registra cada exportación.
 */
export async function exportarFichaCompletaPdf(
  idPaciente: string
): Promise<ActionResult<FichaClinicaData>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const adminRes = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .maybeSingle();
  const idClinica = adminRes.data?.id_clinica ?? null;
  if (!idClinica) {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  // Paciente con guard de tenant — el resto de las queries hereda este guard
  const pacienteRes = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", idPaciente)
    .eq("id_clinica", idClinica)
    .single();
  if (pacienteRes.error || !pacienteRes.data) {
    return { success: false, error: "Paciente no encontrado" };
  }

  const [
    anamnesisRes,
    encuentrosRes,
    signosVitalesRes,
    notasSoapRes,
    notasClinicasRes,
    evaluacionesRes,
    instrumentosRes,
    consentimientosRes,
    prescripcionesRes,
    ordenesExamenRes,
    planesRes,
    egresoRes,
    clinicaRes,
    adendasRes,
    odontogramaRes,
    periogramaRes,
    planTratamientoRes,
  ] = await Promise.all([
    supabase
      .from("fce_anamnesis")
      .select(
        "motivo_consulta, antecedentes_medicos, antecedentes_quirurgicos, farmacologia, alergias, red_flags, habitos"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .maybeSingle(),
    supabase
      .from("fce_encuentros")
      .select("id, especialidad, status, started_at, profesional:profesionales(nombre)")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("started_at", { ascending: true }),
    // fce_signos_vitales tiene id_clinica (migration 20260415024540) — filtro defense-in-depth
    supabase
      .from("fce_signos_vitales")
      .select(
        "recorded_at, presion_arterial, frecuencia_cardiaca, spo2, temperatura, frecuencia_respiratoria"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("fce_notas_soap")
      .select(
        "id, subjetivo, objetivo, analisis_cif, plan, intervenciones, tareas_domiciliarias, firmado_at, created_at, encuentro:fce_encuentros(especialidad, started_at)"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("fce_notas_clinicas")
      .select(
        "id, id_encuentro, motivo_consulta, contenido, diagnostico, icd_codigos, icd_version, plan, secciones_estructuradas, firmado_at, created_at, encuentro:fce_encuentros(especialidad, started_at)"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("fce_evaluaciones")
      .select("id, especialidad, sub_area, data, created_at")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("created_at", { ascending: true }),
    supabase
      .from("instrumentos_aplicados")
      .select(
        "id, puntaje_total, interpretacion, notas, aplicado_at, instrumento:instrumentos_valoracion(nombre)"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("aplicado_at", { ascending: true }),
    supabase
      .from("fce_consentimientos")
      .select("id, tipo, firmado_at")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("firmado_at", { ascending: true }),
    supabase
      .from("fce_prescripciones")
      .select(
        "id, folio_display, tipo, medicamentos, indicaciones_generales, diagnostico_asociado, firmado_at, prof_nombre_snapshot"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("firmado_at", { ascending: true }),
    supabase
      .from("fce_ordenes_examen")
      .select(
        "id, folio_display, examenes, diagnostico_presuntivo, prioridad, firmado_at, prof_nombre_snapshot"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("firmado_at", { ascending: true }),
    supabase
      .from("fce_planes_intervencion")
      .select(
        "id, titulo, diagnostico, estado, objetivos:fce_plan_objetivos(dominio_label, descripcion, criterio_logro, nivel_actual, orden)"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("created_at", { ascending: true }),
    supabase
      .from("fce_egresos")
      .select(
        "tipo_egreso, diagnostico_egreso, resumen_tratamiento, estado_al_egreso, indicaciones_post_egreso, derivacion_a, firmado_at"
      )
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("firmado_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("clinicas").select("nombre, config").eq("id", idClinica).single(),
    supabase
      .from("fce_adendas")
      .select("id_documento, tipo_adenda, motivo, contenido, override_director, override_motivo, created_at, created_by")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("created_at", { ascending: true }),
    supabase
      .from("fce_odontograma")
      .select("id, id_clinica, id_paciente, pieza, estado, superficies, movilidad, notas, updated_by, updated_at, created_at")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("pieza", { ascending: true }),
    supabase
      .from("fce_periograma")
      .select("id, id_clinica, id_paciente, id_encuentro, datos, indice_sangrado, profundidad_media, sitios_patologicos, diagnostico_icd, notas, firmado, firmado_at, firmado_por, registrado_por, created_at, updated_at")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("fce_plan_tratamiento")
      .select("*, items:fce_plan_tratamiento_items(*)")
      .eq("id_paciente", idPaciente)
      .eq("id_clinica", idClinica)
      .order("created_at", { ascending: true }),
  ]);

  // Audit obligatorio en exportación de ficha clínica
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "exportar_ficha_clinica",
    tipoEvento: "export_pdf",
    tablaAfectada: "pacientes",
    registroId: idPaciente,
    idClinica: idClinica,
    idPaciente: idPaciente,
  });

  // ── Construir mapa de adendas por id_documento ────────────────────────────
  const adendasRaw = adendasRes.data ?? [];
  const adendasMap: Record<string, AdendaPdfRow[]> = {};

  if (adendasRaw.length > 0) {
    const uniqueCreatedBy = [...new Set(adendasRaw.map((a) => a.created_by as string))];
    const { data: profs } = await supabase
      .from("profesionales")
      .select("id, nombre")
      .in("id", uniqueCreatedBy);
    const profMap = new Map<string, string>(
      (profs ?? []).map((p) => [p.id as string, p.nombre as string])
    );
    for (const a of adendasRaw) {
      const docId = a.id_documento as string;
      if (!adendasMap[docId]) adendasMap[docId] = [];
      adendasMap[docId].push({
        tipo_adenda: a.tipo_adenda as string,
        motivo: a.motivo as string,
        contenido: a.contenido as string,
        override_director: a.override_director as boolean,
        override_motivo: (a.override_motivo as string | null) ?? null,
        created_at: a.created_at as string,
        autorNombre: profMap.get(a.created_by as string) ?? "Profesional",
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clinicaRow = clinicaRes.data as any;
  const branding = clinicaRow?.config?.branding ?? null;
  const sucursal = clinicaRow?.config?.sucursales?.[0] ?? null;

  const generadoEl = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = <T>(res: { data: unknown }): T[] => (res.data as T[] | null) ?? [];

  // ── AMB-1/Copiloto — inferir "asistida por IA" desde logs_auditoria ───────
  // fce_notas_clinicas no tiene columna que lo marque; ia_copiloto/ia_ambient
  // se auditan con registro_id = id_encuentro (ver copiloto-nota.ts / generar-nota.ts),
  // no id de la nota — por eso el join es por encuentro, no por nota.
  const notasClinicasRaw = rows<
    FichaClinicaData["notasClinicas"][number] & { id_encuentro: string }
  >(notasClinicasRes);
  const encuentroIdsConNota = [...new Set(notasClinicasRaw.map((n) => n.id_encuentro))];
  let encuentrosConIA = new Set<string>();
  if (encuentroIdsConNota.length > 0) {
    const { data: auditRows } = await supabase
      .from("logs_auditoria")
      .select("registro_id")
      .eq("id_clinica", idClinica)
      .eq("tabla_afectada", "fce_notas_clinicas")
      .in("tipo_evento", ["ia_copiloto", "ia_ambient"])
      .in("registro_id", encuentroIdsConNota);
    encuentrosConIA = new Set((auditRows ?? []).map((r) => r.registro_id as string));
  }
  const notasClinicasConIA = notasClinicasRaw.map((n) => ({
    ...n,
    asistidoPorIA: encuentrosConIA.has(n.id_encuentro),
  }));

  const data: FichaClinicaData = {
    generadoEl,
    clinica: {
      nombre: clinicaRow?.nombre ?? branding?.clinic_short_name ?? "Establecimiento de Salud",
      logo_url: branding?.logo_url ?? null,
      iniciales: branding?.clinic_initials ?? null,
      direccion: typeof sucursal?.direccion === "string" ? sucursal.direccion : null,
    },
    paciente: pacienteRes.data as Patient,
    anamnesis: anamnesisRes.data ?? null,
    encuentros: rows<FichaClinicaData["encuentros"][number]>(encuentrosRes),
    signosVitales: rows<FichaClinicaData["signosVitales"][number]>(signosVitalesRes),
    notasSoap: rows<FichaClinicaData["notasSoap"][number]>(notasSoapRes),
    notasClinicas: notasClinicasConIA,
    evaluaciones: rows<FichaClinicaData["evaluaciones"][number]>(evaluacionesRes),
    instrumentos: rows<FichaClinicaData["instrumentos"][number]>(instrumentosRes),
    consentimientos: rows<FichaClinicaData["consentimientos"][number]>(consentimientosRes),
    prescripciones: rows<FichaClinicaData["prescripciones"][number]>(prescripcionesRes),
    ordenesExamen: rows<FichaClinicaData["ordenesExamen"][number]>(ordenesExamenRes),
    planesIntervencion: rows<FichaClinicaData["planesIntervencion"][number]>(planesRes).map(
      (p) => ({
        ...p,
        objetivos: [...(p.objetivos ?? [])].sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0)
        ),
      })
    ),
    egreso: (egresoRes.data as FichaClinicaData["egreso"]) ?? null,
    adendas: adendasMap,
    dental: buildDentalData(odontogramaRes, periogramaRes, planTratamientoRes),
  };

  return { success: true, data };
}
