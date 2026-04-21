"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notaClinicaSchema } from "@/lib/validations";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { ActionResult } from "@/app/actions/patients";
import type { NotaClinica } from "@/types/nota-clinica";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, registroId: string, idClinica: string | null, idPaciente: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: "fce_notas_clinicas",
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      id_paciente: idPaciente,
    });
  } catch { /* no bloquea */ }
}

// ── getNotaClinica ───────────────────────────────────────────────────────────

export async function getNotaClinica(
  encuentroId: string,
): Promise<ActionResult<NotaClinica | null>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_notas_clinicas")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as NotaClinica | null };
}

// ── upsertNotaClinica ────────────────────────────────────────────────────────

export async function upsertNotaClinica(
  encuentroId: string,
  patientId: string,
  formData: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = notaClinicaSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);

  // Normalize optional fields: empty strings → null, cie10_codigos vacío → null
  const { motivo_consulta, contenido, diagnostico, cie10_codigos, plan, proxima_sesion } = parsed.data;
  const cleanedData = {
    motivo_consulta: motivo_consulta || null,
    contenido,
    diagnostico: diagnostico || null,
    cie10_codigos: cie10_codigos && cie10_codigos.length > 0 ? cie10_codigos : null,
    plan: plan || null,
    proxima_sesion: proxima_sesion || null,
  };

  // Check if nota already exists for this encuentro
  const { data: existing } = await supabase
    .from("fce_notas_clinicas")
    .select("id, firmado")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  let id: string;

  if (existing) {
    if (existing.firmado) {
      return { success: false, error: "La nota está firmada y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_notas_clinicas")
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "actualizar_nota_clinica", id, idClinica, patientId);
  } else {
    if (!profesional) {
      return { success: false, error: "No se encontró el perfil profesional del usuario." };
    }

    const { data: created, error } = await supabase
      .from("fce_notas_clinicas")
      .insert({
        id_clinica: idClinica,
        id_paciente: patientId,
        id_encuentro: encuentroId,
        created_by: profesional.id,
        firmado: false,
        ...cleanedData,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "crear_nota_clinica", id, idClinica, patientId);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

// ── signNotaClinica ──────────────────────────────────────────────────────────

export async function signNotaClinica(
  notaId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica ?? undefined);
  if (!profesional) {
    return { success: false, error: "No se encontró el perfil profesional del usuario." };
  }

  // Leer id_encuentro antes de firmar
  const { data: notaRow } = await supabase
    .from("fce_notas_clinicas")
    .select("id_encuentro, firmado")
    .eq("id", notaId)
    .single();

  if (!notaRow) return { success: false, error: "Nota no encontrada." };
  if (notaRow.firmado) return { success: false, error: "La nota ya está firmada." };

  const { error } = await supabase
    .from("fce_notas_clinicas")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notaId)
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };

  // Finalizar el encuentro
  await supabase
    .from("fce_encuentros")
    .update({ status: "finalizado", ended_at: new Date().toISOString() })
    .eq("id", notaRow.id_encuentro)
    .eq("status", "en_progreso");

  await logAudit(supabase, user.id, "firmar_nota_clinica", notaId, idClinica, patientId);

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}
