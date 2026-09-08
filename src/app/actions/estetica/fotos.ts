"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { dbError } from "@/lib/modules/guards";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
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
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return dbError("ficha_estetica_fotos", error);
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
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"],
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
  const { supabase } = await requireContext();

  const { data, error } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("*")
    .eq("id_ficha_estetica", idFicha)
    .order("tomada_at", { ascending: true });

  if (error) return dbError("ficha_estetica_fotos", error);
  const withUrls = await withSignedUrls(supabase, (data ?? []) as FichaEsteticaFoto[]);
  return { success: true, data: withUrls };
}

export async function getFotosEvolucionPaciente(
  patientId: string,
): Promise<ActionResult<FichaEsteticaFotoConUrl[]>> {
  const { supabase } = await requireContext();

  const { data, error } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("*")
    .eq("id_paciente", patientId)
    .order("tomada_at", { ascending: true });

  if (error) return dbError("ficha_estetica_fotos", error);
  const withUrls = await withSignedUrls(supabase, (data ?? []) as FichaEsteticaFoto[]);
  return { success: true, data: withUrls };
}

export async function deleteFotoFicha(
  fotoId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireContext();

  const { data: foto } = await supabase
    .from("fce_ficha_estetica_fotos")
    .select("storage_path")
    .eq("id", fotoId)
    .single();

  if (!foto) return { success: false, error: "Fotografía no encontrada." };

  const { error: deleteRowError } = await supabase
    .from("fce_ficha_estetica_fotos")
    .delete()
    .eq("id", fotoId);

  if (deleteRowError) return dbError("ficha_estetica_fotos", deleteRowError);

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
