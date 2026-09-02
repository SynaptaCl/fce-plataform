"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled, dbError } from "@/lib/modules/guards";
import type { ActionResult } from "@/lib/modules/guards";
import { log } from "@/lib/logger";
import { calcular, calcularSaldo, puedeFirmar, validarLineas } from "@/lib/tarificacion";
import {
  cargarContextoTarificacion,
  construirLineas,
  filaItemDesdeLinea,
} from "@/lib/tarificacion/contexto";
import type { ContextoTarificacion } from "@/lib/tarificacion/contexto";
import type { ModeloPrecio, PoliticaDescuento } from "@/lib/tarificacion";
import type {
  OverrideParaPicker,
  PrestacionParaPicker,
  Presupuesto,
  PresupuestoEstado,
  PresupuestoItem,
  PresupuestoFormData,
} from "@/types/presupuesto";

// SELECT explícito de columnas: honorario_* (capa B) jamás viaja al cliente
// (§2/§11 del doc del sprint — nunca select("*") en el path de lectura/PDF).
const COLS_PRESUPUESTO =
  "id, id_clinica, id_paciente, id_encuentro, id_profesional, titulo, estado, notas, " +
  "firmado, firmado_at, created_at, updated_at, subtotal_clp, descuento_clp, neto_clp, " +
  "iva_clp, total_clp, modelo_precio, id_plan_tratamiento, created_by, validez_dias, " +
  "profesional:profesionales(nombre, especialidad)";

const COLS_ITEM =
  "id, id_presupuesto, id_prestacion, codigo, id_profesional, pieza, superficie, " +
  "descripcion, cantidad, precio_base, recargo_pct, precio_unitario, descuento_pct, " +
  "descuento_clp, afecta_iva, total_linea_clp, orden";

// ── getDatosTarificacion (para el form/picker, sin honorarios) ──────────────

export interface DatosTarificacion {
  prestaciones: PrestacionParaPicker[];
  overrides: OverrideParaPicker[];
  modelo: ModeloPrecio;
  politica: PoliticaDescuento;
}

export async function getDatosTarificacion(): Promise<ActionResult<DatosTarificacion>> {
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let idClinica: string;
  let idProfesional: string | null;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    idClinica = ctx.idClinica;
    idProfesional = ctx.profesionalId;
  } catch {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  const resultado = await cargarContextoTarificacion(supabase, idClinica, idProfesional);
  if (!resultado.ok) {
    return { success: false, error: resultado.error };
  }

  const { modelo, politica, catalogo, overrides } = resultado.contexto;

  return {
    success: true,
    data: {
      modelo,
      politica,
      prestaciones: Array.from(catalogo.values()).map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria ?? "",
        precio_base: p.precio_base,
        afecta_iva: p.afecta_iva,
        requiere_pieza: p.requiere_pieza ?? false,
        ambito: p.ambito ?? "general",
      })),
      // capa B (honorario_*) se queda en el server: solo lo que afecta el precio
      overrides: Array.from(overrides.entries()).map(([id_prestacion, o]) => ({
        id_prestacion,
        precio_override: o.precio_override,
        recargo_pct: o.recargo_pct,
      })),
    },
  };
}

// ── Helpers internos ────────────────────────────────────────────────────────

interface ContextoBasico {
  supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  user: Awaited<ReturnType<typeof requireContext>>["user"];
  idClinica: string;
}

async function requireContextoBasico(): Promise<ContextoBasico | { error: string }> {
  try {
    const ctx = await requireContext();
    return { supabase: ctx.supabase, user: ctx.user, idClinica: ctx.idClinica };
  } catch {
    return { error: "No se encontró la clínica asociada al usuario." };
  }
}

/**
 * Recalcula el presupuesto server-side desde el catálogo (F5): valida líneas,
 * resuelve precios y devuelve el snapshot listo para persistir.
 */
