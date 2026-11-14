"use server";

/**
 * ADJ-1 — Server actions de adjuntos clínicos.
 * Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
 *
 * Arquitectura de subida (plan D3 — upload directo del cliente):
 *   1. prepararSubidaAdjunto  → valida input/tenancy/M8-link y retorna el
 *      storagePath canónico (el path SIEMPRE lo genera el servidor).
 *   2. El cliente sube el objeto con supabase-js (browser client, JWT del
 *      usuario) — las policies del bucket adjuntos-clinicos enforcementan
 *      tenant + rol en el INSERT del objeto.
 *   3. registrarAdjunto → descarga el objeto, detecta el MIME real por magic
 *      bytes (no confía en lo declarado), valida tamaño real, inserta la fila
 *      y audita. Ante cualquier fallo elimina el objeto (sin huérfanos).
 *
 * Matriz de permisos (app-layer sobre RLS):
 *   subir    → profesional (auto-validado) | recepcionista/director (pendiente)
 *   validar  → solo profesional
 *   anular   → solo profesional (soft; adjunto validado nunca se borra)
 *   eliminar → hard, SOLO pendientes: uploader o profesional
 */

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { assertModuleEnabled, dbError, type ActionResult } from "@/lib/modules/guards";
import { getClinicaConfig } from "@/lib/modules/config";
import { ROLES_QUE_SUBEN_ADJUNTOS, type Rol } from "@/lib/modules/registry";
import {
  AdjuntoInputSchema,
  ValidarAdjuntoSchema,
  AnularAdjuntoSchema,
} from "@/lib/adjuntos/validations";
import {
  BUCKET_ADJUNTOS,
  TTL_URL_FIRMADA_SEG,
  construirStoragePath,
  detectarMime,
  limiteParaMime,
  MIME_A_EXT,
} from "@/lib/adjuntos/archivo";
import type { Adjunto, AdjuntoConUrl } from "@/types/adjunto";

// ── Helpers privados (no exportados: archivo "use server") ──────────────────

function assertRolUploader(rol: string): ActionResult<true> {
  if (!ROLES_QUE_SUBEN_ADJUNTOS.includes(rol as Rol)) {
    return { success: false, error: "Tu rol no permite subir adjuntos." };
  }
  return { success: true, data: true };
}

function assertRolProfesional(rol: string, profesionalId: string | null): ActionResult<true> {
  if (rol !== "profesional" || !profesionalId) {
    return { success: false, error: "Solo un profesional puede realizar esta acción." };
  }
  return { success: true, data: true };
}

/** Tenancy explícita del paciente (defense in depth — patrón I4 de M13). */
async function pacienteDeLaClinica(
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"],
  patientId: string,
  idClinica: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();
  return data !== null;
}

async function ordenExamenDeLaClinica(
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"],
  ordenId: string,
  patientId: string,
  idClinica: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("fce_ordenes_examen")
    .select("id")
    .eq("id", ordenId)
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();
  return data !== null;
}

async function encuentroDelPaciente(
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"],
  encuentroId: string,
  patientId: string,
  idClinica: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("fce_encuentros")
    .select("id")
    .eq("id", encuentroId)
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();
  return data !== null;
}

async function withSignedUrls(
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"],
  adjuntos: Adjunto[],
): Promise<AdjuntoConUrl[]> {
  const aFirmar = adjuntos.filter((a) => !a.anulado).map((a) => a.storage_path);
  const urls = new Map<string, string>();
  if (aFirmar.length > 0) {
    const { data, error } = await supabase.storage
      .from(BUCKET_ADJUNTOS)
      .createSignedUrls(aFirmar, TTL_URL_FIRMADA_SEG);
    if (error) {
      log("error", { action: "adjuntos_signed_urls", error, ctx: "batch" });
    }
    for (const item of data ?? []) {
      if (item?.signedUrl && item.path) urls.set(item.path, item.signedUrl);
    }
  }
  return adjuntos.map((a) => ({ ...a, signedUrl: urls.get(a.storage_path) ?? null }));
}

// ── Subida (paso 1: preparar) ────────────────────────────────────────────────

