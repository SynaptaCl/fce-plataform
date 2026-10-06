'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, NumberField, TotalRow } from "./shared";

// CPOD (permanente) / ceod (temporal) — dientes Cariados, Perdidos, Obturados. Estándar OMS.
// Interpretación alineada con interpretacion DB (bandas OMS del índice promedio):
// 0=Muy bajo (0–1.1), 1=Bajo (1.2–2.6), 2=Moderado (2.7–4.4), 3=Alto (4.5–6.5), 4=Muy alto (≥6.6)
function clasificarIndice(indice: number): { codigo: number; label: string; color: "blue" | "green" | "yellow" | "orange" | "red" } {
  if (indice <= 1.1) return { codigo: 0, label: "Muy bajo", color: "blue" };
  if (indice <= 2.6) return { codigo: 1, label: "Bajo", color: "green" };
  if (indice <= 4.4) return { codigo: 2, label: "Moderado", color: "yellow" };
  if (indice <= 6.5) return { codigo: 3, label: "Alto", color: "orange" };
  return { codigo: 4, label: "Muy alto", color: "red" };
}

const DENTICIONES = [
  { valor: "permanente", label: "Permanente (CPOD)", perdidos: "Perdidos (P)" },
  { valor: "temporal", label: "Temporal (ceod)", perdidos: "Extraídos por caries (e)" },
] as const;

export default function CpodIndex({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const denticion = typeof valor["denticion"] === "string" ? valor["denticion"] as string : undefined;
  const cariados = typeof valor["cariados"] === "number" ? valor["cariados"] as number : undefined;
  const perdidos = typeof valor["perdidos"] === "number" ? valor["perdidos"] as number : undefined;
  const obturados = typeof valor["obturados"] === "number" ? valor["obturados"] as number : undefined;

  const maxDientes = denticion === "temporal" ? 20 : 28;

  const indice = useMemo(() => {
    if (cariados === undefined || perdidos === undefined || obturados === undefined) return null;
    return cariados + perdidos + obturados;
  }, [cariados, perdidos, obturados]);

  function actualizar(dent?: string, c?: number, p?: number, o?: number) {
    if (readOnly) return;
    const next: Record<string, number | string> = {};
    if (dent) next["denticion"] = dent;
    if (c !== undefined) next["cariados"] = c;
    if (p !== undefined) next["perdidos"] = p;
    if (o !== undefined) next["obturados"] = o;
    if (c !== undefined && p !== undefined && o !== undefined) {
      const suma = c + p + o;
      const res = clasificarIndice(suma);
      next["indice"] = suma;
      next["clasificacion_label"] = res.label;
    }
    onChange(next);
  }

  const resultado = indice !== null ? clasificarIndice(indice) : null;

  const labelPerdidos = DENTICIONES.find((d) => d.valor === denticion)?.perdidos ?? "Perdidos (P)";

  return (
    <div className="space-y-4">
      <BannerValidacion texto="Registro de conteo de dientes. El índice clasifica la experiencia de caries del paciente (no reemplaza el diagnóstico por pieza del odontograma). Pendiente de validación clínica." />

      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
          Dentición
        </p>
        {readOnly ? (
          <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
            {denticion === "temporal" ? "Temporal (ceod)" : denticion === "permanente" ? "Permanente (CPOD)" : "—"}
          </p>
        ) : (
          <div className="flex gap-2">
            {DENTICIONES.map((d) => (
              <button
                key={d.valor}
                type="button"
                onClick={() => actualizar(d.valor, cariados, perdidos, obturados)}
                className="text-xs px-3 py-1.5 rounded-md border font-medium"
                style={{
                  borderColor: denticion === d.valor ? "var(--color-kp-accent)" : "var(--color-kp-border)",
                  background: denticion === d.valor ? "var(--color-kp-accent-xs)" : "transparent",
                  color: "var(--color-ink-1)",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {denticion && (
        <>
          <NumberField label="Dientes cariados (C/c)" value={cariados} min={0} max={maxDientes}
            onChange={(v) => actualizar(denticion, v ?? undefined, perdidos, obturados)} readOnly={readOnly} />
          <NumberField label={`Dientes ${labelPerdidos.toLowerCase()}`} value={perdidos} min={0} max={maxDientes}
            onChange={(v) => actualizar(denticion, cariados, v ?? undefined, obturados)} readOnly={readOnly} />
          <NumberField label="Dientes obturados (O/o)" value={obturados} min={0} max={maxDientes}
            onChange={(v) => actualizar(denticion, cariados, perdidos, v ?? undefined)} readOnly={readOnly} />
        </>
      )}

      {indice !== null && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {denticion === "temporal" ? "ceod" : "CPOD"}: {indice}
          </span>
          {resultado && <ClasificacionChip colorClass={resultado.color} texto={resultado.label} />}
        </TotalRow>
      )}
    </div>
  );
}
