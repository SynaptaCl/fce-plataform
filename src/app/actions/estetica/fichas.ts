"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { dbError, assertModuleEnabled, assertPuedeFirmar } from "@/lib/modules/guards";
import { requireContext } from "@/lib/auth";
import { getClinicaConfig } from "@/lib/modules/config";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo, type ProfesionalPerfil } from "@/lib/fce/profesional";
import { esZonaValida } from "@/lib/estetica/zonas";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ActionResult } from "@/app/actions/patients";
import type { Rol } from "@/lib/modules/registry";
import type {
  FichaEstetica,
  FichaEsteticaDetalle,
  FichaEsteticaZona,
  TipoFicha,
  RegionEstetica,
} from "@/types/estetica";

// ============================================================================
// Guard compartido para escrituras M13 (C3 — hallazgo de revisión final)
// ============================================================================
// Mirror del patrón M7 (src/app/actions/prescripciones.ts:107-141):
// requireContext → assertModuleEnabled → (opcional) assertPuedeFirmar →
// getProfesionalActivo → flag puede_estetica. Antes de este fix, solo el
// branch de creación de saveFichaEstetica hacía parte de esto ad hoc — el
// resto de los write-paths (update de saveFichaEstetica, upsertZona,
// deleteZona, signFichaEstetica) no verificaban módulo activo, rol ni el
// flag puede_estetica en absoluto.

interface EsteticaWriteContext {
  supabase: SupabaseClient;
  user: User;
  idClinica: string;
  rol: string;
  profesional: ProfesionalPerfil;
}

type GuardFailure = { success: false; error: string };

async function guardEsteticaWrite(
  opts: { requireFirmar?: boolean } = {}
): Promise<{ ok: true; ctx: EsteticaWriteContext } | { ok: false; error: GuardFailure }> {
  const { supabase, user, idClinica, rol } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M13_estetica");
  if (!moduleGuard.success) return { ok: false, error: moduleGuard };

  if (opts.requireFirmar) {
    const roleGuard = assertPuedeFirmar(rol as Rol);
    if (!roleGuard.success) return { ok: false, error: roleGuard };
  }

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return {
      ok: false,
      error: { success: false, error: "No se encontró el perfil profesional del usuario." },
    };
  }
  if (!profesional.puede_estetica) {
    return {
      ok: false,
      error: { success: false, error: "Tu perfil no tiene habilitado el módulo de estética." },
    };
  }

  return { ok: true, ctx: { supabase, user, idClinica, rol, profesional } };
}

// ============================================================================
// getFichaEstetica
// ============================================================================

export async function getFichaEstetica(
  encuentroId: string,
): Promise<ActionResult<FichaEsteticaDetalle | null>> {
  // I4 — requireContext() (no solo requireAuth()) + filtro explícito de
  // id_clinica: no depender solo de RLS como única barrera de tenancy.
  const { supabase, idClinica } = await requireContext();

  const { data: ficha, error } = await supabase
    .from("fce_fichas_esteticas")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (error) return dbError("ficha_estetica", error, { id_clinica: idClinica });
  if (!ficha) return { success: true, data: null };

  const { data: zonas, error: zonasError } = await supabase
    .from("fce_ficha_estetica_zonas")
    .select("*")
    .eq("id_ficha_estetica", ficha.id);

  if (zonasError) return dbError("ficha_estetica_zonas", zonasError, { id_clinica: idClinica });

  return {
    success: true,
    data: { ...(ficha as FichaEstetica), zonas: (zonas ?? []) as FichaEsteticaZona[] },
  };
}

