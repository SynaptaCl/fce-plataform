'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, NumberField, TotalRow } from "./shared";

// Índice de O'Leary: % de superficies con placa bacteriana tras tinción.
// Interpretación alineada con interpretacion DB:
// 0=Higiene aceptable (≤20%), 1=Higiene deficiente (21–50%), 2=Higiene muy deficiente (>50%)
function clasificarPorcentaje(porcentaje: number): { codigo: number; label: string; color: "green" | "yellow" | "red" } {
  if (porcentaje <= 20) return { codigo: 0, label: "Higiene aceptable", color: "green" };
  if (porcentaje <= 50) return { codigo: 1, label: "Higiene deficiente", color: "yellow" };
  return { codigo: 2, label: "Higiene muy deficiente", color: "red" };
}

export default function OlearyIndex({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const examinadas = typeof valor["superficies_examinadas"] === "number" ? valor["superficies_examinadas"] as number : undefined;
  const conPlaca = typeof valor["superficies_con_placa"] === "number" ? valor["superficies_con_placa"] as number : undefined;

  const porcentaje = useMemo(() => {
    if (!examinadas || examinadas <= 0 || conPlaca === undefined) return null;
    return Number(((conPlaca / examinadas) * 100).toFixed(1));
  }, [examinadas, conPlaca]);

  function actualizar(exam?: number, placa?: number) {
    if (readOnly) return;
    const next: Record<string, number | string> = {};
    if (exam !== undefined) next["superficies_examinadas"] = exam;
    if (placa !== undefined) next["superficies_con_placa"] = placa;
    if (exam && exam > 0 && placa !== undefined) {
      const pct = Number(((placa / exam) * 100).toFixed(1));
      const res = clasificarPorcentaje(pct);
      next["porcentaje_placa"] = pct;
      next["clasificacion"] = res.codigo;
      next["clasificacion_label"] = res.label;
    }
    onChange(next);
  }

  const resultado = porcentaje !== null ? clasificarPorcentaje(porcentaje) : null;

  return (
    <div className="space-y-4">
      <BannerValidacion texto="Versión resumida: registro de totales de superficies tras tinción. La puntuación superficie por superficie (4 × diente) requiere planilla de registro. Pendiente de validación clínica." />

      <NumberField label="Superficies examinadas (máx. 112)" value={examinadas} min={1} max={112}
        onChange={(v) => actualizar(v ?? undefined, conPlaca)} readOnly={readOnly} />
      <NumberField label="Superficies con placa" value={conPlaca} min={0} max={examinadas ?? 112}
        onChange={(v) => actualizar(examinadas, v ?? undefined)} readOnly={readOnly} />

      {porcentaje !== null && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Índice de placa: {porcentaje}%
          </span>
          {resultado && <ClasificacionChip colorClass={resultado.color} texto={resultado.label} />}
        </TotalRow>
      )}
    </div>
  );
}
