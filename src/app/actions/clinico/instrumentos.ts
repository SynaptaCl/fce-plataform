"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdClinica } from "@/app/actions/patients";
import { calcularPuntaje } from "@/lib/instrumentos/calcular";
import { interpretarPuntaje } from "@/lib/instrumentos/interpretar";
import type { ActionResult } from "@/app/actions/patients";
import type { InstrumentoSchema, InstrumentoAplicado } from "@/types/instrumento";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  accion: string,
  tablaAfectada: string,
  registroId: string,
  idClinica?: string | null,
  idPaciente?: string | null,
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch { /* no bloquea */ }
}

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
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("instrumentos_aplicados")
    .select("*, instrumento:instrumentos_valoracion(*)")
    .eq("id_encuentro", encuentroId)
    .order("aplicado_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as InstrumentoAplicado[] };
}

// ── aplicarInstrumento ────────────────────────────────────────────────────────

export async function aplicarInstrumento(params: {
  encuentroId: string;
  patientId: string;
  instrumentoId: string;
  respuestas: Record<string, number>;
  notas?: string;
  mostrarEnTimeline?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const { encuentroId, patientId, instrumentoId, respuestas, notas, mostrarEnTimeline } = params;

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

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

  // Calcular puntaje server-side
  const puntaje = schema.schema_items
    ? calcularPuntaje(schema.schema_items, respuestas)
    : null;

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

  await logAudit(
    supabase,
    user.id,
    "aplicar_instrumento",
    "instrumentos_aplicados",
    inserted.id,
    idClinica,
    patientId,
  );

  return { success: true, data: { id: inserted.id } };
}

// ── eliminarInstrumentoAplicado ───────────────────────────────────────────────

export async function eliminarInstrumentoAplicado(
  id: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

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

  await logAudit(
    supabase,
    user.id,
    "eliminar_instrumento_aplicado",
    "instrumentos_aplicados",
    id,
    registro.id_clinica ?? null,
    registro.id_paciente ?? null,
  );

  return { success: true, data: undefined };
}