export async function prepararSubidaAdjunto(
  input: unknown,
): Promise<ActionResult<{ storagePath: string; bucket: string; mime: string }>> {
  const parsed = AdjuntoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const { supabase, idClinica, rol } = await requireContext();
  const rolGuard = assertRolUploader(rol);
  if (!rolGuard.success) return rolGuard;

  if (!(await pacienteDeLaClinica(supabase, d.patientId, idClinica))) {
    return { success: false, error: "Paciente no encontrado." };
  }

  if (d.idOrdenExamen) {
    const config = await getClinicaConfig(idClinica, supabase);
    const moduleGuard = assertModuleEnabled(config, "M8_examenes");
    if (!moduleGuard.success) return moduleGuard;
    if (!(await ordenExamenDeLaClinica(supabase, d.idOrdenExamen, d.patientId, idClinica))) {
      return { success: false, error: "La orden de examen no corresponde a este paciente." };
    }
  }

  if (d.idEncuentro && !(await encuentroDelPaciente(supabase, d.idEncuentro, d.patientId, idClinica))) {
    return { success: false, error: "El encuentro no corresponde a este paciente." };
  }

  const ext = MIME_A_EXT[d.mimeDeclarado];
  return {
    success: true,
    data: { storagePath: construirStoragePath(idClinica, d.patientId, ext), bucket: BUCKET_ADJUNTOS, mime: d.mimeDeclarado },
  };
}

// ── Subida (paso 3: registrar tras el upload directo) ───────────────────────

