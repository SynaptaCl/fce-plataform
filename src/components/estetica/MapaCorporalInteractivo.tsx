"use client";

import { motion } from "motion/react";
import { ZONAS_CORPORALES } from "@/lib/estetica/zonas";
import type { FichaEsteticaZona } from "@/types/estetica";

interface Props {
  zonasTratadas: FichaEsteticaZona[];
  onZonaClick: (zonaCodigo: string) => void;
  readOnly: boolean;
}

// Coordenadas (viewBox 0 0 200 360) sobre silueta corporal frontal.
const POSICIONES: Record<string, { x: number; y: number }[]> = {
  papada: [{ x: 100, y: 45 }],
  brazos: [{ x: 45, y: 100 }, { x: 155, y: 100 }],
  abdomen: [{ x: 100, y: 140 }],
  flancos: [{ x: 72, y: 155 }, { x: 128, y: 155 }],
  gluteos: [{ x: 100, y: 210 }],
  piernas: [{ x: 75, y: 300 }, { x: 125, y: 300 }],
};

export function MapaCorporalInteractivo({ zonasTratadas, onZonaClick, readOnly }: Props) {
  const tratadaSet = new Set(zonasTratadas.map((z) => z.zona_codigo));

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 360" className="w-56 h-auto" role="img" aria-label="Mapa de zonas corporales">
        <ellipse cx="100" cy="40" rx="25" ry="30" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <rect x="65" y="70" width="70" height="160" rx="30" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <rect x="38" y="78" width="22" height="110" rx="11" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <rect x="140" y="78" width="22" height="110" rx="11" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <rect x="60" y="230" width="30" height="110" rx="14" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <rect x="110" y="230" width="30" height="110" rx="14" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        {ZONAS_CORPORALES.map((zona) => {
          const puntos = POSICIONES[zona.codigo] ?? [];
          const tratada = tratadaSet.has(zona.codigo);
          return puntos.map((pos, i) => (
            <motion.circle
              key={`${zona.codigo}-${i}`}
              cx={pos.x}
              cy={pos.y}
              r={10}
              fill={tratada ? "var(--color-kp-accent)" : "var(--color-surface-1)"}
              stroke="var(--color-kp-accent)"
              strokeWidth="1.5"
              whileHover={readOnly ? undefined : { scale: 1.15 }}
              whileTap={readOnly ? undefined : { scale: 0.95 }}
              style={{ cursor: readOnly ? "default" : "pointer" }}
              onClick={() => !readOnly && onZonaClick(zona.codigo)}
            />
          ));
        })}
      </svg>
      <div className="flex flex-wrap gap-2 justify-center">
        {ZONAS_CORPORALES.map((zona) => {
          const tratada = tratadaSet.has(zona.codigo);
          return (
            <button
              key={zona.codigo}
              type="button"
              disabled={readOnly}
              onClick={() => onZonaClick(zona.codigo)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:cursor-default"
              style={{
                borderColor: tratada ? "var(--color-kp-accent)" : "var(--color-kp-border)",
                background: tratada ? "var(--color-kp-accent)" : "transparent",
                color: tratada ? "#fff" : "var(--color-ink-2)",
              }}
            >
              {zona.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
