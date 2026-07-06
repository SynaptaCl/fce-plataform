"use server";

import { dbError } from "@/lib/modules/guards";
import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { consentSchema, type ConsentSchemaType } from "@/lib/validations";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";
import type { Consent } from "@/types";

export async function getConsentimientos(
  patientId: string
): Promise<ActionResult<Consent[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  const { data, error } = await supabase
    .from("fce_consentimientos")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });
  if (error) return dbError("consentimiento", error);
  return { success: true, data: data as Consent[] };
}

export async function createConsentimiento(
  patientId: string,
  formData: ConsentSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = consentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  // Versión: +1 sobre la más alta del mismo tipo
  const { data: existing } = await supabase
    .from("fce_consentimientos")
    .select("version")
    .eq("id_paciente", patientId)
    .eq("tipo", parsed.data.tipo)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = existing ? existing.version + 1 : 1;

  const { data, error } = await supabase
    .from("fce_consentimientos")
    .insert({
      id_paciente: patientId,
      tipo: parsed.data.tipo,
      contenido: parsed.data.contenido,
      version: nextVersion,
      created_by: profesionalId,
      id_clinica: idClinica,
    })
    .select("id")
    .single();

  if (error) return dbError("consentimiento", error);
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_consentimiento",
    tipoEvento: "create",
    tablaAfectada: "fce_consentimientos",
    registroId: data.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { id: data.id } };
}

export async function signConsentimiento(
  consentId: string,
  patientId: string,
  firmaDataUrl: string
): Promise<ActionResult<{ redirectTo: string }>> {
  if (!firmaDataUrl.startsWith("data:image/")) {
    return { success: false, error: "Firma inválida" };
  }
  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };
  const timestamp = new Date().toISOString();
  const hash = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  const { error } = await supabase
    .from("fce_consentimientos")
    .update({
      firma_paciente: { data_url: firmaDataUrl, timestamp },
      firma_profesional: { id_profesional: profesionalId, timestamp, hash },
      firmado: true,
      firmado_at: timestamp,
    })
    .eq("id", consentId)
    .eq("id_clinica", idClinica)
    .eq("firmado", false);

  if (error) return dbError("consentimiento", error);
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_consentimiento",
    tipoEvento: "sign",
    tablaAfectada: "fce_consentimientos",
    registroId: consentId,
    idClinica: idClinica,
    idPaciente: patientId,
  });
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { redirectTo: `/dashboard/pacientes/${patientId}` } };
}
