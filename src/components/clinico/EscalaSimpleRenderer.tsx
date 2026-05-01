'use client';

import { useMemo } from "react";
import { calcularPuntaje } from "@/lib/instrumentos/calcular";
import { interpretarPuntaje } from "@/lib/instrumentos/interpretar";
import type { InstrumentoCustomProps, InterpretacionRango } from "@/types/instrumento";

const colorClasses: Record<InterpretacionRango["color"], string> = {
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-800",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
};

export function EscalaSimpleRenderer({
  schema,
  valor,
  onChange,
  readOnly,
}: InstrumentoCustomProps) {
  const items = schema.schema_items?.items ?? [];

  const puntaje = useMemo(() => {
    if (!schema.schema_items || Object.keys(valor).length === 0) return null;
    return calcularPuntaje(schema.schema_items, valor);
  }, [schema.schema_items, valor]);

  const interpretacion = useMemo(() => {
    if (puntaje === null || !schema.interpretacion?.length) return null;
    return interpretarPuntaje(puntaje, schema.interpretacion);
  }, [puntaje, schema.interpretacion]);

  const hasAnyValue = Object.keys(valor).length > 0;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.codigo} className="space-y-1">
          <p className="text-sm font-medium" style={{ color: "var(--color-ink-1)" }}>
            {item.label}
          </p>
          {readOnly ? (
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              {item.opciones.find((o) => o.valor === valor[item.codigo])
                ?.label ?? "—"}
            </p>
          ) : (
            <div className="space-y-1">
              {item.opciones.map((opcion) => (
                <label
                  key={opcion.valor}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={item.codigo}
                    value={opcion.valor}
                    checked={valor[item.codigo] === opcion.valor}
                    onChange={() =>
                      onChange({ ...valor, [item.codigo]: opcion.valor })
                    }
                    className="accent-[var(--color-kp-accent)]"
                  />
                  <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                    {opcion.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {hasAnyValue && (
        <div
          className="border-t pt-3 flex items-center gap-3"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-ink-1)" }}
          >
            {puntaje !== null
              ? `Puntaje: ${puntaje}`
              : "Puntaje: (completa todos los ítems)"}
          </span>
          {interpretacion && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                colorClasses[
                  interpretacion.color as InterpretacionRango["color"]
                ]
              }`}
            >
              {interpretacion.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
