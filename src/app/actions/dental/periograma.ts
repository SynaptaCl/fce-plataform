"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import {
  calcularIndiceSangrado,
  calcularProfundidadMedia,
  calcularSitiosPatologicos,
} from "@/lib/dental/periograma";
import type { ActionResult } from "@/app/actions/patients";
import type { Periograma, PeriogramaPiezaDatos } from "@/types/periograma";

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
      tabla_afectada: "fce_periograma",
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      id_paciente: idPaciente,
    });
  } catch { /* no bloquea */ }
}

export async function getPeriograma(
  encuentroId: string,
): Promise<ActionResult<Periograma | null>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_periograma")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Periograma | null };
}

export async function savePeriograma(
  encuentroId: string,
  patientId: string,
  datos: PeriogramaPiezaDatos[],
  notas: string | null,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const indice_sangrado    = calcularIndiceSangrado(datos);
  const profundidad_media  = calcularProfundidadMedia(datos);
  const sitios_patologicos = calcularSitiosPatologicos(datos);

  const { data: existing } = await supabase
    .from("fce_periograma")
    .select("id, firmado")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  let id: string;

  if (existing) {
    if (existing.firmado) {
      return { success: false, error: "El periograma está firmado y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_periograma")
      .update({
        datos,
        notas: notas || null,
        indice_sangrado,
        profundidad_media,
        sitios_patologicos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "actualizar_periograma", id, idClinica, patientId);
  } else {
    const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
    if (!profesional) {
      return { success: false, error: "No se encontró el perfil profesional del usuario." };
    }

    const { data: created, error } = await supabase
      .from("fce_periograma")
      .insert({
        id_clinica: idClinica,
        id_paciente: patientId,
        id_encuentro: encuentroId,
        datos,
        notas: notas || null,
        indice_sangrado,
        profundidad_media,
        sitios_patologicos,
        firmado: false,
        registrado_por: profesional.id,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "crear_periograma", id, idClinica, patientId);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

export async function signPeriograma(
  periogramaId: string,
  patientId: string,
): Promise<ActionResult<{ firmado_at: string }>> {
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

  const { data: row } = await supabase
    .from("fce_periograma")
    .select("firmado")
    .eq("id", periogramaId)
    .single();

  if (!row) return { success: false, error: "Periograma no encontrado." };
  if (row.firmado) return { success: false, error: "El periograma ya está firmado." };

  const firmado_at = new Date().toISOString();

  const { error } = await supabase
    .from("fce_periograma")
    .update({
      firmado: true,
      firmado_at,
      firmado_por: profesional.id,
      updated_at: firmado_at,
    })
    .eq("id", periogramaId)
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "firmar_periograma", periogramaId, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { firmado_at } };
}