async function recalcularDesdeCatalogo(
  supabase: ContextoBasico["supabase"],
  idClinica: string,
  idProfesional: string,
  data: PresupuestoFormData,
): Promise<{ ok: true; contexto: ContextoTarificacion; filas: ReturnType<typeof filaItemDesdeLinea>[]; totales: ReturnType<typeof calcular> } | { ok: false; error: string }> {
  const resultado = await cargarContextoTarificacion(supabase, idClinica, idProfesional);
  if (!resultado.ok) return { ok: false, error: resultado.error };
  const { contexto } = resultado;

  const lineas = construirLineas(data.items ?? [], contexto, idProfesional);
  if (!lineas.ok) return { ok: false, error: lineas.error };

  const validacion = validarLineas(lineas.lineas, contexto.politica);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const calculo = calcular(lineas.lineas, contexto.modelo);
  return {
    ok: true,
    contexto,
    filas: calculo.lineas.map((l, i) => ({ ...filaItemDesdeLinea(l, ""), orden: i })),
    totales: calculo,
  };
}

// ── getPresupuestos ────────────────────────────────────────────────────────

export async function getPresupuestos(
  idPaciente: string
): Promise<ActionResult<Presupuesto[]>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, idClinica } = base;

  const { data: presupuestos, error } = await supabase
    .from("fce_presupuestos")
    .select(COLS_PRESUPUESTO)
    .eq("id_paciente", idPaciente)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", { action: "get_presupuestos", id_clinica: idClinica, id_paciente: idPaciente, error });
    return dbError("presupuestos", error);
  }

  const list = (presupuestos ?? []) as unknown as Presupuesto[];
  if (list.length === 0) return { success: true, data: [] };

  const ids = list.map((p) => p.id);
  const { data: allItems, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .select(COLS_ITEM)
    .in("id_presupuesto", ids)
    .order("orden", { ascending: true });

  if (itemsError) {
    log("error", { action: "get_presupuestos_items", id_clinica: idClinica, id_paciente: idPaciente, error: itemsError });
    return dbError("presupuestos", itemsError);
  }

  const items = (allItems ?? []) as unknown as PresupuestoItem[];
  const result: Presupuesto[] = list.map((p) => ({
    ...p,
    items: items.filter((i) => i.id_presupuesto === p.id),
  }));

  return { success: true, data: result };
}

// ── getPresupuesto ─────────────────────────────────────────────────────────

export async function getPresupuesto(
  id: string
): Promise<ActionResult<Presupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, idClinica } = base;

  const { data, error } = await supabase
    .from("fce_presupuestos")
    .select(COLS_PRESUPUESTO)
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (error || !data) {
    return { success: false, error: "Presupuesto no encontrado." };
  }

  const { data: items, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .select(COLS_ITEM)
    .eq("id_presupuesto", id)
    .order("orden", { ascending: true });

  if (itemsError) {
    log("error", { action: "get_presupuesto_items", id_clinica: idClinica, error: itemsError });
    return dbError("presupuestos", itemsError);
  }

  return {
    success: true,
    data: {
      ...(data as unknown as Presupuesto),
      items: (items ?? []) as unknown as PresupuestoItem[],
    },
  };
}

// ── crearPresupuesto ───────────────────────────────────────────────────────

