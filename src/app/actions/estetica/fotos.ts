"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "@/lib/modules/guards";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { ActionResult } from "@/app/actions/patients";
import type { FichaEsteticaFoto, FichaEsteticaFotoConUrl, TipoFoto, RegionEstetica } from "@/types/estetica";

const BUCKET = "fichas-esteticas";
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutos
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * I3 — una fotografía ligada a una ficha (idFicha no nulo) hereda la
 * inmutabilidad post-firma de la ficha: si la ficha está firmada, no se puede
 * subir ni eliminar una foto asociada. Fotos de evolución sin ficha asociada
 * (idFicha null) no forman parte de un documento firmado, así que no aplica.
 * También valida tenancy (id_clinica) antes de exponer el estado de la ficha.
 */
async function assertFichaEditable(
  supabase: SupabaseClient,
  idFicha: string,
  idClinica: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: ficha } = await supabase
    .from("fce_fichas_esteticas")
    .select("firmado, id_clinica")
    .eq("id", idFicha)
    .maybeSingle();

  if (!ficha || ficha.id_clinica !== idClinica) {
    return { ok: false, error: "Ficha estética no encontrada." };
  }
  if (ficha.firmado) {
    return { ok: false, error: "La ficha estética está firmada y no puede modificarse." };
  }
  return { ok: true };
}

interface UploadFotoInput {
  idFicha: string | null;
  patientId: string;
  tipo: TipoFoto;
  region: RegionEstetica | null;
  zonaCodigo: string | null;
  file: File;
}

export async function uploadFotoFicha(
  input: UploadFotoInput,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const ext = ALLOWED_MIME[input.file.type];
  if (!ext) {
    return { success: false, error: "Formato de imagen no soportado. Usa JPG, PNG o WEBP." };
  }
  if (input.file.size > MAX_BYTES) {
    return { success: false, error: "La imagen supera el tamaño máximo permitido (8MB)." };
  }

  if (input.idFicha) {
    const editable = await assertFichaEditable(supabase, input.idFicha, idClinica);
    if (!editable.ok) return { success: false, error: editable.error };
  }

  // I5 — created_by usa profesionales.id (no el auth user id), igual que el
  // resto de escrituras del módulo (fichas.ts: created_by/firmado_por).
  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No se encontró el perfil profesional del usuario." };
  }

  const path = `${idClinica}/${input.patientId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });

  if (uploadError) {
    log("error", { action: "upload_foto_ficha_estetica", error: uploadError, id_clinica: idClinica });
    return { success: false, error: "No se pudo subir la fotografía." };
  }

  const { data: created, error } = await supabase
    .from("fce_ficha_estetica_fotos")
    .insert({
      id_ficha_estetica: input.idFicha,
      id_paciente: input.patientId,
      id_clinica: idClinica,
      tipo: input.tipo,
      storage_path: path,
      region: input.region,
      zona_codigo: input.zonaCodigo,
      tomada_at: new Date().toISOString(),
      created_by: profesional.id,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return dbError("ficha_estetica_fotos", error, { id_clinica: idClinica });
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "subir_foto_ficha_estetica",
    tipoEvento: "create",
    tablaAfectada: "fce_ficha_estetica_fotos",
    registroId: created.id,
    idClinica,
    idPaciente: input.patientId,
  });

  revalidatePath(`/dashboard/pacientes/${input.patientId}`);
  return { success: true, data: { id: created.id } };
}

async function withSignedUrls(
  supabase: SupabaseClient,
  fotos: FichaEsteticaFoto[],
): Promise<FichaEsteticaFotoConUrl[]> {
  const result: FichaEsteticaFotoConUrl[] = [];
  for (const foto of fotos) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(foto.storage_path, SIGNED_URL_TTL_SECONDS);
    result.push({ ...foto, signedUrl: data?.signedUrl ?? "" });
  }
  return result;
}

export async function getFotosFicha(
  idFicha: string,
): Promise<ActionResult<FichaEsteticaFotoConUrl[]>> {
  // I4 — requireContext() + filtro explícito de id_clinica en vez de confiar
  // solo en RLS.
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("*")
    .eq("id_ficha_estetica", idFicha)
    .eq("id_clinica", idClinica)
    .order("tomada_at", { ascending: true });

  if (error) return dbError("ficha_estetica_fotos", error, { id_clinica: idClinica });
  const withUrls = await withSignedUrls(supabase, (data ?? []) as FichaEsteticaFoto[]);
  return { success: true, data: withUrls };
}

export async function getFotosEvolucionPaciente(
  patientId: string,
): Promise<ActionResult<FichaEsteticaFotoConUrl[]>> {
  // I4 — idem getFotosFicha.
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("tomada_at", { ascending: true });

  if (error) return dbError("ficha_estetica_fotos", error, { id_clinica: idClinica });
  const withUrls = await withSignedUrls(supabase, (data ?? []) as FichaEsteticaFoto[]);
  return { success: true, data: withUrls };
}

export async function deleteFotoFicha(
  fotoId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  // I4 — ya usaba requireContext(); se agrega el filtro explícito de tenancy
  // sobre la fila encontrada (antes buscaba por id sin verificar id_clinica).
  const { supabase, user, idClinica } = await requireContext();

  const { data: foto } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("storage_path, id_ficha_estetica, id_clinica")
    .eq("id", fotoId)
    .maybeSingle();

  if (!foto || foto.id_clinica !== idClinica) {
    return { success: false, error: "Fotografía no encontrada." };
  }

  // I3 — bloquear el borrado si la foto pertenece a una ficha firmada.
  if (foto.id_ficha_estetica) {
    const editable = await assertFichaEditable(supabase, foto.id_ficha_estetica, idClinica);
    if (!editable.ok) return { success: false, error: editable.error };
  }

  const { error: deleteRowError } = await supabase
    .from("fce_ficha_estetica_fotos")
    .delete()
    .eq("id", fotoId);

  if (deleteRowError) return dbError("ficha_estetica_fotos", deleteRowError, { id_clinica: idClinica });

  await supabase.storage.from(BUCKET).remove([foto.storage_path]);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_foto_ficha_estetica",
    tipoEvento: "delete",
    tablaAfectada: "fce_ficha_estetica_fotos",
    registroId: fotoId,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}
