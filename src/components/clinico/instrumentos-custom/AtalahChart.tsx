'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, NumberField, TotalRow } from "./shared";
import {
  clasificarGestacional,
  getBandaLimites,
  ATALAH_PENDIENTE_CLINICA,
} from "@/lib/nutricion/atalah";

// Códigos numéricos alineados con interpretacion de instrumentos_valoracion:
// 0=Bajo peso, 1=Normal, 2=Sobrepeso, 3=Obesidad
const ESTADO_CODIGO: Record<string, { codigo: number; label: string; color: "yellow" | "green" | "orange" | "red" }> = {
  bajo_peso: { codigo: 0, label: "Bajo peso", color: "yellow" },
  normal:    { codigo: 1, label: "Normal", color: "green" },
  sobrepeso: { codigo: 2, label: "Sobrepeso", color: "orange" },
  obesa:     { codigo: 3, label: "Obesidad", color: "red" },
};

export default function AtalahChart({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const pesoPregestacional = typeof valor["peso_pregestacional"] === "number" ? valor["peso_pregestacional"] as number : undefined;
  const pesoActual = typeof valor["peso_actual"] === "number" ? valor["peso_actual"] as number : undefined;
  const talla = typeof valor["talla"] === "number" ? valor["talla"] as number : undefined;
  const semana = typeof valor["semana"] === "number" ? valor["semana"] as number : undefined;

  const imcPregestacional = useMemo(() => {
    if (!pesoPregestacional || !talla) return null;
    return Number((pesoPregestacional / Math.pow(talla / 100, 2)).toFixed(1));
  }, [pesoPregestacional, talla]);

  const imcActual = useMemo(() => {
    if (!pesoActual || !talla) return null;
    return Number((pesoActual / Math.pow(talla / 100, 2)).toFixed(1));
  }, [pesoActual, talla]);

  const resultado = useMemo(() => {
    if (imcPregestacional === null || imcActual === null || !semana || semana < 10 || semana > 41) return null;
    return clasificarGestacional(imcPregestacional, imcActual, semana);
  }, [imcPregestacional, imcActual, semana]);

  const banda = useMemo(() => {
    if (imcPregestacional === null || !semana || semana < 10 || semana > 41) return null;
    return getBandaLimites(imcPregestacional, semana);
  }, [imcPregestacional, semana]);

  function actualizar(estado?: string) {
    if (readOnly) return;
    const next: Record<string, number | string> = {};
    if (pesoPregestacional !== undefined) next["peso_pregestacional"] = pesoPregestacional;
    if (pesoActual !== undefined) next["peso_actual"] = pesoActual;
    if (talla !== undefined) next["talla"] = talla;
    if (semana !== undefined) next["semana"] = semana;
    if (imcPregestacional !== null) next["imc_pregestacional"] = imcPregestacional;
    if (imcActual !== null) next["imc_actual"] = imcActual;
    if (estado) {
      const cfg = ESTADO_CODIGO[estado];
      next["estado"] = estado;
      next["clasificacion"] = cfg.codigo;
      next["clasificacion_label"] = cfg.label;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {ATALAH_PENDIENTE_CLINICA && (
        <BannerValidacion texto="Curva de Atalah pendiente de validación por nutricionista (bandas P10/P90 no verificadas contra Atalah et al. 1997). Estándar para población chilena." />
      )}

      <NumberField label="Peso pregestacional (kg)" value={pesoPregestacional} min={30} max={250} step={0.1}
        onChange={(v) => { if (!readOnly) { valor["peso_pregestacional"] = v ?? ""; actualizar(valor["estado"] as string | undefined); } }} readOnly={readOnly} />
      <NumberField label="Peso actual (kg)" value={pesoActual} min={30} max={250} step={0.1}
        onChange={(v) => { if (!readOnly) { valor["peso_actual"] = v ?? ""; actualizar(valor["estado"] as string | undefined); } }} readOnly={readOnly} />
      <NumberField label="Talla (cm)" value={talla} min={120} max={220} step={0.1}
        onChange={(v) => { if (!readOnly) { valor["talla"] = v ?? ""; actualizar(valor["estado"] as string | undefined); } }} readOnly={readOnly} />
      <NumberField label="Semana gestacional (10–41)" value={semana} min={10} max={41}
        onChange={(v) => { if (!readOnly) { valor["semana"] = v ?? ""; actualizar(valor["estado"] as string | undefined); } }} readOnly={readOnly} />

      {(imcPregestacional !== null || imcActual !== null) && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          IMC pregestacional: {imcPregestacional ?? "—"} · IMC actual: {imcActual ?? "—"}
          {banda ? ` · Banda Atalah (P10–P90): ${banda.inferior.toFixed(1)}–${banda.superior.toFixed(1)}` : ""}
        </p>
      )}

      {resultado && !readOnly && (
        <button
          type="button"
          onClick={() => actualizar(resultado.estado)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--color-kp-accent)", color: "#fff" }}
        >
          Registrar clasificación: {ESTADO_CODIGO[resultado.estado].label}
        </button>
      )}

      {readOnly && resultado && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {resultado.descripcion}
          </span>
          <ClasificacionChip colorClass={ESTADO_CODIGO[resultado.estado].color} texto={ESTADO_CODIGO[resultado.estado].label} />
        </TotalRow>
      )}

      {!readOnly && (valor["clasificacion_label"] as string) && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Clasificada: {valor["clasificacion_label"]}
          </span>
        </TotalRow>
      )}

      {resultado && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Ganancia total recomendada: {resultado.rangoGananciaTotal.min}–{resultado.rangoGananciaTotal.max} kg
        </p>
      )}
    </div>
  );
}