export async function registrarAdjunto(
  input: unknown,
): Promise<ActionResult<Adjunto>> {
  const parsed = AdjuntoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const { supabase, user, idClinica, rol, profesionalId } = await requireContext();
  const rolGuard = assertRolUploader(rol);
  if (!rolGuard.success) return rolGuard;

  if (!(await pacienteDeLaClinica(supabase, d.patientId, idClinica))) {
    return { success: false, error: "Paciente no encontrado." };
  }
  if (d.idOrdenExamen && !(await ordenExamenDeLaClinica(supabase, d.idOrdenExamen, d.patientId, idClinica))) {
    return { success: false, error: "La orden de examen no corresponde a este paciente." };
  }
  if (d.idEncuentro && !(await encuentroDelPaciente(supabase, d.idEncuentro, d.patientId, idClinica))) {
    return { success: false, error: "El encuentro no corresponde a este paciente." };
  }

  if (rol === "profesional" && !profesionalId) {
    return { success: false, error: "No se encontró el perfil profesional del usuario." };
  }

  const storagePath = (input as { storagePath?: string } | null)?.storagePath;
  if (typeof storagePath !== "string" || !storagePath.startsWith(`${idClinica}/${d.patientId}/`)) {
    return { success: false, error: "Ruta de almacenamiento inválida. Usa prepararSubidaAdjunto." };
  }

  // Descargar el objeto y validar por CONTENIDO (magic bytes), no por lo declarado.
  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET_ADJUNTOS)
    .download(storagePath);
  if (downloadError || !blob) {
    log("error", { action: "registrar_adjunto_download", error: downloadError, id_clinica: idClinica });
    return { success: false, error: "No se encontró el archivo subido. Intenta de nuevo." };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mimeReal = detectarMime(bytes);
  if (!mimeReal) {
    await supabase.storage.from(BUCKET_ADJUNTOS).remove([storagePath]);
    return { success: false, error: "El archivo no corresponde a un formato permitido (JPG, PNG, WEBP o PDF) o está corrupto." };
  }
  const limite = limiteParaMime(mimeReal);
  const tamanoReal = bytes.byteLength;
  if (limite === null || tamanoReal > limite || tamanoReal === 0) {
    await supabase.storage.from(BUCKET_ADJUNTOS).remove([storagePath]);
    const mb = limite === null ? 0 : Math.round(limite / (1024 * 1024));
    return { success: false, error: `El archivo supera el tamaño máximo permitido (${mb}MB).` };
  }

  const esProfesional = rol === "profesional";
  const ahora = new Date().toISOString();

  const { data: created, error: insertError } = await supabase
    .from("fce_adjuntos")
    .insert({
      id_clinica: idClinica,
      id_paciente: d.patientId,
      id_encuentro: d.idEncuentro,
      id_orden_examen: d.idOrdenExamen,
      categoria: d.categoria,
      descripcion: d.descripcion?.trim() || null,
      nombre_archivo_original: d.nombreArchivoOriginal,
      mime_type: mimeReal,
      storage_path: storagePath,
      tamano_bytes: tamanoReal,
      fecha_documento: d.fechaDocumento,
      estado_validacion: esProfesional ? "validado" : "pendiente",
      validado_por: esProfesional ? profesionalId : null,
      validado_at: esProfesional ? ahora : null,
      created_by: user.id, // ⚠ auth uid (desviación D2 — ver migration 20261114_01)
      created_by_rol: rol,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    await supabase.storage.from(BUCKET_ADJUNTOS).remove([storagePath]);
    return dbError("registrar_adjunto", insertError, { id_clinica: idClinica });
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "subir_adjunto",
    tipoEvento: "create",
    tablaAfectada: "fce_adjuntos",
    registroId: created.id,
    idClinica,
    idPaciente: d.patientId,
  });

  revalidatePath(`/dashboard/pacientes/${d.patientId}`);
  return { success: true, data: created as Adjunto };
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export async function getAdjuntosPaciente(patientId: string): Promise<ActionResult<AdjuntoConUrl[]>> {
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_adjuntos")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return dbError("get_adjuntos_paciente", error, { id_clinica: idClinica });
  return { success: true, data: await withSignedUrls(supabase, (data ?? []) as Adjunto[]) };
}

export async function getAdjuntosDeOrden(ordenId: string): Promise<ActionResult<AdjuntoConUrl[]>> {
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_adjuntos")
    .select("*")
    .eq("id_orden_examen", ordenId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return dbError("get_adjuntos_orden", error, { id_clinica: idClinica });
  return { success: true, data: await withSignedUrls(supabase, (data ?? []) as Adjunto[]) };
}

/** Pendientes subidos por el usuario actual (recepcionista/director). Sin URLs firmadas (minimización PHI — plan D4). */
export async function getMisAdjuntosPendientes(): Promise<ActionResult<Adjunto[]>> {
  const { supabase, user, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_adjuntos")
    .select("*")
    .eq("created_by", user.id)
    .eq("id_clinica", idClinica)
    .eq("estado_validacion", "pendiente")
    .eq("anulado", false)
    .order("created_at", { ascending: false });

  if (error) return dbError("get_mis_adjuntos_pendientes", error, { id_clinica: idClinica });
  return { success: true, data: (data ?? []) as Adjunto[] };
}

/** Órdenes del paciente para el dropdown de vínculo (vacío si M8 inactivo). */
export async function getOrdenesParaVinculo(
  patientId: string,
): Promise<ActionResult<{ id: string; folio_display: string | null; created_at: string; estado_resultados: string }[]>> {
  const { supabase, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  if (!config) return { success: true, data: [] };

  const moduleGuard = assertModuleEnabled(config, "M8_examenes");
  if (!moduleGuard.success) return { success: true, data: [] };

  const { data, error } = await supabase
    .from("fce_ordenes_examen")
    .select("id, folio_display, created_at, estado_resultados")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return dbError("get_ordenes_para_vinculo", error, { id_clinica: idClinica });
  return {
    success: true,
    data: (data ?? []).map((o) => ({
      id: o.id,
      folio_display: o.folio_display,
      created_at: o.created_at,
      estado_resultados: o.estado_resultados,
    })),
  };
}

// ── Validación / anulación / eliminación ─────────────────────────────────────

export async function validarAdjunto(
  adjuntoId: string,
  estadoResultados: "parcial" | "completo" | null = null,
): Promise<ActionResult<void>> {
  const parsed = ValidarAdjuntoSchema.safeParse({ adjuntoId, estadoResultados });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { supabase, user, idClinica, rol, profesionalId } = await requireContext();
  const rolGuard = assertRolProfesional(rol, profesionalId);
  if (!rolGuard.success) return rolGuard;

  const { data: adjunto } = await supabase
    .from("fce_adjuntos")
    .select("id, id_clinica, id_paciente, id_orden_examen, estado_validacion, anulado")
    .eq("id", adjuntoId)
    .maybeSingle();

  if (!adjunto || adjunto.id_clinica !== idClinica) {
    return { success: false, error: "Adjunto no encontrado." };
  }
  if (adjunto.anulado) {
    return { success: false, error: "El adjunto está anulado." };
  }
  if (adjunto.estado_validacion !== "pendiente") {
    return { success: false, error: "El adjunto ya fue validado." };
  }

  const ahora = new Date().toISOString();
  const { error: updError } = await supabase
    .from("fce_adjuntos")
    .update({
      estado_validacion: "validado",
      validado_por: profesionalId,
      validado_at: ahora,
      updated_at: ahora,
    })
    .eq("id", adjuntoId);

  if (updError) return dbError("validar_adjunto", updError, { id_clinica: idClinica });

  // Vínculo M8: estado_resultados es actualizable post-firma (el trigger
  // block_update_signed_orden_examen solo bloquea contenido clínico —
  // verificado en 20260425_03 y contra prod 2026-11-14).
  if (adjunto.id_orden_examen && parsed.data.estadoResultados) {
    const { error: ordenError } = await supabase
      .from("fce_ordenes_examen")
      .update({ estado_resultados: parsed.data.estadoResultados, updated_at: ahora })
      .eq("id", adjunto.id_orden_examen)
      .eq("id_paciente", adjunto.id_paciente)
      .eq("id_clinica", idClinica);

    if (ordenError) {
      log("error", { action: "validar_adjunto_estado_orden", error: ordenError, id_clinica: idClinica });
      // El adjunto quedó validado; el estado de la orden se puede corregir a mano.
    }
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "validar_adjunto",
    tipoEvento: "update",
    tablaAfectada: "fce_adjuntos",
    registroId: adjuntoId,
    idClinica,
    idPaciente: adjunto.id_paciente,
    datosAfter: parsed.data.estadoResultados
      ? { estado_resultados: parsed.data.estadoResultados }
      : undefined,
  });

  revalidatePath(`/dashboard/pacientes/${adjunto.id_paciente}`);
  return { success: true, data: undefined };
}

export async function anularAdjunto(adjuntoId: string, motivo: string): Promise<ActionResult<void>> {
  const parsed = AnularAdjuntoSchema.safeParse({ adjuntoId, motivo });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { supabase, user, idClinica, rol, profesionalId } = await requireContext();
  const rolGuard = assertRolProfesional(rol, profesionalId);
  if (!rolGuard.success) return rolGuard;

  const { data: adjunto } = await supabase
    .from("fce_adjuntos")
    .select("id, id_clinica, id_paciente, anulado")
    .eq("id", adjuntoId)
    .maybeSingle();

  if (!adjunto || adjunto.id_clinica !== idClinica) {
    return { success: false, error: "Adjunto no encontrado." };
  }
  if (adjunto.anulado) {
    return { success: false, error: "El adjunto ya está anulado." };
  }

  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("fce_adjuntos")
    .update({
      anulado: true,
      anulado_motivo: parsed.data.motivo,
      anulado_por: user.id,
      anulado_at: ahora,
      updated_at: ahora,
    })
    .eq("id", adjuntoId);

  if (error) return dbError("anular_adjunto", error, { id_clinica: idClinica });

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "anular_adjunto",
    tipoEvento: "update",
    tablaAfectada: "fce_adjuntos",
    registroId: adjuntoId,
    idClinica,
    idPaciente: adjunto.id_paciente,
    datosAfter: { motivo: parsed.data.motivo },
  });

  revalidatePath(`/dashboard/pacientes/${adjunto.id_paciente}`);
  return { success: true, data: undefined };
}

export async function eliminarAdjunto(adjuntoId: string): Promise<ActionResult<void>> {
  const { supabase, user, idClinica, rol } = await requireContext();

  const { data: adjunto } = await supabase
    .from("fce_adjuntos")
    .select("id, id_clinica, id_paciente, storage_path, estado_validacion, anulado, created_by")
    .eq("id", adjuntoId)
    .maybeSingle();

  if (!adjunto || adjunto.id_clinica !== idClinica) {
    return { success: false, error: "Adjunto no encontrado." };
  }
  // Hard delete SOLO pendientes (un adjunto validado se anula, no se borra — plan D4).
  if (adjunto.estado_validacion !== "pendiente" || adjunto.anulado) {
    return { success: false, error: "Solo se pueden eliminar adjuntos pendientes. Los validados se anulan." };
  }
  if (adjunto.created_by !== user.id && rol !== "profesional") {
    return { success: false, error: "Solo quien subió el adjunto o un profesional puede eliminarlo." };
  }

  const { error: deleteError } = await supabase.from("fce_adjuntos").delete().eq("id", adjuntoId);
  if (deleteError) return dbError("eliminar_adjunto", deleteError, { id_clinica: idClinica });

  // La fila ya se borró: si el storage falla queda un huérfano — log para limpieza manual.
  const { error: storageError } = await supabase.storage.from(BUCKET_ADJUNTOS).remove([adjunto.storage_path]);
  if (storageError) {
    log("error", { action: "eliminar_adjunto_storage", error: storageError, storage_path: adjunto.storage_path });
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_adjunto",
    tipoEvento: "delete",
    tablaAfectada: "fce_adjuntos",
    registroId: adjuntoId,
    idClinica,
    idPaciente: adjunto.id_paciente,
  });

  revalidatePath(`/dashboard/pacientes/${adjunto.id_paciente}`);
  return { success: true, data: undefined };
}

