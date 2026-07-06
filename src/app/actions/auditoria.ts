"use server";

import { dbError } from "@/lib/modules/guards";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import type { AuditEntry, AuditAction } from "@/types";

// ── Helper: requiere rol admin ─────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  // admin_users tiene el rol, NO profesionales
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("rol, id_clinica")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (adminUser?.rol !== "admin") redirect("/dashboard");

  const idClinica: string | null = adminUser?.id_clinica ?? null;
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
  if (idClinica) {
    query = query.eq("id_clinica", idClinica);
  }

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