export async function crearPresupuesto(
  idPaciente: string,
  data: PresupuestoFormData,
  idEncuentro?: string
): Promise<ActionResult<Presupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, user, idClinica } = base;

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M11_presupuestos");
  if (!moduleGuard.success) return moduleGuard;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado." };
  }

  if (!data.titulo?.trim()) {
    return { success: false, error: "El título es obligatorio." };
  }
  if (!data.items?.length) {
    return { success: false, error: "El presupuesto debe tener al menos un ítem." };
  }

  const calculo = await recalcularDesdeCatalogo(supabase, idClinica, profesional.id, data);
  if (!calculo.ok) return { success: false, error: calculo.error };

  const { data: presupuesto, error: insertError } = await supabase
    .from("fce_presupuestos")
    .insert({
      id_clinica: idClinica,
      id_paciente: idPaciente,
      id_encuentro: idEncuentro ?? null,
      id_profesional: profesional.id,
      id_plan_tratamiento: data.id_plan_tratamiento ?? null,
      titulo: data.titulo.trim(),
      estado: "borrador",
      notas: data.notas?.trim() || null,
      subtotal_clp: calculo.totales.subtotal_clp,
      descuento_clp: calculo.totales.descuento_clp,
      neto_clp: calculo.totales.neto_clp,
      iva_clp: calculo.totales.iva_clp,
      total_clp: calculo.totales.total_clp,
      modelo_precio: calculo.contexto.modelo,
      created_by: user.id,
    })
    .select(COLS_PRESUPUESTO)
    .single();

  if (insertError || !presupuesto) {
    log("error", { action: "crear_presupuesto", id_clinica: idClinica, id_paciente: idPaciente, error: insertError });
    return dbError("crear_presupuesto", insertError);
  }
  const presupuestoCreado = presupuesto as unknown as Presupuesto;

  const { data: insertedItems, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .insert(calculo.filas.map((f) => ({ ...f, id_presupuesto: presupuestoCreado.id })))
    .select(COLS_ITEM);

  if (itemsError) {
    log("error", { action: "crear_presupuesto_items", id_clinica: idClinica, id_paciente: idPaciente, error: itemsError });
    return { success: false, error: "No se pudieron guardar los ítems del presupuesto." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_presupuesto",
    tipoEvento: "create",
    tablaAfectada: "fce_presupuestos",
    registroId: presupuestoCreado.id,
    idClinica: idClinica,
    idPaciente: idPaciente,
    datosAfter: { total_clp: calculo.totales.total_clp, items: calculo.filas.length },
  });

  revalidatePath(`/dashboard/pacientes/${idPaciente}`);

  return {
    success: true,
    data: {
      ...presupuestoCreado,
      items: (insertedItems ?? []) as unknown as PresupuestoItem[],
    },
  };
}

// ── actualizarPresupuesto ──────────────────────────────────────────────────

