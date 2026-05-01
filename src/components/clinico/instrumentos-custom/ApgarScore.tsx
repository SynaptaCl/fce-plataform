'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";

const CRITERIOS = [
  {
    claveBase: "apariencia",
    label: "Apariencia (color)",
    opciones: [
      { valor: 0, label: "Azul/pálido" },
      { valor: 1, label: "Cuerpo rosado, extremidades azules" },
      { valor: 2, label: "Completamente rosado" },
    ],
  },
  {
    claveBase: "pulso",
    label: "Pulso",
    opciones: [
      { valor: 0, label: "Ausente" },
      { valor: 1, label: "<100 lpm" },
      { valor: 2, label: "≥100 lpm" },
    ],
  },
  {
    claveBase: "gesticulacion",
    label: "Gesticulación (reflejo)",
    opciones: [
      { valor: 0, label: "Sin respuesta" },
      { valor: 1, label: "Mueca" },
      { valor: 2, label: "Llanto, tos, estornudo" },
    ],
  },
  {
    claveBase: "actividad",
    label: "Actividad (tono)",
    opciones: [
      { valor: 0, label: "Flácido" },
      { valor: 1, label: "Algo de flexión" },
      { valor: 2, label: "Movimiento activo" },
    ],
  },
  {
    claveBase: "respiracion",
    label: "Respiración",
    opciones: [
      { valor: 0, label: "Ausente" },
      { valor: 1, label: "Lenta/irregular" },
      { valor: 2, label: "Vigorosa, llanto" },
    ],
  },
] as const;

type CriterioBase = (typeof CRITERIOS)[number]["claveBase"];
type Timing = "1m" | "5m";

function getInterpretacion(puntaje: number): { label: string; colorClass: string } {
  if (puntaje >= 7) return { label: "Normal", colorClass: "bg-green-100 text-green-800" };
  if (puntaje >= 4) return { label: "Moderadamente deprimido", colorClass: "bg-yellow-100 text-yellow-800" };
  return { label: "Gravemente deprimido", colorClass: "bg-red-100 text-red-800" };
}

function calcularPuntaje(valor: Record<string, number>, timing: Timing): number | null {
  const vals = CRITERIOS.map((c) => valor[`${c.claveBase}_${timing}`]);
  if (vals.some((v) => v === undefined)) return null;
  return vals.reduce((a, b) => a + b, 0);
}

export default function ApgarScore({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const puntaje1m = useMemo(() => calcularPuntaje(valor, "1m"), [valor]);
  const puntaje5m = useMemo(() => calcularPuntaje(valor, "5m"), [valor]);

  function handleChange(claveBase: CriterioBase, timing: Timing, val: number) {
    onChange({ ...valor, [`${claveBase}_${timing}`]: val });
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
        <p className="text-xs text-yellow-800 font-medium">
          ⚠ Este instrumento está pendiente de validación clínica. Usar con criterio profesional.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th
                className="text-left py-2 pr-4 font-medium text-sm w-1/2"
                style={{ color: "var(--color-ink-1)", borderBottom: "1px solid var(--color-kp-border)" }}
              >
                Criterio
              </th>
              <th
                className="text-center py-2 px-3 font-medium text-sm"
                style={{ color: "var(--color-ink-1)", borderBottom: "1px solid var(--color-kp-border)" }}
              >
                1 min
              </th>
              <th
                className="text-center py-2 px-3 font-medium text-sm"
                style={{ color: "var(--color-ink-1)", borderBottom: "1px solid var(--color-kp-border)" }}
              >
                5 min
              </th>
            </tr>
          </thead>
          <tbody>
            {CRITERIOS.map((criterio) => (
              <tr key={criterio.claveBase}>
                <td
                  className="py-3 pr-4 align-top font-medium"
                  style={{ color: "var(--color-ink-1)", borderBottom: "1px solid var(--color-kp-border)" }}
                >
                  {criterio.label}
                  <div className="mt-1 space-y-0.5">
                    {criterio.opciones.map((op) => (
                      <p key={op.valor} className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                        {op.valor}: {op.label}
                      </p>
                    ))}
                  </div>
                </td>
                {(["1m", "5m"] as Timing[]).map((timing) => {
                  const clave = `${criterio.claveBase}_${timing}`;
                  const valorActual = valor[clave];
                  return (
                    <td
                      key={timing}
                      className="py-3 px-3 align-top text-center"
                      style={{ borderBottom: "1px solid var(--color-kp-border)" }}
                    >
                      {readOnly ? (
                        <span className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
                          {valorActual !== undefined ? valorActual : "—"}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {criterio.opciones.map((op) => (
                            <label
                              key={op.valor}
                              className="flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={clave}
                                value={op.valor}
                                checked={valorActual === op.valor}
                                onChange={() =>
                                  handleChange(criterio.claveBase, timing, op.valor)
                                }
                                className="accent-[var(--color-kp-accent)]"
                              />
                              <span className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                                {op.valor}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="border-t pt-3 grid grid-cols-2 gap-4"
        style={{ borderColor: "var(--color-kp-border)" }}
      >
        {([["1m", puntaje1m], ["5m", puntaje5m]] as [string, number | null][]).map(
          ([timing, puntaje]) =>
            puntaje !== null ? (
              <div key={timing} className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                  Apgar {timing}: {puntaje}/10
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getInterpretacion(puntaje).colorClass}`}
                >
                  {getInterpretacion(puntaje).label}
                </span>
              </div>
            ) : null
        )}
      </div>
    </div>
  );
}
