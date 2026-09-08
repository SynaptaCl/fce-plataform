"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ZONAS_CORPORALES } from "@/lib/estetica/zonas";
import type { FichaEsteticaZona } from "@/types/estetica";

interface Props {
  zonasTratadas: FichaEsteticaZona[];
  onZonaClick: (zonaCodigo: string) => void;
  readOnly: boolean;
}

// Puntos anatómicos sobre la silueta (viewBox 0 0 200 380) — bilaterales donde aplica.
const POSICIONES: Record<string, { x: number; y: number }[]> = {
  papada: [{ x: 100, y: 58 }],
  brazos: [{ x: 43, y: 122 }, { x: 157, y: 122 }],
  abdomen: [{ x: 100, y: 138 }],
  flancos: [{ x: 60, y: 178 }, { x: 140, y: 178 }],
  gluteos: [{ x: 100, y: 234 }],
  piernas: [{ x: 77, y: 302 }, { x: 123, y: 302 }],
};

export function MapaCorporalInteractivo({ zonasTratadas, onZonaClick, readOnly }: Props) {
  const tratadaSet = new Set(zonasTratadas.map((z) => z.zona_codigo));
  const tratadas = ZONAS_CORPORALES.filter((z) => tratadaSet.has(z.codigo)).length;

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
          Mapa corporal
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: tratadas > 0 ? "var(--color-kp-accent-lt)" : "var(--color-surface-0)",
            color: "var(--color-kp-primary)",
          }}
        >
          {tratadas} de {ZONAS_CORPORALES.length} zonas
        </span>
      </header>

      <div className="px-4 py-5 flex flex-col items-center gap-4">
        <svg viewBox="0 0 200 380" className="w-56 h-auto" aria-label={`Mapa de zonas corporales, ${tratadas} de ${ZONAS_CORPORALES.length} tratadas`}>
          <defs>
            <radialGradient id="est-c-body" cx="50%" cy="34%" r="72%">
              <stop offset="0%" style={{ stopColor: "var(--color-surface-1)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-surface-0)" }} />
            </radialGradient>
            <filter id="est-c-glow" x="-140%" y="-140%" width="380%" height="380%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <pattern id="est-c-dots" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="1.4" r="1" fill="var(--color-ink-4)" opacity="0.35" />
            </pattern>
          </defs>

          {/* Lienzo — trama de puntos tipo carta anatómica */}
          <rect x="1" y="1" width="198" height="378" rx="14" fill="url(#est-c-dots)" />

          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Brazos — cápsulas con leve ángulo natural */}
            <rect x="32" y="76" width="19" height="98" rx="9.5" transform="rotate(9 41.5 125)" fill="url(#est-c-body)" stroke="var(--color-kp-border-md)" strokeWidth="1.2" />
            <rect x="149" y="76" width="19" height="98" rx="9.5" transform="rotate(-9 158.5 125)" fill="url(#est-c-body)" stroke="var(--color-kp-border-md)" strokeWidth="1.2" />

            {/* Cuello (detrás del torso) */}
            <path d="M 90 44 L 110 44 L 113 70 L 87 70 Z" fill="url(#est-c-body)" stroke="var(--color-kp-border-md)" strokeWidth="1.1" />

            {/* Torso + piernas — silueta continua con cintura y cadera */}
            <path
              d="M 100 62
                 C 82 62 64 68 55 78
                 C 46 88 44 104 43 126
                 C 42 150 45 170 44 190
                 C 43 210 48 224 58 230
                 C 62 254 60 288 61 316
                 C 62 342 63 358 66 368
                 L 91 368
                 C 93 346 96 318 97 292
                 L 103 292
                 C 104 318 107 346 109 368
                 L 134 368
                 C 137 358 138 342 139 316
                 C 140 288 138 254 142 230
                 C 152 224 157 210 156 190
                 C 155 170 158 150 157 126
                 C 156 104 154 88 145 78
                 C 136 68 118 62 100 62 Z"
              fill="url(#est-c-body)"
              stroke="var(--color-kp-border-md)"
              strokeWidth="1.4"
            />

            {/* Cabeza */}
            <circle cx="100" cy="30" r="19" fill="url(#est-c-body)" stroke="var(--color-kp-border-md)" strokeWidth="1.4" />

            {/* Escote y contorno de cintura — lectura anatómica, decorativos */}
            <g fill="none" stroke="var(--color-kp-border)" strokeWidth="1" opacity="0.55" strokeLinecap="round">
              <path d="M 80 72 Q 100 83 120 72" />
              <path d="M 59 186 Q 100 196 141 186" />
              <path d="M 64 224 Q 100 232 136 224" />
            </g>
          </motion.g>

          {/* Marcadores por zona */}
          {ZONAS_CORPORALES.map((zona, zi) => {
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
                      filter="url(#est-c-glow)"
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
          {ZONAS_CORPORALES.map((zona) => {
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