export async function actualizarPresupuesto(
  id: string,
  data: PresupuestoFormData
): Promise<ActionResult<Presupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, user, idClinica } = base;

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, id_profesional, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede modificar un presupuesto firmado. Usa una adenda para corregirlo." };
  }

  if (!data.titulo?.trim()) {
    return { success: false, error: "El título es obligatorio." };
  }
  if (!data.items?.length) {
    return { success: false, error: "El presupuesto debe tener al menos un ítem." };
  }

  const calculo = await recalcularDesdeCatalogo(supabase, idClinica, existing.id_profesional, data);
  if (!calculo.ok) return { success: false, error: calculo.error };

  const { data: updated, error: updateError } = await supabase
    .from("fce_presupuestos")
    .update({
      titulo: data.titulo.trim(),
      notas: data.notas?.trim() || null,
      id_plan_tratamiento: data.id_plan_tratamiento ?? null,
      subtotal_clp: calculo.totales.subtotal_clp,
      descuento_clp: calculo.totales.descuento_clp,
      neto_clp: calculo.totales.neto_clp,
      iva_clp: calculo.totales.iva_clp,
      total_clp: calculo.totales.total_clp,
      modelo_precio: calculo.contexto.modelo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select(COLS_PRESUPUESTO)
    .single();

  if (updateError || !updated) {
    log("error", { action: "actualizar_presupuesto", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo actualizar el presupuesto." };
  }

  // Ítems: replace-all (permitido, el presupuesto no está firmado)
  const { error: deleteError } = await supabase
    .from("fce_presupuesto_items")
    .delete()
    .eq("id_presupuesto", id);

  if (deleteError) {
    log("error", { action: "actualizar_presupuesto_items_delete", id_clinica: idClinica, error: deleteError });
    return { success: false, error: "No se pudieron actualizar los ítems del presupuesto." };
  }

  const { data: insertedItems, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .insert(calculo.filas.map((f) => ({ ...f, id_presupuesto: id })))
    .select(COLS_ITEM);

  if (itemsError) {
    log("error", { action: "actualizar_presupuesto_items", id_clinica: idClinica, error: itemsError });
    return { success: false, error: "No se pudieron actualizar los ítems del presupuesto." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "actualizar_presupuesto",
    tipoEvento: "update",
    tablaAfectada: "fce_presupuestos",
    registroId: id,
    idClinica: idClinica,
    idPaciente: existing.id_paciente,
    datosAfter: { total_clp: calculo.totales.total_clp, items: calculo.filas.length },
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return {
    success: true,
    data: {
      ...(updated as unknown as Presupuesto),
      items: (insertedItems ?? []) as unknown as PresupuestoItem[],
    },
  };
}

// ── firmarPresupuesto ──────────────────────────────────────────────────────

export async function firmarPresupuesto(
  id: string
): Promise<ActionResult<Presupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, user, idClinica } = base;

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M11_presupuestos");
  if (!moduleGuard.success) return moduleGuard;

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, id_profesional, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "El presupuesto ya fue firmado." };
  }

  // Se reconstruyen las líneas desde los ítems guardados y se recalculan con
  // el catálogo vigente: al firmar se congela el snapshot completo (§6),
  // incluido honorario_clp (capa B).
  const { data: itemsActuales } = await supabase
    .from("fce_presupuesto_items")
    .select("id_prestacion, cantidad, descuento_pct, pieza, superficie, orden")
    .eq("id_presupuesto", id)
    .order("orden", { ascending: true });

  if (!itemsActuales?.length) {
    return { success: false, error: "El presupuesto no tiene ítems para firmar." };
  }

  const data: PresupuestoFormData = {
    titulo: "-",
    items: itemsActuales
      .filter((it) => it.id_prestacion)
      .map((it) => ({
        id_prestacion: it.id_prestacion as string,
        cantidad: it.cantidad,
        descuento_pct: it.descuento_pct,
        pieza: it.pieza,
        superficie: it.superficie,
      })),
  };

  const calculo = await recalcularDesdeCatalogo(supabase, idClinica, existing.id_profesional, data);
  if (!calculo.ok) return { success: false, error: calculo.error };

  // Regla dura §4: nada de firmar con prestaciones sin precio cargado
  if (!puedeFirmar(calculo.totales)) {
    return {
      success: false,
      error: "No se puede firmar: hay ítems con prestaciones sin precio cargado (pendientes de tarificar).",
    };
  }

  // Ítems PRIMERO (el trigger bloquea escritura de ítems si el padre está firmado)
  const { error: deleteError } = await supabase
    .from("fce_presupuesto_items")
    .delete()
    .eq("id_presupuesto", id);
  if (deleteError) {
    log("error", { action: "firmar_presupuesto_items_delete", id_clinica: idClinica, error: deleteError });
    return { success: false, error: "No se pudo firmar el presupuesto." };
  }

  const { error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .insert(calculo.filas.map((f) => ({ ...f, id_presupuesto: id })));
  if (itemsError) {
    log("error", { action: "firmar_presupuesto_items", id_clinica: idClinica, error: itemsError });
    return { success: false, error: "No se pudo firmar el presupuesto." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fce_presupuestos")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      estado: "enviado",
      subtotal_clp: calculo.totales.subtotal_clp,
      descuento_clp: calculo.totales.descuento_clp,
      neto_clp: calculo.totales.neto_clp,
      iva_clp: calculo.totales.iva_clp,
      total_clp: calculo.totales.total_clp,
      modelo_precio: calculo.contexto.modelo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select(COLS_PRESUPUESTO)
    .single();

  if (updateError || !updated) {
    log("error", { action: "firmar_presupuesto", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo firmar el presupuesto." };
  }

  const { data: items } = await supabase
    .from("fce_presupuesto_items")
    .select(COLS_ITEM)
    .eq("id_presupuesto", id)
    .order("orden", { ascending: true });

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_presupuesto",
    tipoEvento: "sign",
    tablaAfectada: "fce_presupuestos",
    registroId: id,
    idClinica: idClinica,
    idPaciente: existing.id_paciente,
    datosAfter: { total_clp: calculo.totales.total_clp, modelo_precio: calculo.contexto.modelo },
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return {
    success: true,
    data: {
      ...(updated as unknown as Presupuesto),
      items: (items ?? []) as unknown as PresupuestoItem[],
    },
  };
}

// ── cambiarEstadoPresupuesto (ciclo de vida post-firma) ────────────────────

const TRANSICIONES: Record<string, PresupuestoEstado[]> = {
  aceptado: ["enviado"],
  rechazado: ["enviado"],
  anulado: ["borrador", "enviado", "aceptado", "rechazado"],
};

export async function cambiarEstadoPresupuesto(
  id: string,
  nuevoEstado: Extract<PresupuestoEstado, "aceptado" | "rechazado" | "anulado">
): Promise<ActionResult<Presupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, user, idClinica } = base;

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, estado, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }

  const permitidos = TRANSICIONES[nuevoEstado] ?? [];
  if (!permitidos.includes(existing.estado as PresupuestoEstado)) {
    return { success: false, error: `No se puede pasar de '${existing.estado}' a '${nuevoEstado}'.` };
  }

  // Solo estado: el trigger F4 bloquea contenido/plata/totales en firmados,
  // estado y updated_at quedan libres.
  const { data: updated, error: updateError } = await supabase
    .from("fce_presupuestos")
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select(COLS_PRESUPUESTO)
    .single();

  if (updateError || !updated) {
    log("error", { action: "cambiar_estado_presupuesto", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo actualizar el estado del presupuesto." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "cambiar_estado_presupuesto",
    tipoEvento: "update",
    tablaAfectada: "fce_presupuestos",
    registroId: id,
    idClinica: idClinica,
    idPaciente: existing.id_paciente,
    datosBefore: { estado: existing.estado },
    datosAfter: { estado: nuevoEstado },
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: updated as unknown as Presupuesto };
}

// ── getSaldoPresupuesto (F7: cobro en synapta, saldo derivado en fce) ──────

export interface SaldoPresupuesto {
  total_clp: number;
  pagado_clp: number;
  saldo_clp: number;
}

/**
 * Saldo = total_clp − Σ pagos WHERE id_presupuesto = X AND estado = 'aprobado'.
 * Derivado, nunca columna (§7). El pago se registra en synapta (caja);
 * fce solo lee. Requiere la migration F7 (pagos.id_presupuesto).
 */
export async function getSaldoPresupuesto(
  id: string
): Promise<ActionResult<SaldoPresupuesto>> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, idClinica } = base;

  const { data: presupuesto, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, total_clp")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !presupuesto) {
    return { success: false, error: "Presupuesto no encontrado." };
  }

  const { data: pagos, error: pagosError } = await supabase
    .from("pagos")
    .select("monto_clp, estado")
    .eq("id_presupuesto", id)
    .eq("id_clinica", idClinica);

  if (pagosError) {
    log("error", { action: "get_saldo_presupuesto", id_clinica: idClinica, id_presupuesto: id, error: pagosError });
    return dbError("saldo_presupuesto", pagosError);
  }

  const total = presupuesto.total_clp ?? 0;
  const saldo = calcularSaldo(total, (pagos ?? []) as unknown as { monto_clp: number; estado: string }[]);

  return { success: true, data: { total_clp: total, ...saldo } };
}

// ── eliminarPresupuesto ────────────────────────────────────────────────────

export async function eliminarPresupuesto(
  id: string
): Promise<ActionResult> {
  const base = await requireContextoBasico();
  if ("error" in base) return { success: false, error: base.error };
  const { supabase, user, idClinica } = base;

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede eliminar un presupuesto firmado." };
  }

  const { error: deleteError } = await supabase
    .from("fce_presupuestos")
    .delete()
    .eq("id", id)
    .eq("id_clinica", idClinica);

  if (deleteError) {
    log("error", { action: "eliminar_presupuesto", id_clinica: idClinica, error: deleteError });
    return { success: false, error: "No se pudo eliminar el presupuesto." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_presupuesto",
    tipoEvento: "delete",
    tablaAfectada: "fce_presupuestos",
    registroId: id,
    idClinica: idClinica,
    idPaciente: existing.id_paciente,
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: undefined };
}
