"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getModeloDeEspecialidad } from "@/lib/modules/modelos";
import type { ModeloClinico } from "@/lib/modules/registry";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";

// ── requireAuth ───────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// ── logAudit ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, tablaAfectada: string, registroId: string, idClinica?: string | null, idPaciente?: string | null) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica  ? { id_clinica:  idClinica  } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch { /* no bloquea el flujo principal */ }
}

// ── createEncuentro ───────────────────────────────────────────────────────────

export async function createEncuentro(
  patientId: string,
  especialidad: string
): Promise<ActionResult<{ encuentroId: string; modelo: ModeloClinico }>> {
  const { supabase, user } = await requireAuth();

  // Fetch rol + id_clinica + profesional activo en paralelo
  const [adminRes, profesional] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id_clinica, rol")
      .eq("auth_id", user.id)
      .eq("activo", true)
      .single(),
    getProfesionalActivo(supabase, user.id),
  ]);

  if (!adminRes.data) {
    return { success: false, error: "Sin perfil de usuario activo" };
  }

  const rol: string = adminRes.data.rol;
  const idClinica: string | null = await getIdClinica(supabase, user.id);

  // Validar coherencia profesional ↔ especialidad
  // Admin/director/superadmin pueden crear encuentros de cualquier especialidad
  const esAdminODirector = ["admin", "director", "superadmin"].includes(rol);
  if (!esAdminODirector) {
    if (!profesional) {
      return { success: false, error: "No tienes un perfil de profesional activo" };
    }
    if (profesional.especialidad !== especialidad) {
      return { success: false, error: "Solo puedes iniciar encuentros de tu especialidad" };
    }
  }

  const profesionalId = profesional?.id ?? null;
  if (!profesionalId) {
    return { success: false, error: "No se encontró perfil de profesional para este encuentro" };
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
        return { success: false, error: updateError.message };
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
      return { success: false, error: insertError.message };
    }
    encuentroId = created.id as string;
  }

  const modelo = getModeloDeEspecialidad(especialidad);

  await logAudit(supabase, user.id, "crear_encuentro", "fce_encuentros", encuentroId, idClinica, patientId);

  return { success: true, data: { encuentroId, modelo } };
}
