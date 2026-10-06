'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, NumberField, OpcionRadios, TotalRow } from "./shared";

// EEDP: 4 áreas, puntajes directos ingresados por el profesional.
// La tabla normativa de puntos de corte es específica por edad (Control Niño Sano,
// publicación original) y NO se incluye aquí — el profesional la consulta y
// registra la clasificación resultante. Códigos alineados con interpretacion DB:
// 0=Normal, 1=Riesgo, 2=Retraso
const AREAS = [
  { clave: "social", label: "Área Social" },
  { clave: "lenguaje", label: "Área Lenguaje" },
  { clave: "coordinacion", label: "Área Coordinación" },
  { clave: "motricidad", label: "Área Motricidad" },
] as const;

const OPCIONES_CLASIFICACION = [
  { valor: 0, label: "Normal" },
  { valor: 1, label: "Riesgo — control en 1 mes" },
  { valor: 2, label: "Retraso — derivar a especialista" },
] as const;

const CHIP_COLOR: Record<number, "green" | "yellow" | "red"> = { 0: "green", 1: "yellow", 2: "red" };

export default function EEDPAssessment({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const edad = typeof valor["edad_meses"] === "number" ? valor["edad_meses"] as number : undefined;
  const clasificacion = typeof valor["clasificacion"] === "number" ? valor["clasificacion"] as number : undefined;

  const puntajes = useMemo(() => {
    const out: Record<string, number | undefined> = {};
    for (const area of AREAS) {
      out[area.clave] = typeof valor[area.clave] === "number" ? valor[area.clave] as number : undefined;
    }
    return out;
  }, [valor]);

  const pgd = useMemo(
    () =>
      AREAS.reduce((acc, area) => acc + (puntajes[area.clave] ?? 0), 0),
    [puntajes],
  );

  const areasCompletas = AREAS.every((area) => puntajes[area.clave] !== undefined);

  function actualizar(campo: string, v: number | undefined, clas?: number) {
    if (readOnly) return;
    const next: Record<string, number | string> = { ...valor };
    if (v === undefined) delete next[campo];
    else next[campo] = v;
    if (areasCompletas) next["pgd"] = pgd;
    else delete next["pgd"];
    if (clas !== undefined) {
      next["clasificacion"] = clas;
      next["clasificacion_label"] = OPCIONES_CLASIFICACION.find((o) => o.valor === clas)?.label ?? "";
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <BannerValidacion texto="UI de registro de puntajes directos (4 áreas + PGD). Los puntos de corte normativos del EEDP son específicos por edad: consultar la tabla publicada para clasificar. Pendiente de validación clínica." />

      <NumberField label="Edad del lactante (meses)" value={edad} min={0} max={24}
        onChange={(v) => actualizar("edad_meses", v, clasificacion)} readOnly={readOnly} />

      {AREAS.map((area) => (
        <NumberField
          key={area.clave}
          label={`${area.label} — puntaje directo`}
          value={puntajes[area.clave]}
          min={0}
          onChange={(v) => actualizar(area.clave, v, clasificacion)}
          readOnly={readOnly}
        />
      ))}

      {areasCompletas && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          PGD (puntaje global directo): {pgd}
        </p>
      )}

      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
          Clasificación (según tabla normativa por edad)
        </p>
        <OpcionRadios
          name="eedp_clasificacion"
          opciones={OPCIONES_CLASIFICACION}
          valor={clasificacion}
          onChange={(v) => actualizar("clasificacion", clasificacion, v)}
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
