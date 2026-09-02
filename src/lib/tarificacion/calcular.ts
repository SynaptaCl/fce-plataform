/**
 * calcular — cálculo server-side del presupuesto (sprint PRE-1 §5).
 *
 * Orden fijo por línea (redondeo por línea en CLP entero, nunca al final):
 *   1. precio_unitario = resolverPrecio(...)          // ya incluye recargo
 *   2. subtotal_linea  = precio_unitario × cantidad
 *   3. descuento_linea = descuento_clp || round(subtotal_linea × descuento_pct/100)
 *   4. total_linea_clp = subtotal_linea − descuento_linea
 *
 * D-1: precio_base es IVA incluido → el IVA se desagrega por línea afecta:
 *   iva_linea = round(total_linea / 1.19 × 0.19) ; neto = total − iva (derivado).
 *
 * honorario_* (capa B) se calcula y congela aquí pero jamás influye en precio_unitario.
 *
 * Funciones puras, server-safe, sin imports de React/Next ni DB.
 */

import { resolverPrecio } from "./resolver";
import type {
  LineaCalculada,
  LineaInput,
  ModeloPrecio,
  PoliticaDescuento,
  PagoParaSaldo,
  PrecioResuelto,
  PresupuestoCalculado,
  SaldoResumen,
  ValidacionLineas,
} from "./tipos";

const TASA_IVA = 0.19;

/**
 * honorario_clp (capa B, §6): se congela al firmar aunque no exista UI de liquidación.
 * - porcentaje: % del total de la línea (lo que paga el paciente por la línea)
 * - monto_fijo: monto por unidad × cantidad
 * - sueldo / arriendo: no se liquidan por línea → null
 */
export function calcularHonorarioClp(
  resuelto: PrecioResuelto,
  total_linea_clp: number,
  cantidad: number,
): number | null {
  if (resuelto.honorario_tipo == null || resuelto.honorario_valor == null) return null;
  switch (resuelto.honorario_tipo) {
    case "porcentaje":
      return Math.round((total_linea_clp * resuelto.honorario_valor) / 100);
    case "monto_fijo":
      return Math.round(resuelto.honorario_valor * cantidad);
    default:
      return null;
  }
}

export function calcular(
  lineas: LineaInput[],
  modelo: ModeloPrecio,
): PresupuestoCalculado {
  const calculadas: LineaCalculada[] = lineas.map((linea) => {
    const resuelto = resolverPrecio(linea.prestacion, linea.override, modelo);
    const cantidad = linea.cantidad;
    const descuento_pct = linea.descuento_pct ?? 0;
    const subtotal_linea = resuelto.precio_unitario * cantidad;
    const descuento_clp =
      linea.descuento_clp && linea.descuento_clp > 0
        ? Math.round(linea.descuento_clp)
        : Math.round((subtotal_linea * descuento_pct) / 100);
    const total_linea_clp = subtotal_linea - descuento_clp;
    const iva_linea_clp = resuelto.afecta_iva
      ? Math.round((total_linea_clp / (1 + TASA_IVA)) * TASA_IVA)
      : 0;

    return {
      id_prestacion: linea.prestacion.id,
      codigo: linea.prestacion.codigo,
      descripcion: linea.prestacion.nombre,
      cantidad,
      ...resuelto,
      descuento_pct,
      descuento_clp,
      subtotal_linea,
      total_linea_clp,
      iva_linea_clp,
      pieza: linea.pieza ?? null,
      superficie: linea.superficie ?? null,
      id_profesional: linea.id_profesional ?? null,
      honorario_clp: calcularHonorarioClp(resuelto, total_linea_clp, cantidad),
    };
  });

  const subtotal_clp = calculadas.reduce((s, l) => s + l.subtotal_linea, 0);
  const descuento_clp = calculadas.reduce((s, l) => s + l.descuento_clp, 0);
  const total_clp = calculadas.reduce((s, l) => s + l.total_linea_clp, 0);
  const iva_clp = calculadas.reduce((s, l) => s + l.iva_linea_clp, 0);

  return {
    lineas: calculadas,
    subtotal_clp,
    descuento_clp,
    total_clp,
    iva_clp,
    neto_clp: total_clp - iva_clp,
    pendiente_tarificar: calculadas.some((l) => l.pendiente_tarificar),
  };
}

/** Regla §4: con ítems pendientes de tarificar (precio resuelto 0) no se firma. */
export function puedeFirmar(calculo: PresupuestoCalculado): boolean {
  return calculo.lineas.length > 0 && !calculo.pendiente_tarificar;
}

/**
 * Validación server-side de líneas (§5): el server no confía en el form.
 * - cantidad entera >= 1
 * - descuento_pct en [0, 100] y <= descuento_max_pct de la clínica
 * - descuento_clp >= 0; 0 si no aplica
 * - si la clínica no permite descuento por ítem, ningún descuento > 0
 */
export function validarLineas(
  lineas: LineaInput[],
  politica: PoliticaDescuento,
): ValidacionLineas {
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const n = i + 1;
    const pct = linea.descuento_pct ?? 0;
    const clp = linea.descuento_clp ?? 0;

    if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1) {
      return { ok: false, error: `Ítem ${n}: la cantidad debe ser un entero mayor o igual a 1.` };
    }
    if (
      linea.prestacion.requiere_pieza &&
      (linea.pieza == null || !Number.isInteger(linea.pieza) || linea.pieza < 11 || linea.pieza > 48)
    ) {
      return { ok: false, error: `Ítem ${n}: la prestación requiere pieza dentaria (FDI 11–48).` };
    }
    if (
      linea.pieza != null &&
      (!Number.isInteger(linea.pieza) || linea.pieza < 11 || linea.pieza > 48)
    ) {
      return { ok: false, error: `Ítem ${n}: pieza fuera de rango FDI (11–48).` };
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { ok: false, error: `Ítem ${n}: descuento_pct inválido.` };
    }
    if (!Number.isFinite(clp) || clp < 0) {
      return { ok: false, error: `Ítem ${n}: descuento en CLP inválido.` };
    }
    if (!politica.permite_descuento_item && (pct > 0 || clp > 0)) {
      return { ok: false, error: "La clínica no permite descuentos por ítem." };
    }
    if (pct > politica.descuento_max_pct) {
      return {
        ok: false,
        error: `Ítem ${n}: el descuento (${pct}%) excede el máximo de la clínica (${politica.descuento_max_pct}%).`,
      };
    }
  }
  return { ok: true };
}

/**
 * Saldo (§7): derivado, nunca columna.
 * Solo pagos con estado 'aprobado' suman al pagado.
 */
export function calcularSaldo(total_clp: number, pagos: PagoParaSaldo[]): SaldoResumen {
  const pagado_clp = pagos
    .filter((p) => p.estado === "aprobado")
    .reduce((s, p) => s + p.monto_clp, 0);
  return { pagado_clp, saldo_clp: total_clp - pagado_clp };
}
