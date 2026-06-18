"use server";

import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getIdClinica } from "@/app/actions/patients";
import { calcularPuntaje } from "@/lib/instrumentos/calcular";
import { interpretarPuntaje } from "@/lib/instrumentos/interpretar";
import type { ActionResult } from "@/app/actions/patients";
import type { InstrumentoSchema, InstrumentoAplicado } from "@/types/instrumento";

// ── getCatalogoInstrumentos ───────────────────────────────────────────────────

export async function getCatalogoInstrumentos(
  especialidad: string,
): Promise<ActionResult<InstrumentoSchema[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("instrumentos_valoracion")
    .select("*")
    .eq("activo", true)
    .contains("especialidades", [especialidad]);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as InstrumentoSchema[] };
}

// ── getInstrumentosAplicados ──────────────────────────────────────────────────

export async function getInstrumentosAplicados(
  encuentroId: string,
): Promise<ActionResult<InstrumentoAplicado[]>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("instrumentos_aplicados")
    .select("*, instrumento:instrumentos_valoracion(*)")
    .eq("id_encuentro", encuentroId)
    .eq("id_clinica", idClinica)
    .order("aplicado_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as InstrumentoAplicado[] };
}

// ── aplicarInstrumento ────────────────────────────────────────────────────────

export async function aplicarInstrumento(params: {
  encuentroId: string;
  patientId: string;
  instrumentoId: string;
  respuestas: Record<string, number | string>;
  notas?: string;
  mostrarEnTimeline?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const { encuentroId, patientId, instrumentoId, respuestas, notas, mostrarEnTimeline } = params;

  const { supabase, user, idClinica } = await requireContext();

  // Fetch del instrumento para obtener schema_items e interpretacion
  const { data: instrumento, error: instrError } = await supabase
    .from("instrumentos_valoracion")
    .select("*")
    .eq("id", instrumentoId)
    .single();

  if (instrError || !instrumento) {
    return { success: false, error: "Instrumento no encontrado." };
  }

  const schema = instrumento as InstrumentoSchema;

  // Para instrumentos de tipo registro_externo: NO calcular puntaje numérico
  if (schema.tipo_renderer === "registro_externo") {
    // La clasificación viene en respuestas.clasificacion
    const clasificacion = typeof respuestas.clasificacion === "string"
      ? respuestas.clasificacion
      : null;

    const { data: inserted, error: insertError } = await supabase
      .from("instrumentos_aplicados")
      .insert({
        id_clinica: idClinica,
        id_paciente: patientId,
        id_encuentro: encuentroId,
        id_instrumento: instrumentoId,
        respuestas,
        puntaje_total: null,
        interpretacion: clasificacion,
        notas: notas ?? null,
        mostrar_en_timeline: mostrarEnTimeline ?? true,
        aplicado_por: user.id,
        aplicado_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { success: false, error: insertError?.message ?? "Error al guardar el instrumento." };
    }

    await logAudit({
      supabase,
      actorId: user.id,
      accion: "aplicar_instrumento",
      tipoEvento: "create",
      tablaAfectada: "instrumentos_aplicados",
      registroId: inserted.id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
    return { success: true, data: { id: inserted.id } };
  }

  // Calcular puntaje server-side
  const puntaje = schema.schema_items
    ? calcularPuntaje(schema.schema_items, respuestas)
    : null;

  // Si el schema define ítems pero el cálculo falló (valores no numéricos / tipo desconocido),
  // rechazar el INSERT — nunca guardar puntaje_total=null silenciosamente
  if (schema.schema_items && puntaje === null) {
    return { success: false, error: "No se pudo calcular el puntaje del instrumento. Verifique que todos los valores ingresados sean numéricos." };
  }

  // Resolver interpretación si hay rangos y puntaje calculado
  let interpretacionLabel: string | null = null;
  if (puntaje !== null && schema.interpretacion && schema.interpretacion.length > 0) {
    const interp = interpretarPuntaje(puntaje, schema.interpretacion);
    interpretacionLabel = interp?.label ?? null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("instrumentos_aplicados")
    .insert({
      id_clinica: idClinica,
      id_paciente: patientId,
      id_encuentro: encuentroId,
      id_instrumento: instrumentoId,
      respuestas,
      puntaje_total: puntaje,
      interpretacion: interpretacionLabel,
      notas: notas ?? null,
      mostrar_en_timeline: mostrarEnTimeline ?? true,
      aplicado_por: user.id,
      aplicado_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { success: false, error: insertError?.message ?? "Error al guardar el instrumento." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "aplicar_instrumento",
    tipoEvento: "create",
    tablaAfectada: "instrumentos_aplicados",
    registroId: inserted.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });

  return { success: true, data: { id: inserted.id } };
}

// ── eliminarInstrumentoAplicado ───────────────────────────────────────────────

export async function eliminarInstrumentoAplicado(
  id: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireContext();

  // Fetch del registro para obtener id_encuentro e id_paciente
  const { data: registro, error: fetchError } = await supabase
    .from("instrumentos_aplicados")
    .select("id_encuentro, id_paciente, id_clinica")
    .eq("id", id)
    .single();

  if (fetchError || !registro) {
    return { success: false, error: "Instrumento aplicado no encontrado." };
  }

  // Verificar que el encuentro no esté finalizado
  const { data: encuentro, error: encError } = await supabase
    .from("fce_encuentros")
    .select("status")
    .eq("id", registro.id_encuentro)
    .single();

  if (encError || !encuentro) {
    return { success: false, error: "No se pudo verificar el estado del encuentro." };
  }

  if (encuentro.status === "finalizado") {
    return { success: false, error: "No se puede eliminar un instrumento de un encuentro finalizado." };
  }

  const { error: deleteError } = await supabase
    .from("instrumentos_aplicados")
    .delete()
    .eq("id", id);

  if (deleteError) return { success: false, error: deleteError.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_instrumento",
    tipoEvento: "delete",
    tablaAfectada: "instrumentos_aplicados",
    registroId: id,
    idClinica: registro.id_clinica ?? "",
    idPaciente: registro.id_paciente ?? null,
  });

  return { success: true, data: undefined };
}
