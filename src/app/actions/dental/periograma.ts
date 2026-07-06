"use server";

import { dbError } from "@/lib/modules/guards";
import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import {
  calcularIndiceSangrado,
  calcularProfundidadMedia,
  calcularSitiosPatologicos,
} from "@/lib/dental/periograma";
import type { ActionResult } from "@/app/actions/patients";
import type { Periograma, PeriogramaPiezaDatos } from "@/types/periograma";
import type { ICDCodeSnap } from "@/lib/icd/types";

export async function getPeriograma(
  encuentroId: string,
): Promise<ActionResult<Periograma | null>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_periograma")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  if (error) return dbError("periograma", error);
  return { success: true, data: data as Periograma | null };
}

export async function savePeriograma(
  encuentroId: string,
  patientId: string,
  datos: PeriogramaPiezaDatos[],
  notas: string | null,
  diagnosticoIcd?: ICDCodeSnap,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

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
        diagnostico_icd: diagnosticoIcd ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return dbError("periograma", error);
    id = existing.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "guardar_periograma",
      tipoEvento: "update",
      tablaAfectada: "fce_periograma",
      registroId: id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
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
        diagnostico_icd: diagnosticoIcd ?? {},
        firmado: false,
        registrado_por: profesional.id,
      })
      .select("id")
      .single();

    if (error) return dbError("periograma", error);
    id = created.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "guardar_periograma",
      tipoEvento: "update",
      tablaAfectada: "fce_periograma",
      registroId: id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

export async function signPeriograma(
  periogramaId: string,
  patientId: string,
): Promise<ActionResult<{ firmado_at: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
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

  if (error) return dbError("periograma", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_periograma",
    tipoEvento: "sign",
    tablaAfectada: "fce_periograma",
    registroId: periogramaId,
    idClinica: idClinica,
    idPaciente: patientId,
  });
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { firmado_at } };
}