// ============================================================================
// saveFichaEstetica
// ============================================================================

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
  const guard = await guardEsteticaWrite();
  if (!guard.ok) return guard.error;
  const { supabase, user, idClinica, profesional } = guard.ctx;

  const observaciones = input.observacionesGenerales
    ? sanitizeRichText(input.observacionesGenerales)
    : null;

  // C4 — el lookup de "existing" ya filtra por id_clinica: si el id_encuentro
  // pertenece a otra clínica no se lo trata como existente (cae al branch de
  // creación, donde la validación de encuentro de abajo lo rechaza).
  const { data: existing } = await supabase
    .from("fce_fichas_esteticas")
    .select("id, firmado")
    .eq("id_encuentro", input.encuentroId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  let id: string;

  if (existing) {
    // C2 — antes: `if (ficha) return ficha.id;` en el cliente hacía que este
    // branch de update nunca se alcanzara desde ensureFicha() tras el primer
    // guardado. Ahora ensureFicha() llama siempre a esta acción, y este UPDATE
    // persiste motivo/tipo_ficha/observaciones en cada blur.
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

    if (error) return dbError("ficha_estetica", error, { id_clinica: idClinica });
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
    // C4 — tenancy: verificar que el paciente y el encuentro pertenecen a la
    // clínica del actor antes de insertar (mirror de createAndSignPrescripcion
    // en prescripciones.ts:167-183).
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", input.patientId)
      .eq("id_clinica", idClinica)
      .maybeSingle();
    if (!paciente) return { success: false, error: "Paciente no encontrado." };

    const { data: encuentro } = await supabase
      .from("fce_encuentros")
      .select("id")
      .eq("id", input.encuentroId)
      .eq("id_paciente", input.patientId)
      .eq("id_clinica", idClinica)
      .maybeSingle();
    if (!encuentro) return { success: false, error: "Encuentro no encontrado." };

    const { data: created, error: insertError } = await supabase
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

    if (insertError) {
      // C5 — race de UI: la constraint única en id_encuentro (migration
      // 20260908_01) puede rechazar este INSERT con 23505 si otra request
      // concurrente ya creó la ficha del mismo encuentro. En vez de exponer
      // el error crudo, se reintenta como UPDATE sobre la fila que ganó la
      // carrera (equivalente a lo que hubiera pasado si esta request hubiera
      // llegado unos milisegundos más tarde).
      if (insertError.code === "23505") {
        const { data: race } = await supabase
          .from("fce_fichas_esteticas")
          .select("id, firmado")
          .eq("id_encuentro", input.encuentroId)
          .eq("id_clinica", idClinica)
          .maybeSingle();

        if (!race) return dbError("ficha_estetica", insertError, { id_clinica: idClinica });
        if (race.firmado) {
          return { success: false, error: "La ficha estética está firmada y no puede modificarse." };
        }

        const { error: raceUpdateError } = await supabase
          .from("fce_fichas_esteticas")
          .update({
            tipo_ficha: input.tipoFicha,
            motivo: input.motivo,
            observaciones_generales: observaciones,
            updated_at: new Date().toISOString(),
          })
          .eq("id", race.id);

        if (raceUpdateError) return dbError("ficha_estetica", raceUpdateError, { id_clinica: idClinica });

        await logAudit({
          supabase,
          actorId: user.id,
          accion: "guardar_ficha_estetica",
          tipoEvento: "update",
          tablaAfectada: "fce_fichas_esteticas",
          registroId: race.id,
          idClinica,
          idPaciente: input.patientId,
        });

        revalidatePath(`/dashboard/pacientes/${input.patientId}`);
        return { success: true, data: { id: race.id } };
      }

      return dbError("ficha_estetica", insertError, { id_clinica: idClinica });
    }

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

// ============================================================================
// upsertZona
// ============================================================================

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
  const guard = await guardEsteticaWrite();
  if (!guard.ok) return guard.error;
  const { supabase, user, idClinica } = guard.ctx;

  if (!esZonaValida(zona.region, zona.zonaCodigo)) {
    return { success: false, error: `Zona inválida: "${zona.zonaCodigo}" para región ${zona.region}.` };
  }

  // C4 — verificar que la ficha exista Y pertenezca a la clínica del actor
  // antes de escribir su zona (no confiar solo en RLS). Error genérico si no
  // matchea, para no revelar si el id existe en otra clínica.
  const { data: ficha } = await supabase
    .from("fce_fichas_esteticas")
    .select("id, firmado, id_clinica")
    .eq("id", idFicha)
    .maybeSingle();

  if (!ficha || ficha.id_clinica !== idClinica) {
    return { success: false, error: "Ficha estética no encontrada." };
  }
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
    if (error) return dbError("ficha_estetica_zonas", error, { id_clinica: idClinica });
    id = zona.id;
  } else {
    const { data: created, error } = await supabase
      .from("fce_ficha_estetica_zonas")
      .insert(payload)
      .select("id")
      .single();
    if (error) return dbError("ficha_estetica_zonas", error, { id_clinica: idClinica });
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

// ============================================================================
// deleteZona
// ============================================================================

export async function deleteZona(
  zonaId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  const guard = await guardEsteticaWrite();
  if (!guard.ok) return guard.error;
  const { supabase, user, idClinica } = guard.ctx;

  // C4 — la zona no tiene id_clinica propio; se valida vía join a la ficha
  // padre (antes esta función no verificaba tenancy NI estado de firma en
  // absoluto — el trigger de DB bloqueaba el DELETE post-firma, pero sin
  // verificación en la capa app el error crudo de Postgres llegaba al cliente).
  const { data: zona } = await supabase
    .from("fce_ficha_estetica_zonas")
    .select("id, id_ficha_estetica")
    .eq("id", zonaId)
    .maybeSingle();

  if (!zona) return { success: false, error: "Zona no encontrada." };

  const { data: ficha } = await supabase
    .from("fce_fichas_esteticas")
    .select("id, firmado, id_clinica")
    .eq("id", zona.id_ficha_estetica)
    .maybeSingle();

  if (!ficha || ficha.id_clinica !== idClinica) {
    return { success: false, error: "Zona no encontrada." };
  }
  if (ficha.firmado) {
    return { success: false, error: "La ficha estética está firmada y no puede modificarse." };
  }

  const { error } = await supabase
    .from("fce_ficha_estetica_zonas")
    .delete()
    .eq("id", zonaId);

  if (error) return dbError("ficha_estetica_zonas", error, { id_clinica: idClinica });

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

// ============================================================================
// signFichaEstetica
// ============================================================================

export async function signFichaEstetica(
  fichaId: string,
  patientId: string,
): Promise<ActionResult<{ firmado_at: string }>> {
  // C3 — la más seria de las cuatro: firmar es un acto legalmente vinculante
  // y antes no verificaba módulo activo, rol ni flag puede_estetica (solo
  // resolvía el profesional activo para escribir firmado_por).
  const guard = await guardEsteticaWrite({ requireFirmar: true });
  if (!guard.ok) return guard.error;
  const { supabase, user, idClinica, profesional } = guard.ctx;

  const { data: row } = await supabase
    .from("fce_fichas_esteticas")
    .select("firmado, id_clinica")
    .eq("id", fichaId)
    .maybeSingle();

  if (!row || row.id_clinica !== idClinica) {
    return { success: false, error: "Ficha estética no encontrada." };
  }
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

  if (error) return dbError("ficha_estetica", error, { id_clinica: idClinica });

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
