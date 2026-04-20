// src/lib/permissions.ts
// Control de acceso para la FCE (legacy — ver guards.ts para implementación v2).
// No modifica la base de datos — solo evalúa permisos en base al contexto del usuario.

import type { EspecialidadCodigo, Rol } from "@/lib/modules/registry";

export interface UserContext {
  userId: string;                        // auth.uid() — solo para audit logs
  idClinica: string | null;
  rol: Rol;                              // "superadmin" | "director" | "admin" | "profesional" | "recepcionista"
  idProfesional: string | null;          // profesionales.id — para FKs
  especialidad: EspecialidadCodigo | null;
}

/**
 * ¿Puede este usuario escribir en el módulo de la especialidad indicada?
 * - admin/director/superadmin: puede escribir en cualquier especialidad
 * - profesional: solo en su propia especialidad
 * - recepcionista: nunca puede escribir en módulos clínicos
 */
export function canWrite(ctx: UserContext, moduloEspecialidad: EspecialidadCodigo): boolean {
  if (ctx.rol === "admin" || ctx.rol === "director" || ctx.rol === "superadmin") return true;
  if (ctx.rol === "recepcionista") return false;
  if (ctx.rol === "profesional") {
    return ctx.especialidad === moduloEspecialidad;
  }
  return false;
}

/**
 * ¿Puede este usuario acceder a la FCE (leer datos clínicos)?
 * Recepcionistas no tienen acceso a la FCE.
 */
export function canAccessFCE(ctx: UserContext): boolean {
  return ctx.rol !== "recepcionista";
}

/**
 * ¿Puede este usuario firmar notas SOAP de la especialidad indicada?
 * Solo profesionales de esa especialidad pueden firmar.
 */
export function canSignSOAP(ctx: UserContext, moduloEspecialidad: EspecialidadCodigo): boolean {
  return ctx.rol === "profesional" && ctx.especialidad === moduloEspecialidad;
}
