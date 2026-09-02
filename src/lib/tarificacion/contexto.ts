/**
 * Contexto de tarificación — carga server-side desde el catálogo (dominio synapta,
 * solo-read desde fce) y construcción de líneas para `calcular()`.
 *
 * Sprint PRE-1 (F5): el server recalcula siempre desde el catálogo; el cliente
 * nunca envía precios. Aquí NO se filtra honorario_* porque este módulo sirve al
 * path de ESCRITURA/firma (el snapshot de capa B se congela al firmar, §6).
 * El path de lectura al cliente usa getDatosTarificacion() con SELECT explícito
 * sin honorarios.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PresupuestoItemInput } from "@/types/presupuesto";
import type {
  LineaCalculada,
  LineaInput,
  ModeloPrecio,
  PoliticaDescuento,
  PrestacionCatalogo,
  ProfesionalPrestacion,
} from "./tipos";

export interface ContextoTarificacion {
  modelo: ModeloPrecio;
  politica: PoliticaDescuento;
  /** id_prestacion → fila del catálogo (activas de la clínica). */
  catalogo: Map<string, PrestacionCatalogo>;
  /** id_prestacion → override del profesional (incluye honorarios para el snapshot). */
  overrides: Map<string, ProfesionalPrestacion>;
}

export type ResultadoContexto =
  | { ok: true; contexto: ContextoTarificacion }
  | { ok: false; error: string };

export type ResultadoLineas =
  | { ok: true; lineas: LineaInput[] }
  | { ok: false; error: string };

/**
 * Carga política (clinicas_pagos_config), catálogo activo y overrides del
 * profesional. Defaults si la clínica no tiene fila en clinicas_pagos_config:
 * centralizado / permite descuento / max 100.
 */
export async function cargarContextoTarificacion(
  supabase: SupabaseClient,
  idClinica: string,
  idProfesional: string | null,
): Promise<ResultadoContexto> {
  const { data: pagosConfig } = await supabase
    .from("clinicas_pagos_config")
    .select("modelo_precio, permite_descuento_item, descuento_max_pct")
    .eq("id_clinica", idClinica)
    .maybeSingle();

  const modelo = (pagosConfig?.modelo_precio ?? "centralizado") as ModeloPrecio;
  const politica: PoliticaDescuento = {
    permite_descuento_item: pagosConfig?.permite_descuento_item ?? true,
    descuento_max_pct: pagosConfig?.descuento_max_pct ?? 100,
  };

  const { data: prestaciones, error: errCatalogo } = await supabase
    .from("prestaciones_catalogo")
    .select("id, codigo, nombre, categoria, precio_base, afecta_iva, requiere_pieza, ambito")
    .eq("id_clinica", idClinica)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (errCatalogo) {
    return { ok: false, error: "No se pudo cargar el catálogo de prestaciones." };
  }

  let overridesRows: { id_prestacion: string; precio_override: number | null; recargo_pct: number | null; honorario_tipo: ProfesionalPrestacion["honorario_tipo"]; honorario_valor: number | null }[] = [];
  if (idProfesional) {
    const { data: rows, error: errOverrides } = await supabase
      .from("profesional_prestaciones")
      .select("id_prestacion, precio_override, recargo_pct, honorario_tipo, honorario_valor")
      .eq("id_profesional", idProfesional)
      .eq("activo", true);
    if (errOverrides) {
      return { ok: false, error: "No se pudo cargar la configuración de precios del profesional." };
    }
    overridesRows = rows ?? [];
  }

  const catalogo = new Map<string, PrestacionCatalogo>();
  for (const p of prestaciones ?? []) {
    catalogo.set(p.id, {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      precio_base: p.precio_base,
      afecta_iva: p.afecta_iva,
      requiere_pieza: p.requiere_pieza,
      ambito: p.ambito,
    });
  }

  const overrides = new Map<string, ProfesionalPrestacion>();
  for (const o of overridesRows) {
    overrides.set(o.id_prestacion, {
      precio_override: o.precio_override,
      recargo_pct: o.recargo_pct,
      honorario_tipo: o.honorario_tipo,
      honorario_valor: o.honorario_valor,
    });
  }

  return { ok: true, contexto: { modelo, politica, catalogo, overrides } };
}

/**
 * Construye LineaInput[] desde el input del cliente (id_prestacion/cantidad/
 * descuento/pieza). Rechaza prestaciones fuera del catálogo activo de la clínica.
 * idProfesionalPresupuesto = ejecutante cotizado (§ riesgos: el ítem guarda
 * id_profesional; cambio de ejecutante post-firma = adenda, no UPDATE).
 */
export function construirLineas(
  items: PresupuestoItemInput[],
  contexto: ContextoTarificacion,
  idProfesionalPresupuesto: string,
): ResultadoLineas {
  const lineas: LineaInput[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prestacion = contexto.catalogo.get(item.id_prestacion);
    if (!prestacion) {
      return {
        ok: false,
        error: `Ítem ${i + 1}: la prestación indicada no está disponible en el catálogo de la clínica.`,
      };
    }
    lineas.push({
      prestacion,
      override: contexto.overrides.get(item.id_prestacion) ?? null,
      cantidad: item.cantidad,
      descuento_pct: item.descuento_pct ?? 0,
      pieza: item.pieza ?? null,
      superficie: item.superficie?.trim() || null,
      id_profesional: idProfesionalPresupuesto,
    });
  }
  return { ok: true, lineas };
}

/** Fila para INSERT en fce_presupuesto_items desde una línea ya calculada (snapshot). */
export function filaItemDesdeLinea(linea: LineaCalculada, idPresupuesto: string) {
  return {
    id_presupuesto: idPresupuesto,
    id_prestacion: linea.id_prestacion,
    codigo: linea.codigo,
    id_profesional: linea.id_profesional,
    pieza: linea.pieza,
    superficie: linea.superficie,
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precio_base: linea.precio_base,
    recargo_pct: linea.recargo_pct,
    descuento_pct: linea.descuento_pct,
    descuento_clp: linea.descuento_clp,
    afecta_iva: linea.afecta_iva,
    total_linea_clp: linea.total_linea_clp,
    precio_unitario: linea.precio_unitario,
    honorario_tipo: linea.honorario_tipo,
    honorario_valor: linea.honorario_valor,
    honorario_clp: linea.honorario_clp,
  };
}
