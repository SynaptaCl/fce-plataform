"use server";

import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getIdClinica } from "./patients";
import type { ActionResult } from "./patients";
import type { SoapNote, VitalSigns } from "@/types";
import type { Evaluation } from "@/types";
import type { ExamenIndicado } from "@/types/orden-examen";

// ── Types ──────────────────────────────────────────────────────────────────

export type TimelineEntryType =
  | "soap"
  | "evaluacion"
  | "signos_vitales"
  | "consentimiento"
  | "nota_clinica"
  | "instrumento"
  | "prescripcion"
  | "orden_examen"
  | "egreso"
  | "plan_intervencion"
  | "adenda";

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
  encuentroId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  prescripcionData?: {
    folio: string;
    tipo: "farmacologica" | "indicacion_general";
    medicamentosCount: number;
    primerMedicamento?: string;
    diagnostico?: string;
  };
}

export interface PatientSummary {
  motivo_consulta: string | null;
  red_flags_activos: string[];
  cif_activos: number;
  diagnosticos_recientes: string[];
  plan_actual: string | null;
  proxima_sesion: string | null;
  vitales: VitalSigns | null;
  indicaciones_farmacologicas: { nombre: string; presentacion: string; fecha: string }[];
  antecedentes: {
    morbidos: string | null;
    alergias: string | null;
    medicamentos_habituales: string | null;
  } | null;
  plan_activo: {
    titulo: string;
    fecha_revision: string | null;
    objetivos_activos: number;
  } | null;
}

// ── Local row types for clinical model tables ─────────────────────────────

type NotaClinicaRow = {
  id: string;
  id_encuentro: string | null;
  motivo_consulta: string | null;
  contenido: string | null;
  diagnostico: string | null;
  cie10_codigos: string[] | null;
  plan: string | null;
  proxima_sesion: string | null;
  firmado: boolean | null;
  firmado_at: string | null;
  firmado_por: string | null;
  created_by: string | null;
  created_at: string;
};

type PrescripcionTimelineRow = {
  id: string;
  folio_display: string;
  tipo: "farmacologica" | "indicacion_general";
  medicamentos: unknown[] | null;
  indicaciones_generales: string | null;
  diagnostico_asociado: string | null;
  firmado_at: string;
  prof_nombre_snapshot: string | null;
  prof_especialidad_snapshot: string | null;
  id_clinica: string;
  id_paciente: string;
};

type OrdenExamenTimelineRow = {
  id: string;
  folio_display: string;
  examenes: unknown[];
  diagnostico_presuntivo: string | null;
  prioridad: "normal" | "urgente";
  estado_resultados: "pendiente" | "parcial" | "completo";
  firmado_at: string;
  prof_nombre_snapshot: string | null;
  prof_especialidad_snapshot: string | null;
  id_clinica: string;
  id_paciente: string;
};

type PlanIntervencionRow = {
  id: string;
  titulo: string;
  condicion_codigo: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_revision: string | null;
  firmado: boolean;
  firmado_at: string | null;
  created_by: string | null;
  created_at: string;
  objetivos_count?: number;
};

type EgresoTimelineRow = {
  id: string;
  tipo_egreso: string;
  diagnostico_egreso: string;
  resumen_tratamiento: string;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_at: string;
  created_by: string;
};

type AdendaRow = {
  id: string;
  tipo_adenda: string;
  tipo_documento: string;
  id_documento: string;
  motivo: string;
  contenido: string;
  created_at: string;
  created_by: string;
  firmado_at: string | null;
  override_director: boolean;
  override_motivo: string | null;
  id_encuentro: string | null;
};

type InstrumentoAplicadoRow = {
  id: string;
  id_encuentro: string | null;
  id_instrumento: string;
  puntaje_total: number | null;
  interpretacion: string | null;
  respuestas: Record<string, unknown> | null;
  notas: string | null;
  mostrar_en_timeline: boolean | null;
  aplicado_por: string | null;
  aplicado_at: string;
  instrumento: { nombre: string; schema_items: unknown } | null;
};

