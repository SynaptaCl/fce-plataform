"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { soapSchema } from "@/lib/validations";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ActionResult } from "@/app/actions/patients";
import { getIdClinica } from "@/app/actions/patients";
import type { SoapNote } from "@/types";

// ── getOrCreateEncounter ────────────────────────────────────────────────────
// 1. Busca un encuentro pre-creado por check-in (planificado, con id_cita, de hoy)
// 2. Si lo encuentra → transiciona a en_progreso y retorna su id
// 3. Si no → crea un walk-in nuevo (sin id_cita)

async function getOrCreateEncounter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  patientId: string,
  profesionalId: string,
  idClinica: string | null,
  especialidad: string,
): Promise<string> {
  // Calcular rango del día en zona horaria de Santiago para evitar desfase UTC
  const hoySantiago = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const todayStart = new Date(`${hoySantiago}T00:00:00-04:00`);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // 1. Buscar encuentro pre-creado por check-in de hoy
  if (idClinica) {
    const { data: preplanned } = await supabase
      .from("fce_encuentros")
      .select("id")
      .eq("id_paciente", patientId)
      .eq("id_clinica", idClinica)
      .eq("status", "planificado")
      .not("id_cita", "is", null)
      .gte("started_at", todayStart.toISOString())
      .lt("started_at", tomorrowStart.toISOString())
      .maybeSingle();

    if (preplanned?.id) {
      const { error: updateError } = await supabase
        .from("fce_encuentros")
        .update({ status: "en_progreso", started_at: new Date().toISOString() })
        .eq("id", preplanned.id);
      if (updateError) throw new Error(updateError.message);
      return preplanned.id as string;
    }
  }

  // 2. Fallback: crear walk-in (atención sin agenda)
  const { data: created, error } = await supabase
    .from("fce_encuentros")
    .insert({
      id_paciente: patientId,
      id_profesional: profesionalId,
      especialidad,
      modalidad: "presencial",
      status: "en_progreso",
      started_at: new Date().toISOString(),
      ...(idClinica ? { id_clinica: idClinica } : {}),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

// ── getSoapNotes ─────────────────────────────────────────────────────────────

export async function getSoapNotes(
  patientId: string,
): Promise<ActionResult<SoapNote[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getIdClinica(supabase, user.id);

  const { data, error } = await supabase
    .from("fce_notas_soap")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as SoapNote[] };
}

// ── upsertSoapNote ───────────────────────────────────────────────────────────

export async function upsertSoapNote(
  patientId: string,
  formData: Record<string, unknown>,
  noteId?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = soapSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica, profesionalId, especialidad: espCtx } = await requireContext();

  // Obtener especialidad del profesional para el encuentro
  const especialidad = espCtx ?? "Kinesiología";
  let id: string;

  const soapData = {
    ...parsed.data,
    // Campos narrativos rich-text — sanitizar HTML antes de persistir.
    // analisis_cif e intervenciones son jsonb estructurado: pasan tal cual.
    subjetivo: sanitizeRichText(parsed.data.subjetivo),
    objetivo: sanitizeRichText(parsed.data.objetivo),
    plan: sanitizeRichText(parsed.data.plan),
    tareas_domiciliarias: parsed.data.tareas_domiciliarias
      ? sanitizeRichText(parsed.data.tareas_domiciliarias)
      : parsed.data.tareas_domiciliarias,
    proxima_sesion: parsed.data.proxima_sesion || null,
  };

  if (noteId) {
    // UPDATE — solo si no está firmado
    const { data: existing } = await supabase
      .from("fce_notas_soap")
      .select("firmado")
      .eq("id", noteId)
      .eq("id_clinica", idClinica)
      .single();

    if (existing?.firmado) {
      return { success: false, error: "La nota está firmada y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_notas_soap")
      .update({ ...soapData })
      .eq("id", noteId)
      .eq("id_clinica", idClinica);

    if (error) return { success: false, error: error.message };
    id = noteId;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "actualizar_soap",
      tipoEvento: "update",
      tablaAfectada: "fce_notas_soap",
      registroId: id,
      idClinica: idClinica!,
      idPaciente: patientId,
    });
  } else {
    // CREATE — buscar encuentro pre-creado o crear walk-in
    if (!idClinica) return { success: false, error: "No se encontró la clínica del usuario." };
    let encounterId: string;
    try {
      if (!profesionalId) {
        return { success: false, error: "No se encontró el profesional asociado al usuario." };
      }
      encounterId = await getOrCreateEncounter(supabase, patientId, profesionalId, idClinica, especialidad);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }

    // DEBUG — remover después de diagnosticar RLS INSERT
    const { data: { user: debugUser } } = await supabase.auth.getUser();
    const insertPayload = {
      ...soapData,
      id_paciente: patientId,
      id_encuentro: encounterId,
      id_clinica: idClinica,   // después del spread: siempre gana
      firmado: false,
    };
    console.error("[FCE_DEBUG_SOAP]", JSON.stringify({
      authUid: debugUser?.id ?? "NULL",
      idClinicaFromContext: idClinica,
      idClinicaInPayload: insertPayload.id_clinica,
      payloadKeys: Object.keys(insertPayload),
      soapDataKeys: Object.keys(soapData),
      soapDataHasIdClinica: "id_clinica" in soapData,
    }));

    const { data: created, error } = await supabase
      .from("fce_notas_soap")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "crear_soap",
      tipoEvento: "create",
      tablaAfectada: "fce_notas_soap",
      registroId: id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

// ── signSoapNote ─────────────────────────────────────────────────────────────

export async function signSoapNote(
  noteId: string,
  patientId: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const { supabase, user, idClinica, profesionalId } = await requireContext();

  // firmado_por almacena profesionales.id (no auth.uid) — FK a profesionales
  const firmadoPor = profesionalId;
  if (!firmadoPor) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  const { data: notaConEncuentro } = await supabase
    .from("fce_notas_soap")
    .select("id_encuentro")
    .eq("id", noteId)
    .eq("id_clinica", idClinica)
    .single();

  const { error } = await supabase
    .from("fce_notas_soap")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: firmadoPor,
    })
    .eq("id", noteId)
    .eq("id_clinica", idClinica)
    .eq("firmado", false); // solo si no estaba ya firmado

  if (error) return { success: false, error: error.message };

  if (notaConEncuentro?.id_encuentro) {
    await supabase
      .from("fce_encuentros")
      .update({ status: "finalizado", ended_at: new Date().toISOString() })
      .eq("id", notaConEncuentro.id_encuentro)
      .eq("status", "en_progreso");
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_soap",
    tipoEvento: "sign",
    tablaAfectada: "fce_notas_soap",
    registroId: noteId,
    idClinica: idClinica!,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { redirectTo: `/dashboard/pacientes/${patientId}` } };
}
