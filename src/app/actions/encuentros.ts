"use server";

import { assertPuedeEscribir, dbError } from "@/lib/modules/guards";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getModeloDeEspecialidad } from "@/lib/modules/modelos";
import { getNombreServicioDeProfesionalServicio } from "@/lib/servicios/nombre-servicio";
import type { ModeloClinico, Rol } from "@/lib/modules/registry";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";

// ── createEncuentro ───────────────────────────────────────────────────────────

export async function createEncuentro(
  patientId: string,
  especialidad: string
): Promise<ActionResult<{ encuentroId: string; modelo: ModeloClinico }>> {
  try {
    const { supabase, user, idClinica, rol, profesionalId, especialidad: espActiva } = await requireContext();

    // admin/director/superadmin son solo lectura (decisión 2026-09-29): solo un
    // profesional crea encuentros, y solo de su especialidad. RLS lo respalda
    // (fce_encuentros_insert → es_profesional_clinico).
    const escrituraGuard = assertPuedeEscribir(rol as Rol);
    if (!escrituraGuard.success) return escrituraGuard;
    if (!profesionalId) {
      return { success: false, error: "No tienes un perfil de profesional activo" };
    }
    if (espActiva !== especialidad) {
      return { success: false, error: "Solo puedes iniciar encuentros de tu especialidad" };
    }

    // Lógica check-in / walk-in (mismo patrón que soap.ts)
    const hoySantiago = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
    const todayStart = new Date(`${hoySantiago}T00:00:00-04:00`);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    let encuentroId: string | null = null;

    // 1. Buscar cita planificada del día
    if (idClinica) {
      const { data: preplanned } = await supabase
        .from("fce_encuentros")
        .select("id")
        .eq("id_paciente", patientId)
        .eq("id_clinica", idClinica)
        .eq("especialidad", especialidad)
        .eq("status", "planificado")
        .not("id_cita", "is", null)
        .gte("started_at", todayStart.toISOString())
        .lt("started_at", tomorrowStart.toISOString())
        .maybeSingle();

      if (preplanned?.id) {
        const { error: updateError } = await supabase
          .from("fce_encuentros")
          .update({ status: "en_progreso", started_at: new Date().toISOString() })
          .eq("id", preplanned.id);
        if (updateError) {
          return dbError("encuentros", updateError);
        }
        encuentroId = preplanned.id as string;
      }
    }

    // 2. Fallback: crear walk-in
    if (!encuentroId) {
      const { data: created, error: insertError } = await supabase
        .from("fce_encuentros")
        .insert({
          id_paciente: patientId,
          id_profesional: profesionalId,
          especialidad,
          modalidad: "presencial",
          status: "en_progreso",
          started_at: new Date().toISOString(),
          ...(idClinica ? { id_clinica: idClinica } : {}),
        })
        .select("id")
        .single();

      if (insertError) {
        return dbError("encuentros", insertError);
      }
      encuentroId = created.id as string;
    }

    const modelo = getModeloDeEspecialidad(especialidad);

    await logAudit({
      supabase,
      actorId: user.id,
      accion: "crear_encuentro",
      tipoEvento: "create",
      tablaAfectada: "fce_encuentros",
      registroId: encuentroId,
      idClinica: idClinica!,
      idPaciente: patientId,
    });

    return { success: true, data: { encuentroId, modelo } };
  } catch (err: unknown) {
    return dbError("encuentros", err);
  }
}

// ── getEncuentroContext ────────────────────────────────────────────────────────

export interface EncuentroContext {
  especialidad: string;
  nombreServicio: string | null;
}

/**
 * Resuelve la especialidad y el nombre del servicio de una cita asociada al encuentro.
 * Si el encuentro no tiene cita (walk-in), nombreServicio = null.
 */
export async function getEncuentroContext(encuentroId: string): Promise<ActionResult<EncuentroContext>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data: encuentro, error: encError } = await supabase
    .from("fce_encuentros")
    .select("especialidad, id_cita")
    .eq("id", encuentroId)
    .eq("id_clinica", idClinica)
    .single();

  if (encError || !encuentro) {
    return { success: false, error: "Encuentro no encontrado" };
  }

  const especialidad = encuentro.especialidad as string;
  let nombreServicio: string | null = null;

  if (encuentro.id_cita) {
    const { data: cita } = await supabase
      .from("citas")
      .select("id_profesional_servicio")
      .eq("id", encuentro.id_cita)
      .maybeSingle();

    if (cita?.id_profesional_servicio) {
      nombreServicio = await getNombreServicioDeProfesionalServicio(supabase, cita.id_profesional_servicio);
    }
  }

  return { success: true, data: { especialidad, nombreServicio } };
}
