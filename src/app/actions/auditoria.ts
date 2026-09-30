"use server";

import { dbError } from "@/lib/modules/guards";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import type { ActionResult } from "./patients";
import type { AuditEntry, AuditAction } from "@/types";

// ── Helper: requiere rol con acceso a auditoría ───────────────────────────
// admin / director / superadmin (ROLES_QUE_CONFIGURAN). Antes exigía rol === "admin"
// exacto y dejaba fuera a director y superadmin (fix 2026-09-29).

async function requireAdmin() {
  const { supabase, user, idClinica, rol } = await requireContext();
  if (!(ROLES_QUE_CONFIGURAN as string[]).includes(rol)) redirect("/dashboard");
  return { supabase, user, idClinica };
}

// ── getAuditLogs ───────────────────────────────────────────────────────────

export type AuditFilter = {
  patientId?: string;
  accion?: AuditAction | "";
  desde?: string; // "YYYY-MM-DD"
  hasta?: string; // "YYYY-MM-DD"
};

export async function getAuditLogs(
  filter: AuditFilter = {}
): Promise<ActionResult<AuditEntry[]>> {
  const { supabase, idClinica } = await requireAdmin();

  let query = supabase
    .from("logs_auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Filtrar siempre por la clínica del admin — impide ver logs de otras clínicas
  query = query.eq("id_clinica", idClinica);

  if (filter.patientId) {
    query = query.eq("id_paciente", filter.patientId);
  }
  if (filter.accion) {
    query = query.eq("accion", filter.accion);
  }
  if (filter.desde) {
    query = query.gte("created_at", `${filter.desde}T00:00:00Z`);
  }
  if (filter.hasta) {
    query = query.lte("created_at", `${filter.hasta}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) return dbError("auditoria", error);
  return { success: true, data: data as AuditEntry[] };
}
