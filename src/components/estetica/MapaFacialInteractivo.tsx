"use client";

import { motion } from "motion/react";
import { ZONAS_FACIALES } from "@/lib/estetica/zonas";
import type { FichaEsteticaZona } from "@/types/estetica";

interface Props {
  zonasTratadas: FichaEsteticaZona[];
  onZonaClick: (zonaCodigo: string) => void;
  readOnly: boolean;
}

// Coordenadas (viewBox 0 0 200 240) sobre silueta facial — puntos anatómicos bilaterales
// donde aplica: nasolabial/patas de gallo/pomulos se muestran en ambos lados.
const POSICIONES: Record<string, { x: number; y: number }[]> = {
  frente: [{ x: 100, y: 55 }],
  entrecejo: [{ x: 100, y: 90 }],
  patas_gallo: [{ x: 62, y: 95 }, { x: 138, y: 95 }],
  nasolabial: [{ x: 70, y: 145 }, { x: 130, y: 145 }],
  menton: [{ x: 100, y: 200 }],
  pomulos: [{ x: 55, y: 120 }, { x: 145, y: 120 }],
  labios: [{ x: 100, y: 175 }],
};

export function MapaFacialInteractivo({ zonasTratadas, onZonaClick, readOnly }: Props) {
  const tratadaSet = new Set(zonasTratadas.map((z) => z.zona_codigo));

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 240" className="w-64 h-auto" role="img" aria-label="Mapa de zonas faciales">
        <ellipse cx="100" cy="130" rx="70" ry="95" fill="var(--color-surface-0)" stroke="var(--color-kp-border)" strokeWidth="1.5" />
        <ellipse cx="72" cy="95" rx="10" ry="6" fill="none" stroke="var(--color-kp-border)" strokeWidth="1" />
        <ellipse cx="128" cy="95" rx="10" ry="6" fill="none" stroke="var(--color-kp-border)" strokeWidth="1" />
        <path d="M 90 175 Q 100 181 110 175" fill="none" stroke="var(--color-kp-border)" strokeWidth="1" />
        {ZONAS_FACIALES.map((zona) => {
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
        {ZONAS_FACIALES.map((zona) => {
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
