"use client";

import type { OverrideParaPicker, PrestacionParaPicker } from "@/types/presupuesto";
import { resolverPrecio } from "@/lib/tarificacion/resolver";
import type { ModeloPrecio } from "@/lib/tarificacion";

interface Props {
  prestaciones: PrestacionParaPicker[];
  overrides: OverrideParaPicker[];
  modelo: ModeloPrecio;
  value: string | null;
  onChange: (idPrestacion: string) => void;
  disabled?: boolean;
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Selector de prestaciones del catálogo (sprint PRE-1, F5).
 * Muestra el precio resuelto con resolverPrecio() — mismo choke point que el
 * server; el preview es referencial, el server recalcula siempre al guardar.
 */
export function PrestacionPicker({
  prestaciones,
  overrides,
  modelo,
  value,
  onChange,
  disabled,
}: Props) {
  const overridePorId = new Map(overrides.map((o) => [o.id_prestacion, o]));

  const agrupadas = new Map<string, PrestacionParaPicker[]>();
  for (const p of prestaciones) {
    const categoria = p.categoria || "Otras";
    const grupo = agrupadas.get(categoria) ?? [];
    grupo.push(p);
    agrupadas.set(categoria, grupo);
  }

  const seleccionada = prestaciones.find((p) => p.id === value) ?? null;
  const precioResuelto = seleccionada
    ? resolverPrecio(seleccionada, overridePorId.get(seleccionada.id) ?? null, modelo)
    : null;

  return (
    <div className="space-y-1">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
        style={{
          borderColor: "var(--color-kp-border)",
          background: "var(--color-surface-1)",
          color: "var(--color-ink-1)",
        }}
      >
        <option value="">Seleccionar prestación…</option>
        {Array.from(agrupadas.entries()).map(([categoria, grupo]) => (
          <optgroup key={categoria} label={categoria}>
            {grupo.map((p) => {
              const resuelto = resolverPrecio(p, overridePorId.get(p.id) ?? null, modelo);
              return (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                  {resuelto.pendiente_tarificar ? " — sin precio" : ` — ${formatCLP(resuelto.precio_unitario)}`}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      {seleccionada && precioResuelto && (
        <p
          className="text-xs"
          style={{ color: precioResuelto.pendiente_tarificar ? "#B45309" : "var(--color-ink-3)" }}
        >
          {precioResuelto.pendiente_tarificar
            ? "Prestación sin precio cargado: el presupuesto no podrá firmarse hasta tarificarla."
            : `Precio: ${formatCLP(precioResuelto.precio_unitario)}${
                precioResuelto.afecta_iva ? " (IVA incluido)" : ""
              }`}
        </p>
      )}
    </div>
  );
}
