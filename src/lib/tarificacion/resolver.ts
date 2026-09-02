/**
 * resolverPrecio — choke point único de precio (sprint PRE-1 §4).
 *
 * La consumen agenda (synapta) y presupuesto (fce) por igual: dos
 * implementaciones = dos precios distintos para lo mismo. Prohibido reimplementar.
 *
 * Función pura, server-safe, sin imports de React/Next ni DB.
 */

import type {
  ModeloPrecio,
  OrigenPrecio,
  OverridePrecioInput,
  PrestacionCatalogo,
  PrecioResuelto,
} from "./tipos";

export function resolverPrecio(
  prestacion: PrestacionCatalogo,
  override: OverridePrecioInput | null,
  modelo: ModeloPrecio,
): PrecioResuelto {
  const base = Math.round(prestacion.precio_base);
  const honorario_tipo = override?.honorario_tipo ?? null;
  const honorario_valor = override?.honorario_valor ?? null;

  let recargo_pct = 0;
  let precio_unitario = base;
  let origen: OrigenPrecio = "clinica";

  switch (modelo) {
    case "centralizado":
      // precio_override y recargo_pct se ignoran por completo
      break;
    case "base_mas_recargo":
      recargo_pct = override?.recargo_pct ?? 0;
      precio_unitario = Math.round(base * (1 + recargo_pct / 100));
      origen = "recargo";
      break;
    case "por_profesional":
      if (override?.precio_override != null) {
        precio_unitario = Math.round(override.precio_override);
        origen = "profesional";
      }
      break;
  }

  return {
    precio_base: base,
    recargo_pct,
    precio_unitario,
    afecta_iva: prestacion.afecta_iva,
    origen,
    // Regla dura §4: precio resuelto <= 0 ⇒ pendiente de tarificar, no se cotiza en $0.
    pendiente_tarificar: precio_unitario <= 0,
    honorario_tipo,
    honorario_valor,
  };
}
