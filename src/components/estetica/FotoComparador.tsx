"use client";

import { useState, useEffect, useCallback } from "react";
import { getFotosFicha } from "@/app/actions/estetica/fotos";
import type { FichaEsteticaFotoConUrl } from "@/types/estetica";

interface Props {
  idFicha: string;
  /** I2 — se incrementa desde EsteticaWorkspace tras cada upload exitoso.
   *  idFicha por sí solo no cambia entre subidas, así que sin esta prop el
   *  useEffect de abajo nunca vuelve a dispararse y el comparador queda con
   *  la lista de fotos obsoleta. */
  refreshKey?: number;
}

export function FotoComparador({ idFicha, refreshKey }: Props) {
  const [fotos, setFotos] = useState<FichaEsteticaFotoConUrl[]>([]);
  const [sliderPos, setSliderPos] = useState(50);

  const reload = useCallback(async () => {
    const res = await getFotosFicha(idFicha);
    if (res.success) setFotos(res.data);
  }, [idFicha]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload, refreshKey]);

  const antes = fotos.filter((f) => f.tipo === "antes");
  const despues = fotos.filter((f) => f.tipo === "despues");
  const evolucion = fotos.filter((f) => f.tipo === "evolucion");

  if (fotos.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
        Aún no hay fotografías registradas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {antes[0] && despues[0] && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden select-none" style={{ background: "var(--color-surface-0)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={despues[0].signedUrl} alt="Después" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={antes[0].signedUrl} alt="Antes" className="h-full object-cover" style={{ width: `${10000 / Math.max(sliderPos, 1)}%`, maxWidth: "none" }} />
          </div>
          <div
            className="absolute inset-y-0 w-0.5"
            style={{ left: `${sliderPos}%`, background: "var(--color-kp-accent)" }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            aria-label="Comparar antes y después"
            className="absolute inset-x-0 bottom-2 w-[90%] mx-[5%]"
          />
        </div>
      )}

      {evolucion.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {evolucion.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.id}
              src={f.signedUrl}
              alt="Evolución"
              className="w-24 h-24 object-cover rounded-lg shrink-0"
              style={{ border: "1px solid var(--color-kp-border)" }}
            />
          ))}
        </div>
      )}

      {antes.length === 0 && despues.length === 0 && evolucion.length > 0 && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Sube fotos tipo &ldquo;Antes&rdquo; y &ldquo;Después&rdquo; para activar el comparador.
        </p>
      )}
    </div>
  );
}
