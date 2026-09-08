"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ZONAS_FACIALES } from "@/lib/estetica/zonas";
import type { FichaEsteticaZona } from "@/types/estetica";

interface Props {
  zonasTratadas: FichaEsteticaZona[];
  onZonaClick: (zonaCodigo: string) => void;
  readOnly: boolean;
}

// Puntos anatómicos sobre la silueta (viewBox 0 0 200 250) — bilaterales donde aplica.
const POSICIONES: Record<string, { x: number; y: number }[]> = {
  frente: [{ x: 100, y: 50 }],
  entrecejo: [{ x: 100, y: 82 }],
  patas_gallo: [{ x: 56, y: 97 }, { x: 144, y: 97 }],
  nasolabial: [{ x: 78, y: 140 }, { x: 122, y: 140 }],
  menton: [{ x: 100, y: 172 }],
  pomulos: [{ x: 62, y: 120 }, { x: 138, y: 120 }],
  labios: [{ x: 100, y: 157 }],
};

export function MapaFacialInteractivo({ zonasTratadas, onZonaClick, readOnly }: Props) {
  const tratadaSet = new Set(zonasTratadas.map((z) => z.zona_codigo));
  const tratadas = ZONAS_FACIALES.filter((z) => tratadaSet.has(z.codigo)).length;

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "var(--color-kp-border)",
        background: "linear-gradient(180deg, var(--color-kp-accent-xs) 0%, var(--color-surface-1) 42%)",
      }}
    >
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "var(--color-kp-border)" }}
      >
        <span className="text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: "var(--color-ink-3)" }}>
          Mapa facial
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: tratadas > 0 ? "var(--color-kp-accent-lt)" : "var(--color-surface-0)",
            color: "var(--color-kp-primary)",
          }}
        >
          {tratadas} de {ZONAS_FACIALES.length} zonas
        </span>
      </header>

      <div className="px-4 py-5 flex flex-col items-center gap-4">
        <svg viewBox="0 0 200 250" className="w-64 h-auto" aria-label={`Mapa de zonas faciales, ${tratadas} de ${ZONAS_FACIALES.length} tratadas`}>
          <defs>
            <radialGradient id="est-f-body" cx="50%" cy="40%" r="68%">
              <stop offset="0%" style={{ stopColor: "var(--color-surface-1)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-surface-0)" }} />
            </radialGradient>
            <filter id="est-f-glow" x="-140%" y="-140%" width="380%" height="380%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <pattern id="est-f-dots" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="1.4" r="1" fill="var(--color-ink-4)" opacity="0.35" />
            </pattern>
          </defs>

          {/* Lienzo — trama de puntos tipo carta anatómica */}
          <rect x="1" y="1" width="198" height="248" rx="14" fill="url(#est-f-dots)" />

          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Hombros + cuello (detrás del rostro) */}
            <path
              d="M 46 230 C 60 208 78 200 100 198 C 122 200 140 208 154 230 L 154 237 L 46 237 Z"
              fill="url(#est-f-body)"
              stroke="var(--color-kp-border-md)"
              strokeWidth="1.2"
            />
            <path d="M 86 158 L 114 158 L 119 204 Q 100 198 81 204 Z" fill="url(#est-f-body)" stroke="var(--color-kp-border-md)" strokeWidth="1.1" />

            {/* Rostro — óvalo orgánico con mentón */}
            <path
              d="M 100 26 C 127 26 146 46 147 74 C 148 98 142 120 132 142 C 124 160 113 175 100 183 C 87 175 76 160 68 142 C 58 120 52 98 53 74 C 54 46 73 26 100 26 Z"
              fill="url(#est-f-body)"
              stroke="var(--color-kp-border-md)"
              strokeWidth="1.4"
            />

            {/* Rasgos finos — lectura anatómica, decorativos */}
            <g fill="none" stroke="var(--color-kp-border-md)" strokeWidth="1.1" opacity="0.55" strokeLinecap="round">
              <path d="M 60 84 Q 70 78 81 83" />
              <path d="M 119 83 Q 130 78 140 84" />
              <path d="M 61 95 Q 70 100 79 95" />
              <path d="M 121 95 Q 130 100 139 95" />
              <path d="M 100 100 Q 97 116 93 124 Q 99 128 107 124" />
            </g>
            <path
              d="M 88 154 Q 94 149 100 152 Q 106 149 112 154 Q 106 162 100 162 Q 94 162 88 154 Z"
              fill="var(--color-kp-border-md)"
              opacity="0.22"
            />
            {/* Contorno de pómulos */}
            <g fill="none" stroke="var(--color-kp-border)" strokeWidth="1" opacity="0.6" strokeLinecap="round">
              <path d="M 63 106 Q 60 124 68 140" />
              <path d="M 137 106 Q 140 124 132 140" />
            </g>
          </motion.g>

          {/* Marcadores por zona */}
          {ZONAS_FACIALES.map((zona, zi) => {
            const puntos = POSICIONES[zona.codigo] ?? [];
            const tratada = tratadaSet.has(zona.codigo);
            return puntos.map((pos, i) => (
              <motion.g
                key={`${zona.codigo}-${i}`}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.25 + (zi + i) * 0.06 }}
                whileHover={readOnly ? undefined : "hover"}
                whileTap={readOnly ? undefined : { scale: 0.9 }}
                style={{ cursor: readOnly ? "default" : "pointer" }}
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                aria-label={`Zona ${zona.label}${tratada ? " — tratada" : ""}`}
                onClick={() => !readOnly && onZonaClick(zona.codigo)}
                onKeyDown={
                  readOnly
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onZonaClick(zona.codigo);
                        }
                      }
                }
              >
                <title>{`${zona.label}${tratada ? " · tratada" : ""}`}</title>
                {tratada ? (
                  <>
                    {/* Halo pulsante — zona registrada */}
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={13}
                      fill="var(--color-kp-accent)"
                      filter="url(#est-f-glow)"
                      animate={{ opacity: [0.14, 0.3, 0.14], r: [12, 15, 12] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx={pos.x} cy={pos.y} r={9} fill="var(--color-surface-1)" />
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={9}
                      fill="none"
                      stroke="var(--color-kp-accent)"
                      strokeWidth="1.8"
                      variants={{ hover: { r: 10.5 } }}
                    />
                    <circle cx={pos.x} cy={pos.y} r={4.2} fill="var(--color-kp-accent)" />
                  </>
                ) : (
                  <>
                    <circle cx={pos.x} cy={pos.y} r={10} fill="var(--color-surface-1)" opacity="0.9" />
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={10}
                      fill="none"
                      stroke="var(--color-kp-border-md)"
                      strokeWidth="1.2"
                      strokeDasharray="2.6 3.4"
                      variants={{ hover: { stroke: "var(--color-kp-accent)" } }}
                    />
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={3}
                      fill="var(--color-kp-border-md)"
                      variants={{ hover: { fill: "var(--color-kp-accent)", r: 4 } }}
                    />
                  </>
                )}
              </motion.g>
            ));
          })}
        </svg>

        {/* Etiquetas de zona */}
        <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
          {ZONAS_FACIALES.map((zona) => {
            const tratada = tratadaSet.has(zona.codigo);
            return (
              <button
                key={zona.codigo}
                type="button"
                disabled={readOnly}
                aria-pressed={tratada}
                onClick={() => onZonaClick(zona.codigo)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border pl-2 pr-2.5 py-1 text-[11px] font-medium transition-all duration-200",
                  readOnly ? "cursor-default" : "hover:-translate-y-px hover:shadow-sm",
                  !tratada && !readOnly && "hover:border-[var(--color-kp-accent-md)] hover:bg-[var(--color-kp-accent-xs)]"
                )}
                style={{
                  borderColor: tratada ? "var(--color-kp-accent-md)" : "var(--color-kp-border)",
                  background: tratada ? "var(--color-kp-accent-xs)" : "var(--color-surface-1)",
                  color: tratada ? "var(--color-kp-primary-deep)" : "var(--color-ink-2)",
                }}
              >
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ background: tratada ? "var(--color-kp-accent)" : "var(--color-ink-4)" }}
                />
                {zona.label}
              </button>
            );
          })}
        </div>

        {!readOnly && (
          <p className="text-[10px] text-center" style={{ color: "var(--color-ink-4)" }}>
            Toca un punto del mapa o una etiqueta para registrar la zona tratada
          </p>
        )}
      </div>
    </section>
  );
}
