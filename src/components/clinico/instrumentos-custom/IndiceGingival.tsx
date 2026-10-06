'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, OpcionRadios, TotalRow } from "./shared";

// Índice Gingival de Löe y Silness — 4 sitios por diente, puntuación 0–3.
// Versión resumida: 4 sitios de la sesión → promedio. Interpretación alineada con DB:
// 0=Encía sana, 0.1–1=Leve, 1.1–2=Moderada, 2.1–3=Severa
const SITIOS = [
  { clave: "vestibular", label: "Vestibular" },
  { clave: "mesial", label: "Mesial" },
  { clave: "lingual", label: "Lingual" },
  { clave: "distal", label: "Distal" },
] as const;

const PUNTUACIONES = [
  { valor: 0, label: "0 — Encía normal, sin inflamación" },
  { valor: 1, label: "1 — Inflamación leve, sin sangrado al sondaje" },
  { valor: 2, label: "2 — Inflamación moderada, sangrado al sondaje" },
  { valor: 3, label: "3 — Inflamación severa, sangrado espontáneo" },
] as const;

function clasificarPromedio(promedio: number): { label: string; color: "green" | "yellow" | "orange" | "red" } {
  if (promedio === 0) return { label: "Encía sana", color: "green" };
  if (promedio <= 1) return { label: "Inflamación leve", color: "yellow" };
  if (promedio <= 2) return { label: "Inflamación moderada", color: "orange" };
  return { label: "Inflamación severa", color: "red" };
}

export default function IndiceGingival({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const sitios = useMemo(() => {
    const out: Record<string, number | undefined> = {};
    for (const sitio of SITIOS) {
      out[sitio.clave] = typeof valor[sitio.clave] === "number" ? valor[sitio.clave] as number : undefined;
    }
    return out;
  }, [valor]);

  const completo = SITIOS.every((s) => sitios[s.clave] !== undefined);

  const promedio = useMemo(() => {
    if (!completo) return null;
    return Number((SITIOS.reduce((acc, s) => acc + (sitios[s.clave] ?? 0), 0) / SITIOS.length).toFixed(2));
  }, [completo, sitios]);

  function actualizar(campo: string, v: number) {
    if (readOnly) return;
    const next: Record<string, number | string> = { ...valor, [campo]: v };
    if (SITIOS.every((s) => (s.clave === campo ? v : sitios[s.clave]) !== undefined)) {
      const prom = Number((SITIOS.reduce((acc, s) => acc + ((s.clave === campo ? v : sitios[s.clave]) ?? 0), 0) / SITIOS.length).toFixed(2));
      next["promedio_gi"] = prom;
      next["clasificacion_label"] = clasificarPromedio(prom).label;
    }
    onChange(next);
  }

  const resultado = promedio !== null ? clasificarPromedio(promedio) : null;

  return (
    <div className="space-y-4">
      <BannerValidacion texto="Versión resumida: 4 sitios de la sesión (vestibular, mesial, lingual, distal) → promedio. La puntuación por diente índice (6 dientes de Ramfjord) requiere planilla. Pendiente de validación clínica." />

      {SITIOS.map((sitio) => (
        <div key={sitio.clave}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
            {sitio.label}
          </p>
          <OpcionRadios
            name={`gi_${sitio.clave}`}
            opciones={PUNTUACIONES}
            valor={sitios[sitio.clave]}
            onChange={(v) => actualizar(sitio.clave, v)}
            readOnly={readOnly}
          />
        </div>
      ))}

      {promedio !== null && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Índice Gingival: {promedio}
          </span>
          {resultado && <ClasificacionChip colorClass={resultado.color} texto={resultado.label} />}
        </TotalRow>
      )}
    </div>
  );
}
