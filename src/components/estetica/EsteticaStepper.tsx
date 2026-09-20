"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type EsteticaStep = "datos" | "zonas" | "fotos" | "firma";

const STEPS: { id: EsteticaStep; label: string }[] = [
  { id: "datos", label: "Datos" },
  { id: "zonas", label: "Zonas" },
  { id: "fotos", label: "Fotos" },
  { id: "firma", label: "Firma" },
];

interface Props {
  current: EsteticaStep;
  onChange: (step: EsteticaStep) => void;
  /** Pasos que ya tienen algo guardado — se marcan con check, no bloquean navegación. */
  completed: Partial<Record<EsteticaStep, boolean>>;
  disabled?: boolean;
}

export function EsteticaStepper({ current, onChange, completed, disabled }: Props) {
  return (
    <nav className="flex items-center gap-1" aria-label="Pasos de la ficha estética">
      {STEPS.map((step, i) => {
        const isActive = step.id === current;
        const isDone = completed[step.id] && !isActive;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(step.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed",
              )}
              style={{
                background: isActive ? "var(--color-kp-accent-lt)" : "transparent",
                color: isActive ? "var(--color-kp-primary)" : "var(--color-ink-2)",
              }}
            >
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0"
                style={{
                  background: isActive
                    ? "var(--color-kp-accent)"
                    : isDone
                      ? "var(--color-kp-success)"
                      : "var(--color-kp-border)",
                  color: isActive || isDone ? "#fff" : "var(--color-ink-3)",
                }}
              >
                {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <span className="w-3 h-px shrink-0" style={{ background: "var(--color-kp-border)" }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