/** URL firmada fresca bajo demanda (las URLs del listado expiran en 10 min — el botón "Ver" siempre re-solicita). */
export async function getAdjuntoUrl(
  adjuntoId: string
): Promise<ActionResult<{ signedUrl: string; mime: string; anulado: boolean }>> {
  const { supabase, idClinica } = await requireContext();

  const { data: adj } = await supabase
    .from("fce_adjuntos")
    .select("id, id_clinica, id_paciente, storage_path, mime_type, anulado")
    .eq("id", adjuntoId)
    .maybeSingle();

  if (!adj || adj.id_clinica !== idClinica) {
    return { success: false, error: "Adjunto no encontrado." };
  }
  if (adj.anulado) {
    return { success: false, error: "El adjunto está anulado." };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_ADJUNTOS)
    .createSignedUrl(adj.storage_path, TTL_URL_FIRMADA_SEG);

  if (error || !data?.signedUrl) {
    return dbError("get_adjunto_url", error, { id_clinica: idClinica });
  }
  return { success: true, data: { signedUrl: data.signedUrl, mime: adj.mime_type, anulado: false } };
}

// ── Búsqueda de pacientes (vista /dashboard/adjuntos — recepcionista) ────────

export interface PacienteBusquedaAdjuntos {
  id: string;
  nombre_completo: string;
  rut: string | null;
}

