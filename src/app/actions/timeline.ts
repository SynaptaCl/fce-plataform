"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import type { SoapNote, VitalSigns } from "@/types";
import type { Evaluation } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

export type TimelineEntryType = "soap" | "evaluacion" | "signos_vitales" | "consentimiento";

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  date: string;
  especialidad?: string;
  autor_id?: string;
  profesional_nombre?: string;
  titulo: string;
  resumen: string;
  firmado?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export interface PatientSummary {
  motivo_consulta: string | null;
  red_flags_activos: string[];
  cif_activos: number;
  plan_actual: string | null;
  proxima_sesion: string | null;
  vitales: VitalSigns | null;
}

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// ── getPatientTimeline ─────────────────────────────────────────────────────

export async function getPatientTimeline(
  patientId: string
): Promise<ActionResult<{ entries: TimelineEntry[]; summary: PatientSummary }>> {
  const { supabase } = await requireAuth();

  const [soapRes, evalRes, vitalsRes, consentRes, anamnesisRes] = await Promise.all([
    supabase
      .from("fce_notas_soap")
      .select("*")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_evaluaciones")
      .select("*")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_signos_vitales")
      .select("*")
      .eq("id_paciente", patientId)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("fce_consentimientos")
      .select("id, id_paciente, tipo, version, firmado, created_at")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_anamnesis")
      .select("motivo_consulta, red_flags")
      .eq("id_paciente", patientId)
      .maybeSingle(),
  ]);

  // Batch lookup de profesionales — solo columna 'nombre' (no existe 'apellidos')
  const profIds = new Set<string>();
  for (const s of soapRes.data ?? []) {
    if (s.firmado_por) profIds.add(s.firmado_por);
  }
  for (const e of evalRes.data ?? []) {
    if (e.created_by) profIds.add(e.created_by);
  }
  for (const v of vitalsRes.data ?? []) {
    if (v.recorded_by) profIds.add(v.recorded_by);
  }

  const profMap = new Map<string, string>();
  if (profIds.size > 0) {
    const { data: profs } = await supabase
      .from("profesionales")
      .select("id, nombre")
      .in("id", Array.from(profIds));
    for (const p of profs ?? []) {
      profMap.set(p.id, p.nombre ?? "Profesional");
    }
  }

  const entries: TimelineEntry[] = [];

  // SOAP notes
  for (const soap of (soapRes.data ?? []) as SoapNote[]) {
    const cifItems = [
      ...(soap.analisis_cif?.funciones ?? []),
      ...(soap.analisis_cif?.actividades ?? []),
      ...(soap.analisis_cif?.participacion ?? []),
      ...(soap.analisis_cif?.contexto ?? []),
    ];
    entries.push({
      id: soap.id,
      type: "soap",
      date: soap.created_at,
      autor_id: soap.firmado_por,
      profesional_nombre: soap.firmado_por ? profMap.get(soap.firmado_por) : undefined,
      titulo: "Nota SOAP",
      resumen: soap.subjetivo?.slice(0, 150) || "Sin descripción subjetiva",
      firmado: soap.firmado,
      data: {
        subjetivo: soap.subjetivo,
        objetivo: soap.objetivo,
        plan: soap.plan,
        proxima_sesion: soap.proxima_sesion,
        tareas_domiciliarias: soap.tareas_domiciliarias,
        intervenciones: soap.intervenciones ?? [],
        cif_count: cifItems.length,
        firmado_at: soap.firmado_at,
      },
    });
  }

  // Evaluaciones — especialidad viene como código exacto del catálogo desde DB
  for (const ev of (evalRes.data ?? []) as Evaluation[]) {
    const subAreaLabel = String(ev.sub_area ?? "").replace(/_/g, " ");
    entries.push({
      id: ev.id,
      type: "evaluacion",
      date: ev.created_at,
      especialidad: ev.especialidad,
      autor_id: ev.created_by,
      profesional_nombre: ev.created_by ? profMap.get(ev.created_by) : undefined,
      titulo: `Evaluación — ${ev.especialidad ?? "Sin especialidad"}`,
      resumen: subAreaLabel ? `Área: ${subAreaLabel}` : "Evaluación registrada",
      data: {
        especialidad: ev.especialidad,
        sub_area: ev.sub_area,
        contraindicaciones_certificadas: ev.contraindicaciones_certificadas,
      },
    });
  }

  // Signos vitales
  for (const vs of (vitalsRes.data ?? []) as VitalSigns[]) {
    entries.push({
      id: vs.id,
      type: "signos_vitales",
      date: vs.recorded_at,
      autor_id: vs.recorded_by,
      profesional_nombre: vs.recorded_by ? profMap.get(vs.recorded_by) : undefined,
      titulo: "Signos Vitales",
      resumen: `PA ${vs.presion_arterial ?? "—"} · FC ${vs.frecuencia_cardiaca ?? "—"} bpm · SpO₂ ${vs.spo2 ?? "—"}%`,
      data: {
        presion_arterial: vs.presion_arterial,
        frecuencia_cardiaca: vs.frecuencia_cardiaca,
        spo2: vs.spo2,
        temperatura: vs.temperatura,
        frecuencia_respiratoria: vs.frecuencia_respiratoria,
      },
    });
  }

  // Consentimientos
  for (const c of consentRes.data ?? []) {
    const tipo = String(c.tipo ?? "");
    const tipoLabel =
      tipo === "general" ? "General" :
      tipo === "menores" ? "Menores" :
      tipo === "teleconsulta" ? "Teleconsulta" : tipo;
    entries.push({
      id: c.id,
      type: "consentimiento",
      date: c.created_at,
      titulo: `Consentimiento ${tipoLabel}`,
      resumen: c.firmado ? "Firmado por el paciente" : "Pendiente de firma",
      firmado: Boolean(c.firmado),
      data: { tipo: c.tipo, version: c.version },
    });
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Summary ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anamnesis = anamnesisRes.data as any;
  const redFlagsActivos: string[] = [];
  if (anamnesis?.red_flags) {
    const rf = anamnesis.red_flags as Record<string, boolean>;
    const LABELS: Record<string, string> = {
      marcapasos: "Marcapasos",
      embarazo: "Embarazo",
      tvp: "TVP",
      oncologico: "Oncológico",
      fiebre: "Fiebre",
      alergias_severas: "Alergias severas",
      infeccion_cutanea: "Infección cutánea",
      fragilidad_capilar: "Fragilidad capilar",
    };
    for (const [key, label] of Object.entries(LABELS)) {
      if (rf[key]) redFlagsActivos.push(label);
    }
  }

  const latestSoap = ((soapRes.data ?? [])[0] ?? null) as SoapNote | null;
  const latestCifCount = latestSoap
    ? [
        ...(latestSoap.analisis_cif?.funciones ?? []),
        ...(latestSoap.analisis_cif?.actividades ?? []),
        ...(latestSoap.analisis_cif?.participacion ?? []),
        ...(latestSoap.analisis_cif?.contexto ?? []),
      ].length
    : 0;

  const latestVitals = ((vitalsRes.data ?? [])[0] ?? null) as VitalSigns | null;

  const summary: PatientSummary = {
    motivo_consulta: anamnesis?.motivo_consulta ?? null,
    red_flags_activos: redFlagsActivos,
    cif_activos: latestCifCount,
    plan_actual: latestSoap?.plan ?? null,
    proxima_sesion: latestSoap?.proxima_sesion ?? null,
    vitales: latestVitals,
  };

  return { success: true, data: { entries, summary } };
}

// ── TimelineEntryClinico ────────────────────────────────────────────────────

export interface TimelineEntryClinico {
  id: string;
  tipo: "evaluacion" | "soap" | "signos_vitales";
  fecha: string;
  autorNombre: string;
  autorEspecialidad: string;
  especialidad: string;
  firmado?: boolean;
  resumen: string;
  data?: Record<string, unknown>;
}

// ── getTimelineClinico ─────────────────────────────────────────────────────

export async function getTimelineClinico(
  patientId: string,
  idClinica: string
): Promise<ActionResult<TimelineEntryClinico[]>> {
  const { supabase } = await requireAuth();

  const [evalsRes, soapsRes, vitalsRes] = await Promise.all([
    supabase
      .from("fce_evaluaciones")
      .select("id, especialidad, sub_area, data, created_at, created_by")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("fce_notas_soap")
      .select("id, subjetivo, firmado, firmado_por, created_at, id_encuentro")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("fce_signos_vitales")
      .select(
        "id, presion_arterial, frecuencia_cardiaca, spo2, temperatura, frecuencia_respiratoria, recorded_at, recorded_by"
      )
      .eq("id_paciente", patientId)
      .eq("id_clinica", idClinica)
      .order("recorded_at", { ascending: false })
      .limit(20),
  ]);

  type EncRow = {
    id: string;
    id_clinica: string;
    especialidad: string | null;
    id_profesional: string | null;
  };
  type SoapRow = {
    id: string;
    subjetivo: string | null;
    firmado: boolean;
    firmado_por: string | null;
    created_at: string;
    id_encuentro: string | null;
  };

  const encounterIds = ((soapsRes.data ?? []) as SoapRow[])
    .map((s) => s.id_encuentro)
    .filter((id): id is string => Boolean(id));

  const encMap = new Map<string, EncRow>();
  if (encounterIds.length > 0) {
    const { data: encs } = await supabase
      .from("fce_encuentros")
      .select("id, id_clinica, especialidad, id_profesional")
      .in("id", encounterIds)
      .eq("id_clinica", idClinica);
    for (const enc of (encs ?? []) as EncRow[]) {
      encMap.set(enc.id, enc);
    }
  }

  // Batch lookup — solo columna 'nombre' (no existe 'apellidos')
  const profIds = new Set<string>();
  for (const e of (evalsRes.data ?? []) as Evaluation[]) {
    if (e.created_by) profIds.add(e.created_by);
  }
  for (const s of (soapsRes.data ?? []) as SoapRow[]) {
    if (s.firmado_por) profIds.add(s.firmado_por);
    const enc = s.id_encuentro ? encMap.get(s.id_encuentro) : null;
    if (enc?.id_profesional) profIds.add(enc.id_profesional);
  }
  for (const v of (vitalsRes.data ?? []) as VitalSigns[]) {
    if (v.recorded_by) profIds.add(v.recorded_by);
  }

  type ProfRow = { id: string; nombre: string | null; especialidad: string | null; id_clinica: string };
  const profMap = new Map<string, ProfRow>();
  if (profIds.size > 0) {
    const { data: profs } = await supabase
      .from("profesionales")
      .select("id, nombre, especialidad, id_clinica")
      .in("id", Array.from(profIds));
    for (const p of (profs ?? []) as ProfRow[]) {
      profMap.set(p.id, p);
    }
  }

  const entries: TimelineEntryClinico[] = [];

  // Evaluaciones
  for (const e of (evalsRes.data ?? []) as Evaluation[]) {
    const prof = e.created_by ? profMap.get(e.created_by) : null;
    if (e.created_by && prof && prof.id_clinica !== idClinica) continue;
    const subArea = e.sub_area ? String(e.sub_area).replace(/_/g, " ") : "";
    const resumen =
      [String(e.especialidad ?? ""), subArea].filter(Boolean).join(" — ").slice(0, 120) ||
      "Evaluación registrada";
    entries.push({
      id: e.id,
      tipo: "evaluacion",
      fecha: e.created_at,
      autorNombre: prof?.nombre ?? "Profesional",
      autorEspecialidad: prof?.especialidad ?? String(e.especialidad ?? ""),
      especialidad: String(e.especialidad ?? ""),
      resumen,
      data: { especialidad: e.especialidad, sub_area: e.sub_area, campos: e.data },
    });
  }

  // SOAP notes
  for (const s of (soapsRes.data ?? []) as SoapRow[]) {
    const enc = s.id_encuentro ? encMap.get(s.id_encuentro) : null;
    if (!enc) continue;
    const authorId = s.firmado_por ?? enc.id_profesional;
    const prof = authorId ? profMap.get(authorId) : null;
    entries.push({
      id: s.id,
      tipo: "soap",
      fecha: s.created_at,
      autorNombre: prof?.nombre ?? "Profesional",
      autorEspecialidad: prof?.especialidad ?? enc.especialidad ?? "",
      especialidad: enc.especialidad ?? "",
      firmado: Boolean(s.firmado),
      resumen: s.subjetivo?.slice(0, 120) ?? "Sin descripción subjetiva",
      data: { subjetivo: s.subjetivo },
    });
  }

  // Signos vitales
  for (const v of (vitalsRes.data ?? []) as VitalSigns[]) {
    const prof = v.recorded_by ? profMap.get(v.recorded_by) : null;
    entries.push({
      id: v.id,
      tipo: "signos_vitales",
      fecha: v.recorded_at,
      autorNombre: prof?.nombre ?? "Profesional",
      autorEspecialidad: prof?.especialidad ?? "",
      especialidad: "",
      resumen: `PA ${v.presion_arterial ?? "—"} · FC ${v.frecuencia_cardiaca ?? "—"} bpm · SpO₂ ${v.spo2 ?? "—"}%`,
      data: {
        presion_arterial: v.presion_arterial,
        frecuencia_cardiaca: v.frecuencia_cardiaca,
        spo2: v.spo2,
        temperatura: v.temperatura,
        frecuencia_respiratoria: v.frecuencia_respiratoria,
      },
    });
  }

  entries.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return { success: true, data: entries.slice(0, 100) };
}
