'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";

const SUBESCALAS = [
  {
    clave: "ocular",
    label: "Apertura Ocular",
    opciones: [
      { valor: 4, label: "Espontánea" },
      { valor: 3, label: "Al hablarle" },
      { valor: 2, label: "Al dolor" },
      { valor: 1, label: "Sin respuesta" },
    ],
  },
  {
    clave: "verbal",
    label: "Respuesta Verbal",
    opciones: [
      { valor: 5, label: "Orientado" },
      { valor: 4, label: "Confuso" },
      { valor: 3, label: "Palabras inapropiadas" },
      { valor: 2, label: "Sonidos incomprensibles" },
      { valor: 1, label: "Sin respuesta" },
    ],
  },
  {
    clave: "motor",
    label: "Respuesta Motora",
    opciones: [
      { valor: 6, label: "Obedece órdenes" },
      { valor: 5, label: "Localiza el dolor" },
      { valor: 4, label: "Retirada al dolor" },
      { valor: 3, label: "Flexión anormal" },
      { valor: 2, label: "Extensión anormal" },
      { valor: 1, label: "Sin respuesta" },
    ],
  },
] as const;


function getInterpretacion(puntaje: number): { label: string; colorClass: string } {
  if (puntaje >= 13) return { label: "Leve", colorClass: "bg-green-100 text-green-800" };
  if (puntaje >= 9) return { label: "Moderado", colorClass: "bg-yellow-100 text-yellow-800" };
  return { label: "Grave", colorClass: "bg-red-100 text-red-800" };
}

export default function GlasgowComaScale({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const puntaje = useMemo(() => {
    const vals = [valor["ocular"], valor["verbal"], valor["motor"]];
    if (vals.some((v) => v === undefined)) return null;
    return vals.reduce((a, b) => a + b, 0);
  }, [valor]);

  return (
    <div className="space-y-4">
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
        <p className="text-xs text-yellow-800 font-medium">
          ⚠ Este instrumento está pendiente de validación clínica. Usar con criterio profesional.
        </p>
      </div>

      {SUBESCALAS.map((sub) => (
        <div key={sub.clave} className="space-y-1">
          <p className="text-sm font-medium" style={{ color: "var(--color-ink-1)" }}>
            {sub.label}
          </p>
          {readOnly ? (
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              {sub.opciones.find((o) => o.valor === valor[sub.clave])?.label ?? "—"}
            </p>
          ) : (
            <div className="space-y-1">
              {sub.opciones.map((opcion) => (
                <label key={opcion.valor} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={sub.clave}
                    value={opcion.valor}
                    checked={valor[sub.clave] === opcion.valor}
                    onChange={() => onChange({ ...valor, [sub.clave]: opcion.valor })}
                    className="accent-[var(--color-kp-accent)]"
                  />
                  <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                    {opcion.valor} — {opcion.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {puntaje !== null && (
        <div className="border-t pt-3 flex items-center gap-3" style={{ borderColor: "var(--color-kp-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Total GCS: {puntaje}/15
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getInterpretacion(puntaje).colorClass}`}>
            {getInterpretacion(puntaje).label}
          </span>
        </div>
      )}
    </div>
  );
}