export async function buscarPacientesParaAdjuntos(
  query: string
): Promise<ActionResult<PacienteBusquedaAdjuntos[]>> {
  const { supabase, idClinica } = await requireContext();

  // Sanea antes de interpolar en .or() de PostgREST (mismo criterio que searchExamenes).
  const term = query.replace(/[,()%]/g, " ").trim();
  if (term.length < 2) return { success: true, data: [] };

  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido_paterno, apellido_materno, rut")
    .eq("id_clinica", idClinica)
    .or(`nombre.ilike.%${term}%,apellido_paterno.ilike.%${term}%,apellido_materno.ilike.%${term}%,rut.ilike.%${term}%`)
    .order("nombre")
    .limit(10);

  if (error) return dbError("buscar_pacientes_adjuntos", error, { id_clinica: idClinica });
  return {
    success: true,
    data: (data ?? []).map((p) => ({
      id: p.id,
      nombre_completo: [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" "),
      rut: p.rut ?? null,
    })),
  };
}

// ── Audit de descarga ────────────────────────────────────────────────────────

export async function auditarDescargaAdjunto(adjuntoId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireAuth();

  const { data: adjunto } = await supabase
    .from("fce_adjuntos")
    .select("id_clinica, id_paciente")
    .eq("id", adjuntoId)
    .maybeSingle();

  if (!adjunto?.id_clinica) return { success: true, data: undefined };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "descargar_adjunto",
    tipoEvento: "read_ficha",
    tablaAfectada: "fce_adjuntos",
    registroId: adjuntoId,
    idClinica: adjunto.id_clinica,
    idPaciente: adjunto.id_paciente,
  });

  return { success: true, data: undefined };
}
