'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, NumberField, OpcionRadios, TotalRow } from "./shared";

// Códigos numéricos alineados con interpretacion de instrumentos_valoracion:
// 0=Bajo p10 (RCIU), 1=Normal (p10–p90), 2=Sobre p90 (macrosomía)
const OPCIONES_CLASIFICACION = [
  { valor: 0, label: "Bajo percentil 10 — sospecha RCIU" },
  { valor: 1, label: "Normal (p10–p90)" },
  { valor: 2, label: "Sobre percentil 90 — sospecha macrosomía" },
] as const;

const CHIP_COLOR: Record<number, "red" | "green" | "orange"> = { 0: "red", 1: "green", 2: "orange" };

export default function AlarconPinaresChart({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const alturaUterina = typeof valor["altura_uterina"] === "number" ? valor["altura_uterina"] as number : undefined;
  const semana = typeof valor["semana"] === "number" ? valor["semana"] as number : undefined;
  const clasificacion = typeof valor["clasificacion"] === "number" ? valor["clasificacion"] as number : undefined;

  const delta = useMemo(() => {
    if (alturaUterina === undefined || semana === undefined) return null;
    return Number((alturaUterina - semana).toFixed(1));
  }, [alturaUterina, semana]);

  // Referencia empírica Alarcón-Pinares: AU (cm) ≈ edad gestacional (semanas) ± 2 cm.
  const sugerida = useMemo(() => {
    if (delta === null) return undefined;
    if (delta < -2) return 0;
    if (delta > 2) return 2;
    return 1;
  }, [delta]);

  function actualizar(
    clas: number | undefined,
    patch: { altura_uterina?: number; semana?: number } = {},
  ) {
    if (readOnly) return;
    const au = "altura_uterina" in patch ? patch.altura_uterina : alturaUterina;
    const eg = "semana" in patch ? patch.semana : semana;
    const nuevoDelta = au !== undefined && eg !== undefined ? Number((au - eg).toFixed(1)) : null;
    const next: Record<string, number | string> = {};
    if (au !== undefined) next["altura_uterina"] = au;
    if (eg !== undefined) next["semana"] = eg;
    if (nuevoDelta !== null) next["delta_au_eg"] = nuevoDelta;
    if (clas !== undefined) {
      next["clasificacion"] = clas;
      next["clasificacion_label"] = OPCIONES_CLASIFICACION.find((o) => o.valor === clas)?.label ?? "";
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <BannerValidacion texto="Referencia aproximada empírica (AU ≈ EG ± 2 cm). La tabla Alarcón-Pinares completa (p10/p90 por semana) requiere validación clínica antes de uso en producción." />

      <NumberField label="Altura uterina (cm)" value={alturaUterina} min={10} max={50} step={0.5}
        onChange={(v) => actualizar(clasificacion, { altura_uterina: v })} readOnly={readOnly} />
      <NumberField label="Semana gestacional" value={semana} min={10} max={42}
        onChange={(v) => actualizar(clasificacion, { semana: v })} readOnly={readOnly} />

      {delta !== null && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Diferencia AU − EG: {delta > 0 ? "+" : ""}{delta} cm
          {sugerida !== undefined && ` · sugerencia: ${OPCIONES_CLASIFICACION[sugerida].label}`}
        </p>
      )}

      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
          Clasificación
        </p>
        <OpcionRadios
          name="alarcon_clasificacion"
          opciones={OPCIONES_CLASIFICACION}
          valor={clasificacion}
          onChange={(v) => actualizar(v)}
          readOnly={readOnly}
        />
      </div>

      {readOnly && clasificacion !== undefined && (
        <TotalRow>
          <ClasificacionChip colorClass={CHIP_COLOR[clasificacion] ?? "green"} texto={valor["clasificacion_label"] as string ?? ""} />
        </TotalRow>
      )}
    </div>
  );
}
