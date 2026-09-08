"use server";

import { revalidatePath } from "next/cache";
import { dbError } from "@/lib/modules/guards";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { esZonaValida } from "@/lib/estetica/zonas";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ActionResult } from "@/app/actions/patients";
import type {
  FichaEstetica,
  FichaEsteticaDetalle,
  FichaEsteticaZona,
  TipoFicha,
  RegionEstetica,
} from "@/types/estetica";

export async function getFichaEstetica(
  encuentroId: string,
): Promise<ActionResult<FichaEsteticaDetalle | null>> {
  const { supabase } = await requireAuth();

  const { data: ficha, error } = await supabase
    .from("fce_fichas_esteticas")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  if (error) return dbError("ficha_estetica", error);
  if (!ficha) return { success: true, data: null };

  const { data: zonas, error: zonasError } = await supabase
    .from("fce_ficha_estetica_zonas")
    .select("*")
    .eq("id_ficha_estetica", ficha.id);

  if (zonasError) return dbError("ficha_estetica_zonas", zonasError);

  return {
    success: true,
    data: { ...(ficha as FichaEstetica), zonas: (zonas ?? []) as FichaEsteticaZona[] },
  };
}

interface SaveFichaEsteticaInput {
  encuentroId: string;
  patientId: string;
  tipoFicha: TipoFicha;
  motivo: string | null;
  observacionesGenerales: string | null;
}

export async function saveFichaEstetica(
  input: SaveFichaEsteticaInput,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const observaciones = input.observacionesGenerales
    ? sanitizeRichText(input.observacionesGenerales)
    : null;

  const { data: existing } = await supabase
    .from("fce_fichas_esteticas")
    .select("id, firmado")
    .eq("id_encuentro", input.encuentroId)
    .maybeSingle();

  let id: string;

  if (existing) {
    if (existing.firmado) {
      return { success: false, error: "La ficha estética está firmada y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_fichas_esteticas")
      .update({
        tipo_ficha: input.tipoFicha,
        motivo: input.motivo,
        observaciones_generales: observaciones,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return dbError("ficha_estetica", error);
    id = existing.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "guardar_ficha_estetica",
      tipoEvento: "update",
      tablaAfectada: "fce_fichas_esteticas",
      registroId: id,
      idClinica,
      idPaciente: input.patientId,
    });
  } else {
    const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
    if (!profesional) {
      return { success: false, error: "No se encontró el perfil profesional del usuario." };
    }
    if (!profesional.puede_estetica) {
      return { success: false, error: "Tu perfil no tiene habilitado el módulo de estética." };
    }

    const { data: created, error } = await supabase
      .from("fce_fichas_esteticas")
      .insert({
        id_clinica: idClinica,
        id_paciente: input.patientId,
        id_encuentro: input.encuentroId,
        created_by: profesional.id,
        tipo_ficha: input.tipoFicha,
        motivo: input.motivo,
        observaciones_generales: observaciones,
        firmado: false,
      })
      .select("id")
      .single();

    if (error) return dbError("ficha_estetica", error);
    id = created.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "crear_ficha_estetica",
      tipoEvento: "create",
      tablaAfectada: "fce_fichas_esteticas",
      registroId: id,
      idClinica,
      idPaciente: input.patientId,
    });
  }

  revalidatePath(`/dashboard/pacientes/${input.patientId}`);
  return { success: true, data: { id } };
}

interface UpsertZonaInput {
  id?: string;
  region: RegionEstetica;
  zonaCodigo: string;
  idProcedimiento: string | null;
  productoComercial: string | null;
  lote: string | null;
  dosis: number | null;
  unidadDosis: string | null;
  tecnica: string | null;
  observaciones: string | null;
}

export async function upsertZona(
  idFicha: string,
  patientId: string,
  zona: UpsertZonaInput,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  if (!esZonaValida(zona.region, zona.zonaCodigo)) {
    return { success: false, error: `Zona inválida: "${zona.zonaCodigo}" para región ${zona.region}.` };
  }

  const { data: ficha } = await supabase
    .from("fce_fichas_esteticas")
    .select("id, firmado")
    .eq("id", idFicha)
    .single();

  if (!ficha) return { success: false, error: "Ficha estética no encontrada." };
  if (ficha.firmado) {
    return { success: false, error: "La ficha estética está firmada y no puede modificarse." };
  }

  const payload = {
    id_ficha_estetica: idFicha,
    region: zona.region,
    zona_codigo: zona.zonaCodigo,
    id_procedimiento: zona.idProcedimiento,
    producto_comercial: zona.productoComercial,
    lote: zona.lote,
    dosis: zona.dosis,
    unidad_dosis: zona.unidadDosis,
    tecnica: zona.tecnica,
    observaciones: zona.observaciones ? sanitizeRichText(zona.observaciones) : null,
  };

  let id: string;
  if (zona.id) {
    const { error } = await supabase
      .from("fce_ficha_estetica_zonas")
      .update(payload)
      .eq("id", zona.id);
    if (error) return dbError("ficha_estetica_zonas", error);
    id = zona.id;
  } else {
    const { data: created, error } = await supabase
      .from("fce_ficha_estetica_zonas")
      .insert(payload)
      .select("id")
      .single();
    if (error) return dbError("ficha_estetica_zonas", error);
    id = created.id;
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "guardar_zona_ficha_estetica",
    tipoEvento: "update",
    tablaAfectada: "fce_ficha_estetica_zonas",
    registroId: id,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

export async function deleteZona(
  zonaId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireContext();

  const { error } = await supabase
    .from("fce_ficha_estetica_zonas")
    .delete()
    .eq("id", zonaId);

  if (error) return dbError("ficha_estetica_zonas", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_zona_ficha_estetica",
    tipoEvento: "delete",
    tablaAfectada: "fce_ficha_estetica_zonas",
    registroId: zonaId,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

export async function signFichaEstetica(
  fichaId: string,
  patientId: string,
): Promise<ActionResult<{ firmado_at: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No se encontró el perfil profesional del usuario." };
  }

  const { data: row } = await supabase
    .from("fce_fichas_esteticas")
    .select("firmado")
    .eq("id", fichaId)
    .single();

  if (!row) return { success: false, error: "Ficha estética no encontrada." };
  if (row.firmado) return { success: false, error: "La ficha estética ya está firmada." };

  const { data: zonas } = await supabase
    .from("fce_ficha_estetica_zonas")
    .select("id")
    .eq("id_ficha_estetica", fichaId);

  if (!zonas || zonas.length === 0) {
    return { success: false, error: "Registra al menos una zona tratada antes de firmar." };
  }

  const firmado_at = new Date().toISOString();

  const { error } = await supabase
    .from("fce_fichas_esteticas")
    .update({
      firmado: true,
      firmado_at,
      firmado_por: profesional.id,
      updated_at: firmado_at,
    })
    .eq("id", fichaId)
    .eq("firmado", false);

  if (error) return dbError("ficha_estetica", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_ficha_estetica",
    tipoEvento: "sign",
    tablaAfectada: "fce_fichas_esteticas",
    registroId: fichaId,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { firmado_at } };
}