// ── getPatientTimeline ─────────────────────────────────────────────────────

export async function getPatientTimeline(
  patientId: string
): Promise<ActionResult<{ entries: TimelineEntry[]; summary: PatientSummary }>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);

  // Verificar que el paciente pertenece a la clínica del usuario antes de usar serviceClient.
  // Esta validación usa el cliente con RLS — si falla, el acceso está bloqueado.
  if (idClinica) {
    const { data: patientOwnership } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", patientId)
      .eq("id_clinica", idClinica)
      .maybeSingle();
    if (!patientOwnership) {
      return { success: false, error: "Acceso no autorizado" };
    }
  }

  // serviceClient bypasea RLS — necesario para el timeline que agrega datos de múltiples tablas.
  // fce_notas_soap y fce_evaluaciones tienen id_clinica desde 20260606_03; filtramos como defense-in-depth.
  const serviceClient = createServiceClient();

  const [soapRes, evalRes, vitalsRes, consentRes, anamnesisRes, notasRes, instrumentosRes, prescripcionesRes, ordenesExamenRes, egresosRes, planesRes, adendaRes] = await Promise.all([
    idClinica
      ? serviceClient.from("fce_notas_soap").select("*").eq("id_paciente", patientId).eq("id_clinica", idClinica).order("created_at", { ascending: false })
      : serviceClient.from("fce_notas_soap").select("*").eq("id_paciente", patientId).order("created_at", { ascending: false }),
    idClinica
      ? serviceClient.from("fce_evaluaciones").select("*").eq("id_paciente", patientId).eq("id_clinica", idClinica).order("created_at", { ascending: false })
      : serviceClient.from("fce_evaluaciones").select("*").eq("id_paciente", patientId).order("created_at", { ascending: false }),
    idClinica
      ? supabase.from("fce_signos_vitales").select("*").eq("id_paciente", patientId).eq("id_clinica", idClinica).order("recorded_at", { ascending: false })
      : supabase.from("fce_signos_vitales").select("*").eq("id_paciente", patientId).order("recorded_at", { ascending: false }),
    supabase
      .from("fce_consentimientos")
      .select("id, id_paciente, tipo, version, firmado, created_at")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_anamnesis")
      .select("motivo_consulta, red_flags, antecedentes_medicos, alergias, farmacologia")
      .eq("id_paciente", patientId)
      .maybeSingle(),
    idClinica
      ? supabase
          .from("fce_notas_clinicas")
          .select("id, id_encuentro, motivo_consulta, contenido, diagnostico, cie10_codigos, icd_codigos, secciones_estructuradas, plan, proxima_sesion, firmado, firmado_at, firmado_por, created_by, created_at")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? supabase
          .from("instrumentos_aplicados")
          .select("id, id_encuentro, id_instrumento, puntaje_total, interpretacion, respuestas, notas, mostrar_en_timeline, aplicado_por, aplicado_at, instrumento:instrumentos_valoracion(nombre, schema_items)")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .eq("mostrar_en_timeline", true)
          .order("aplicado_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? supabase
          .from("fce_prescripciones")
          .select("id, folio_display, tipo, medicamentos, indicaciones_generales, diagnostico_asociado, firmado_at, prof_nombre_snapshot, prof_especialidad_snapshot, id_clinica, id_paciente")
          .eq("id_paciente", patientId)
          .eq("firmado", true)
          .order("firmado_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? supabase
          .from("fce_ordenes_examen")
          .select("id, folio_display, examenes, diagnostico_presuntivo, prioridad, estado_resultados, firmado_at, prof_nombre_snapshot, prof_especialidad_snapshot, id_clinica, id_paciente")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .eq("firmado", true)
          .order("firmado_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? supabase
          .from("fce_egresos")
          .select("id, tipo_egreso, diagnostico_egreso, resumen_tratamiento, firmado, firmado_at, firmado_por, created_at, created_by")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? supabase
          .from("fce_planes_intervencion")
          .select("id, titulo, condicion_codigo, estado, fecha_inicio, fecha_revision, firmado, firmado_at, created_by, created_at")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    idClinica
      ? serviceClient
          .from("fce_adendas")
          .select("id, tipo_adenda, tipo_documento, id_documento, motivo, contenido, created_at, created_by, firmado_at, override_director, override_motivo, id_encuentro")
          .eq("id_paciente", patientId)
          .eq("id_clinica", idClinica)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Batch-fetch encuentros for SOAP notes AND notas_clinicas to get especialidad
  const soapEncIds = ((soapRes.data ?? []) as SoapNote[])
    .map((s) => s.id_encuentro)
    .filter((id): id is string => Boolean(id));

  const notasEncIds = ((notasRes.data ?? []) as NotaClinicaRow[])
    .map((n) => n.id_encuentro)
    .filter((id): id is string => Boolean(id));

  const allEncIds = [...new Set([...soapEncIds, ...notasEncIds])];
  const encEspMap = new Map<string, string>(); // encuentro_id → especialidad
  const validEncIds = new Set<string>(); // encuentros de la clínica actual (para filtrar SOAP)
  if (allEncIds.length > 0) {
    const encsQuery = supabase
      .from("fce_encuentros")
      .select("id, especialidad")
      .in("id", allEncIds);
    const { data: encs } = await (idClinica ? encsQuery.eq("id_clinica", idClinica) : encsQuery);
    for (const enc of encs ?? []) {
      validEncIds.add(enc.id);
      if (enc.especialidad) encEspMap.set(enc.id, enc.especialidad as string);
    }
  }

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
  for (const n of (notasRes.data ?? []) as NotaClinicaRow[]) {
    if (n.created_by) profIds.add(n.created_by);
    if (n.firmado_por) profIds.add(n.firmado_por);
  }
  for (const i of (instrumentosRes.data ?? []) as unknown as InstrumentoAplicadoRow[]) {
    if (i.aplicado_por) profIds.add(i.aplicado_por);
  }
  for (const e of (egresosRes.data ?? []) as EgresoTimelineRow[]) {
    if (e.created_by) profIds.add(e.created_by);
    if (e.firmado_por) profIds.add(e.firmado_por);
  }
  for (const p of (planesRes.data ?? []) as PlanIntervencionRow[]) {
    if (p.created_by) profIds.add(p.created_by);
  }
  const adendas = (adendaRes.data ?? []) as AdendaRow[];
  for (const a of adendas) {
    if (a.created_by) profIds.add(a.created_by);
  }

  type ProfMapEntry = { nombre: string; id_clinica: string };
  const profMap = new Map<string, ProfMapEntry>();
  if (profIds.size > 0) {
    const { data: profs } = await serviceClient
      .from("profesionales")
      .select("id, nombre, id_clinica")
      .in("id", Array.from(profIds));
    for (const p of profs ?? []) {
      profMap.set(p.id, { nombre: p.nombre ?? "Profesional", id_clinica: p.id_clinica });
    }
  }

  // Badge metadata: adendas per document
  const adendasPorDoc = new Map<string, { count: number; tieneErrata: boolean; anulada: boolean }>();
  for (const a of adendas) {
    const key = a.id_documento;
    const prev = adendasPorDoc.get(key) ?? { count: 0, tieneErrata: false, anulada: false };
    adendasPorDoc.set(key, {
      count: prev.count + 1,
      tieneErrata: prev.tieneErrata || a.tipo_adenda === "errata",
      anulada: prev.anulada || a.tipo_adenda === "anulacion",
    });
  }

  // Map for original document title (used in adenda entry title)
  const docTituloMap = new Map<string, string>();

  const planes = (planesRes.data ?? []) as PlanIntervencionRow[];

  // Fetch objetivos count por plan (batch query)
  const planIds = planes.map((p) => p.id);
  const objetivosMap = new Map<string, number>();
  if (planIds.length > 0 && idClinica) {
    const { data: objetivos } = await supabase
      .from("fce_plan_objetivos")
      .select("id_plan, estado")
      .in("id_plan", planIds)
      .eq("estado", "activo")
      .eq("id_clinica", idClinica);
    if (objetivos) {
      for (const obj of objetivos) {
        const count = objetivosMap.get(obj.id_plan) ?? 0;
        objetivosMap.set(obj.id_plan, count + 1);
      }
    }
  }

  const entries: TimelineEntry[] = [];

  // SOAP notes
  for (const soap of (soapRes.data ?? []) as SoapNote[]) {
    // Deny-by-default: excluir SOAP sin encuentro o de encuentros de otras clínicas
    if (!soap.id_encuentro || !validEncIds.has(soap.id_encuentro)) continue;
    const cifItems = [
      ...(soap.analisis_cif?.funciones ?? []),
      ...(soap.analisis_cif?.actividades ?? []),
      ...(soap.analisis_cif?.participacion ?? []),
      ...(soap.analisis_cif?.contexto ?? []),
    ];
    const soapEsp = soap.id_encuentro ? encEspMap.get(soap.id_encuentro) : undefined;
    // Record title for adenda cross-reference
    const soapDateStr = new Date(soap.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
    docTituloMap.set(soap.id, `Nota SOAP del ${soapDateStr}`);
    entries.push({
      id: soap.id,
      type: "soap",
      date: soap.created_at,
      especialidad: soapEsp,
      encuentroId: soap.id_encuentro ?? undefined,
      autor_id: soap.firmado_por,
      profesional_nombre: soap.firmado_por ? profMap.get(soap.firmado_por)?.nombre : undefined,
      titulo: "Nota SOAP",
      resumen: soap.subjetivo?.slice(0, 150) || "Sin descripción subjetiva",
      firmado: soap.firmado,
      data: {
        subjetivo: soap.subjetivo,
        objetivo: soap.objetivo,
        analisis_cif: soap.analisis_cif,
        plan: soap.plan,
        proxima_sesion: soap.proxima_sesion,
        tareas_domiciliarias: soap.tareas_domiciliarias,
        intervenciones: soap.intervenciones ?? [],
        cif_count: cifItems.length,
        firmado: soap.firmado,
        firmado_at: soap.firmado_at,
        firmado_por: soap.firmado_por ?? null,
        adendas: adendasPorDoc.get(soap.id) ?? null,
      },
    });
  }

  // Evaluaciones — especialidad viene como código exacto del catálogo desde DB
  for (const ev of (evalRes.data ?? []) as Evaluation[]) {
    // Deny-by-default: excluir evaluaciones sin autor, sin clínica, o de otra clínica
    if (!idClinica || !ev.created_by) continue;
    const profInfo = profMap.get(ev.created_by);
    if (!profInfo || profInfo.id_clinica !== idClinica) continue;
    const subAreaLabel = String(ev.sub_area ?? "").replace(/_/g, " ");
    entries.push({
      id: ev.id,
      type: "evaluacion",
      date: ev.created_at,
      especialidad: ev.especialidad,
      autor_id: ev.created_by,
      profesional_nombre: ev.created_by ? profMap.get(ev.created_by)?.nombre : undefined,
      titulo: `Evaluación — ${ev.especialidad ?? "Sin especialidad"}`,
      resumen: subAreaLabel ? `Área: ${subAreaLabel}` : "Evaluación registrada",
      data: {
        especialidad: ev.especialidad,
        sub_area: ev.sub_area,
        contraindicaciones_certificadas: ev.contraindicaciones_certificadas,
        evData: ev.data ?? {},
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
      profesional_nombre: vs.recorded_by ? profMap.get(vs.recorded_by)?.nombre : undefined,
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
      data: { tipo: c.tipo, version: c.version, firmado: Boolean(c.firmado) },
    });
  }

  // Notas clínicas (modelo clinico_general)
  for (const nota of (notasRes.data ?? []) as NotaClinicaRow[]) {
    const notaEsp = nota.id_encuentro ? encEspMap.get(nota.id_encuentro) : undefined;
    const notaAutorId = nota.firmado_por ?? nota.created_by ?? undefined;
    // Record title for adenda cross-reference
    const notaDateStr = new Date(nota.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
    docTituloMap.set(nota.id, `Nota clínica del ${notaDateStr}`);
    entries.push({
      id: nota.id,
      type: "nota_clinica",
      date: nota.created_at,
      especialidad: notaEsp,
      autor_id: notaAutorId,
      profesional_nombre: notaAutorId ? profMap.get(notaAutorId)?.nombre : undefined,
      titulo: `Nota clínica${nota.motivo_consulta ? ` — ${nota.motivo_consulta}` : ""}`,
      resumen: nota.contenido ? nota.contenido.slice(0, 150) : "",
      firmado: nota.firmado ?? undefined,
      encuentroId: nota.id_encuentro ?? undefined,
      data: {
        motivo_consulta: nota.motivo_consulta,
        contenido: nota.contenido,
        diagnostico: nota.diagnostico,
        cie10_codigos: nota.cie10_codigos ?? [],
        plan: nota.plan,
        proxima_sesion: nota.proxima_sesion,
        firmado: nota.firmado,
        firmado_at: nota.firmado_at,
        firmado_por_nombre: nota.firmado_por ? profMap.get(nota.firmado_por)?.nombre : undefined,
        adendas: adendasPorDoc.get(nota.id) ?? null,
      },
    });
  }

  // Instrumentos aplicados
  for (const inst of (instrumentosRes.data ?? []) as unknown as InstrumentoAplicadoRow[]) {
    const instNombre = inst.instrumento?.nombre ?? "Instrumento";
    const instTitulo = inst.puntaje_total !== null
      ? `${instNombre}: ${inst.puntaje_total} — ${inst.interpretacion ?? "sin interpretación"}`
      : inst.interpretacion
        ? `${instNombre} — ${inst.interpretacion}`
        : instNombre;
    entries.push({
      id: inst.id,
      type: "instrumento",
      date: inst.aplicado_at,
      autor_id: inst.aplicado_por ?? undefined,
      profesional_nombre: inst.aplicado_por ? profMap.get(inst.aplicado_por)?.nombre : undefined,
      titulo: instTitulo,
      resumen: inst.interpretacion ?? "",
      encuentroId: inst.id_encuentro ?? undefined,
      data: {
        nombre: inst.instrumento?.nombre,
        puntaje: inst.puntaje_total,
        interpretacion: inst.interpretacion,
        respuestas: inst.respuestas ?? {},
        notas: inst.notas,
        schema_items: inst.instrumento?.schema_items,
      },
    });
  }

  // Prescripciones
  for (const presc of (prescripcionesRes.data ?? []) as PrescripcionTimelineRow[]) {
    const meds = Array.isArray(presc.medicamentos) ? presc.medicamentos as Array<{ principio_activo?: string; presentacion?: string }> : [];
    const primerMed = meds[0]
      ? [meds[0].principio_activo, meds[0].presentacion].filter(Boolean).join(" ")
      : undefined;
    entries.push({
      id: presc.id,
      type: "prescripcion",
      date: presc.firmado_at,
      especialidad: presc.prof_especialidad_snapshot ?? undefined,
      profesional_nombre: presc.prof_nombre_snapshot ?? undefined,
      titulo: presc.tipo === "farmacologica"
        ? `Receta farmacológica — ${presc.folio_display}`
        : `Indicación general — ${presc.folio_display}`,
      resumen: presc.tipo === "farmacologica"
        ? primerMed
          ? `${primerMed}${meds.length > 1 ? ` y ${meds.length - 1} más` : ""}`
          : "Prescripción sin medicamentos detallados"
        : (presc.indicaciones_generales?.slice(0, 100) ?? "Indicación general"),
      firmado: true,
      prescripcionData: {
        folio: presc.folio_display,
        tipo: presc.tipo,
        medicamentosCount: meds.length,
        primerMedicamento: primerMed,
        diagnostico: presc.diagnostico_asociado ?? undefined,
      },
      data: {
        folio: presc.folio_display,
        tipo: presc.tipo,
        medicamentosCount: meds.length,
        diagnostico: presc.diagnostico_asociado,
      },
    });
  }

  // Órdenes de examen
  for (const orden of (ordenesExamenRes.data ?? []) as OrdenExamenTimelineRow[]) {
    const examenes = Array.isArray(orden.examenes)
      ? (orden.examenes as ExamenIndicado[])
      : [];
    const primerExamen = examenes[0]?.nombre ?? null;
    entries.push({
      id: orden.id,
      type: "orden_examen",
      date: orden.firmado_at,
      especialidad: orden.prof_especialidad_snapshot ?? undefined,
      profesional_nombre: orden.prof_nombre_snapshot ?? undefined,
      titulo: `Orden de exámenes — ${orden.folio_display}`,
      resumen: primerExamen
        ? `${examenes.length} examen(es): ${primerExamen}${examenes.length > 1 ? ` y ${examenes.length - 1} más` : ""}`
        : "Orden de exámenes",
      firmado: true,
      data: {
        folio: orden.folio_display,
        examenes,
        diagnostico_presuntivo: orden.diagnostico_presuntivo,
        prioridad: orden.prioridad,
        estado_resultados: orden.estado_resultados,
      },
    });
  }

  // Egresos
  for (const egreso of (egresosRes.data ?? []) as EgresoTimelineRow[]) {
    const TIPO_LABELS: Record<string, string> = {
      alta_clinica: "Alta clínica",
      abandono: "Abandono de tratamiento",
      derivacion: "Derivación",
      fallecimiento: "Fallecimiento",
      otro: "Otro",
    };
    entries.push({
      id: egreso.id,
      type: "egreso",
      date: egreso.firmado_at ?? egreso.created_at,
      autor_id: egreso.created_by ?? undefined,
      profesional_nombre: egreso.created_by ? profMap.get(egreso.created_by)?.nombre : undefined,
      titulo: `Egreso — ${TIPO_LABELS[egreso.tipo_egreso] ?? egreso.tipo_egreso}`,
      resumen: egreso.diagnostico_egreso?.slice(0, 150) ?? "",
      firmado: egreso.firmado,
      data: {
        tipo_egreso: egreso.tipo_egreso,
        diagnostico_egreso: egreso.diagnostico_egreso,
        resumen_tratamiento: egreso.resumen_tratamiento,
        firmado: egreso.firmado,
        firmado_at: egreso.firmado_at,
      },
    });
  }

  // Planes de intervención
  for (const plan of planes) {
    const objetivosActivos = objetivosMap.get(plan.id) ?? 0;
    const autor = plan.created_by ? profMap.get(plan.created_by)?.nombre : undefined;
    entries.push({
      id: plan.id,
      type: "plan_intervencion",
      date: plan.created_at,
      autor_id: plan.created_by ?? undefined,
      profesional_nombre: autor,
      titulo: plan.titulo,
      resumen: `Estado: ${plan.estado} · ${objetivosActivos} objetivo(s) activo(s)`,
      firmado: plan.firmado,
      data: {
        titulo: plan.titulo,
        estado: plan.estado,
        condicion_codigo: plan.condicion_codigo,
        fecha_inicio: plan.fecha_inicio,
        fecha_revision: plan.fecha_revision,
        firmado: plan.firmado,
        firmado_at: plan.firmado_at,
        objetivos_activos: objetivosActivos,
      },
    });
  }

  // Adendas — entries propias en el timeline
  const TIPO_ADENDA_LABEL: Record<string, string> = {
    adenda: "Adenda",
    errata: "Errata",
    anulacion: "Anulación",
  };
  for (const a of adendas) {
    const docTitulo = docTituloMap.get(a.id_documento) ?? "documento";
    const tipoLabel = TIPO_ADENDA_LABEL[a.tipo_adenda] ?? "Adenda";
    const autorNombre = profMap.get(a.created_by)?.nombre ?? "Profesional";
    entries.push({
      id: a.id,
      type: "adenda",
      date: a.created_at,
      autor_id: a.created_by,
      profesional_nombre: autorNombre,
      titulo: `${tipoLabel} — ${docTitulo}`,
      resumen: a.motivo?.slice(0, 100) ?? "",
      firmado: true,
      encuentroId: a.id_encuentro ?? undefined,
      data: {
        tipo_adenda: a.tipo_adenda,
        tipo_documento_original: a.tipo_documento,
        id_documento_original: a.id_documento,
        titulo_documento_original: docTitulo,
        motivo: a.motivo,
        contenido: a.contenido,
        override_director: a.override_director,
        override_motivo: a.override_motivo,
        autor_nombre: autorNombre,
        firmado_at: a.firmado_at,
      },
    });
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Summary ──────────────────────────────────────────────────────────────

  type AnamnesisRow = {
    motivo_consulta?: string | null;
    red_flags?: Record<string, boolean> | null;
    antecedentes_medicos?: Array<{ patologia: string }> | null;
    alergias?: Array<{ sustancia: string }> | null;
    farmacologia?: Array<{ medicamento: string; dosis: string }> | null;
  };
  const anamnesis = anamnesisRes.data as AnamnesisRow | null;
  const redFlagsActivos: string[] = [];
  if (anamnesis?.red_flags) {
    const rf = anamnesis.red_flags;
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

  const diagnosticosRecientes: string[] = [];
  const seenDiag = new Set<string>();
  for (const nota of (notasRes.data ?? []) as NotaClinicaRow[]) {
    if (!nota.firmado || !nota.diagnostico) continue;
    const diag = nota.diagnostico.trim();
    if (diag && !seenDiag.has(diag)) {
      seenDiag.add(diag);
      diagnosticosRecientes.push(diag);
    }
    if (diagnosticosRecientes.length >= 3) break;
  }

  const indicacionesFarmacologicas: { nombre: string; presentacion: string; fecha: string }[] = [];
  for (const presc of (prescripcionesRes.data ?? []) as PrescripcionTimelineRow[]) {
    if (presc.tipo !== "farmacologica") continue;
    const meds = Array.isArray(presc.medicamentos)
      ? (presc.medicamentos as Array<{ principio_activo?: string; presentacion?: string }>)
      : [];
    for (const med of meds) {
      indicacionesFarmacologicas.push({
        nombre: med.principio_activo ?? "Sin nombre",
        presentacion: med.presentacion ?? "",
        fecha: presc.firmado_at,
      });
    }
  }

  const antecedentes: PatientSummary["antecedentes"] = anamnesis
    ? {
        morbidos:
          (anamnesis.antecedentes_medicos ?? [])
            .map((m) => m.patologia)
            .filter(Boolean)
            .join(", ") || null,
        alergias:
          (anamnesis.alergias ?? [])
            .map((a) => a.sustancia)
            .filter(Boolean)
            .join(", ") || null,
        medicamentos_habituales:
          (anamnesis.farmacologia ?? [])
            .map((m) => [m.medicamento, m.dosis].filter(Boolean).join(" "))
            .filter(Boolean)
            .join(", ") || null,
      }
    : null;

  // Buscar el plan más relevante (activo o borrador más reciente)
  const planMasReciente =
    planes.find((p) => p.estado === "activo") ??
    planes.find((p) => p.estado === "borrador") ??
    null;

  const summary: PatientSummary = {
    motivo_consulta: anamnesis?.motivo_consulta ?? null,
    red_flags_activos: redFlagsActivos,
    cif_activos: latestCifCount,
    diagnosticos_recientes: diagnosticosRecientes,
    plan_actual: latestSoap?.plan ?? null,
    proxima_sesion: latestSoap?.proxima_sesion ?? null,
    vitales: latestVitals,
    indicaciones_farmacologicas: indicacionesFarmacologicas,
    antecedentes,
    plan_activo: planMasReciente
      ? {
          titulo: planMasReciente.titulo,
          fecha_revision: planMasReciente.fecha_revision ?? null,
          objetivos_activos: objetivosMap.get(planMasReciente.id) ?? 0,
        }
      : null,
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
