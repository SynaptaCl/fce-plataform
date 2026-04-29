"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { ActionResult } from "@/app/actions/patients";
import type { OdontogramaEntry, OdontogramaHistorial, EstadoPieza, SuperficieDental } from "@/types";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

async function getClinica(supabase: Awaited<ReturnType<typeof createClient>>, authId: string) {
  const { data } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", authId)
    .eq("activo", true)
    .single();
  return data?.id_clinica ?? null;
}

export async function getOdontograma(
  patientId: string
): Promise<ActionResult<OdontogramaEntry[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "Sin clínica activa" };

  const { data, error } = await supabase
    .from("fce_odontograma")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("pieza");

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as OdontogramaEntry[] };
}

export async function upsertPieza(input: {
  id_paciente: string;
  id_encuentro: string;
  pieza: number;
  estado: EstadoPieza;
  superficies: Partial<Record<SuperficieDental, EstadoPieza | null>>;
  movilidad?: number | null;
  notas?: string | null;
  procedimiento?: string | null;
}): Promise<ActionResult<OdontogramaEntry>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "Sin clínica activa" };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) return { success: false, error: "Sin perfil profesional activo" };

  // Fetch existing piece for historial comparison
  const { data: existing } = await supabase
    .from("fce_odontograma")
    .select("id, estado, superficies")
    .eq("id_clinica", idClinica)
    .eq("id_paciente", input.id_paciente)
    .eq("pieza", input.pieza)
    .maybeSingle();

  const now = new Date().toISOString();

  const { data: upserted, error: upsertErr } = await supabase
    .from("fce_odontograma")
    .upsert(
      {
        id_clinica: idClinica,
        id_paciente: input.id_paciente,
        pieza: input.pieza,
        estado: input.estado,
        superficies: input.superficies,
        movilidad: input.movilidad ?? null,
        notas: input.notas ?? null,
        updated_by: profesional.id,
        updated_at: now,
      },
      { onConflict: "id_clinica,id_paciente,pieza" }
    )
    .select()
    .single();

  if (upsertErr || !upserted) {
    return { success: false, error: upsertErr?.message ?? "Error al guardar pieza" };
  }

  const estadoAnterior = existing?.estado ?? null;
  const superficiesAnterior = existing?.superficies ?? null;
  const hayCambio =
    estadoAnterior !== input.estado ||
    JSON.stringify(superficiesAnterior) !== JSON.stringify(input.superficies);

  if (hayCambio) {
    await supabase.from("fce_odontograma_historial").insert({
      id_clinica: idClinica,
      id_paciente: input.id_paciente,
      id_encuentro: input.id_encuentro,
      id_odontograma: upserted.id,
      pieza: input.pieza,
      estado_anterior: estadoAnterior,
      estado_nuevo: input.estado,
      superficies_anterior: superficiesAnterior,
      superficies_nuevo: input.superficies,
      procedimiento: input.procedimiento ?? null,
      notas: input.notas ?? null,
      registrado_por: profesional.id,
      registrado_at: now,
    });

    await supabase.from("logs_auditoria").insert({
      actor_id: user.id,
      actor_tipo: "profesional",
      accion: existing ? "update" : "create",
      tabla_afectada: "fce_odontograma",
      registro_id: upserted.id,
      id_clinica: idClinica,
      id_paciente: input.id_paciente,
    });
  }

  revalidatePath(`/dashboard/pacientes/${input.id_paciente}`);
  return { success: true, data: upserted as OdontogramaEntry };
}

export interface HistorialPiezaEntry extends OdontogramaHistorial {
  profesional?: { nombre: string } | null;
}

export async function getHistorialPieza(
  patientId: string,
  pieza: number
): Promise<ActionResult<HistorialPiezaEntry[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "Sin clínica activa" };

  const { data, error } = await supabase
    .from("fce_odontograma_historial")
    .select("*, profesional:profesionales!registrado_por(nombre)")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .eq("pieza", pieza)
    .order("registrado_at", { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as unknown as HistorialPiezaEntry[] };
}
