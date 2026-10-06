'use client';

import type { ReactNode } from "react";

// Helpers compartidos para componentes de instrumentos custom.
// Sigue el patrón visual de GlasgowComaScale (tokens var(--color-kp-*)).

const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-800",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
};

export function BannerValidacion({ texto }: { texto: string }) {
  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
      <p className="text-xs text-yellow-800 font-medium">
        ⚠ {texto}
      </p>
    </div>
  );
}

export interface OpcionNumerica {
  valor: number;
  label: string;
}

export function OpcionRadios({
  name,
  opciones,
  valor,
  onChange,
  readOnly = false,
}: {
  name: string;
  opciones: readonly OpcionNumerica[];
  valor: number | string | undefined;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
        {opciones.find((o) => o.valor === valor)?.label ?? "—"}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {opciones.map((opcion) => (
        <label key={opcion.valor} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={valor === opcion.valor}
            onChange={() => onChange(opcion.valor)}
            className="accent-[var(--color-kp-accent)]"
          />
          <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
            {opcion.valor} — {opcion.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  readOnly = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
        {label}
      </p>
      {readOnly ? (
        <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
          {value !== undefined ? `${value}${suffix ? ` ${suffix}` : ""}` : "—"}
        </p>
      ) : (
        <input
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : Number(raw));
          }}
          className="w-32 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-0 focus:border-[var(--color-kp-accent)]"
          style={{
            borderColor: "var(--color-kp-border)",
            color: "var(--color-ink-1)",
          }}
        />
      )}
    </div>
  );
}

export function ClasificacionChip({
  colorClass,
  texto,
}: {
  colorClass: "red" | "orange" | "yellow" | "green" | "blue";
  texto: string;
}) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_CLASSES[colorClass]}`}>
      {texto}
    </span>
  );
}

export function TotalRow({ children }: { children: ReactNode }) {
  return (
    <div className="border-t pt-3 flex items-center gap-3" style={{ borderColor: "var(--color-kp-border)" }}>
      {children}
    </div>
  );
}
