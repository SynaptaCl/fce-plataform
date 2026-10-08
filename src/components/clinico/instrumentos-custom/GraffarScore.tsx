'use client';

import { useMemo } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";
import { BannerValidacion, ClasificacionChip, OpcionRadios, TotalRow } from "./shared";

// Graffar Méndez Castellano modificado — 5 factores, cada uno 1 (mejor) a 5 (peor).
// Suma 5–25 → clase Graffar: I (5–7), II (8–12), III (13–17), IV (18–22), V (23–25).
// Riesgo alineado con interpretacion DB: 0=Bajo (I–II), 1=Moderado (III), 2=Alto (IV–V)
const FACTORES = [
  {
    clave: "profesion_jefe",
    label: "Profesión del jefe de familia",
    opciones: [
      { valor: 1, label: "Profesional / técnico" },
      { valor: 2, label: "Comerciante / agricultor propietario" },
      { valor: 3, label: "Empleado de oficina" },
      { valor: 4, label: "Obrero calificado" },
      { valor: 5, label: "Obrero no calificado" },
    ],
  },
  {
    clave: "instruccion_madre",
    label: "Nivel de instrucción de la madre",
    opciones: [
      { valor: 1, label: "Universitario" },
      { valor: 2, label: "Secundaria completa" },
      { valor: 3, label: "Secundaria incompleta" },
      { valor: 4, label: "Primaria completa" },
      { valor: 5, label: "Sin instrucción / primaria incompleta" },
    ],
  },
  {
    clave: "fuente_ingresos",
    label: "Principal fuente de ingresos",
    opciones: [
      { valor: 1, label: "Sueldos profesionales / técnicos" },
      { valor: 2, label: "Comercio / industria / agricultura" },
      { valor: 3, label: "Sueldo de empleados" },
      { valor: 4, label: "Salario obrero calificado" },
      { valor: 5, label: "Salario obrero no calificado / otro" },
    ],
  },
  {
    clave: "alojamiento",
    label: "Condiciones de alojamiento",
    opciones: [
      { valor: 1, label: "Excelente" },
      { valor: 2, label: "Buena" },
      { valor: 3, label: "Media" },
      { valor: 4, label: "Deficiente" },
      { valor: 5, label: "Muy deficiente" },
    ],
  },
  {
    clave: "hacinamiento",
    label: "Hacinamiento (personas por dormitorio)",
    opciones: [
      { valor: 1, label: "1 persona" },
      { valor: 2, label: "2 personas" },
      { valor: 3, label: "3 personas" },
      { valor: 4, label: "4 personas" },
      { valor: 5, label: "5 o más personas" },
    ],
  },
] as const;

function claseDeSuma(suma: number): { clase: string; riesgo: number; label: string } {
  if (suma <= 7) return { clase: "I", riesgo: 0, label: "Bajo riesgo" };
  if (suma <= 12) return { clase: "II", riesgo: 0, label: "Bajo riesgo" };
  if (suma <= 17) return { clase: "III", riesgo: 1, label: "Riesgo moderado" };
  if (suma <= 22) return { clase: "IV", riesgo: 2, label: "Alto riesgo — derivar a asistente social" };
  return { clase: "V", riesgo: 2, label: "Alto riesgo — derivar a asistente social" };
}

const CHIP_COLOR: Record<number, "green" | "yellow" | "red"> = { 0: "green", 1: "yellow", 2: "red" };

export default function GraffarScore({ valor, onChange, readOnly }: InstrumentoCustomProps) {
  const valores = useMemo(() => {
    const out: Record<string, number | undefined> = {};
    for (const factor of FACTORES) {
      out[factor.clave] = typeof valor[factor.clave] === "number" ? valor[factor.clave] as number : undefined;
    }
    return out;
  }, [valor]);

  const suma = useMemo(
    () => FACTORES.reduce((acc, f) => acc + (valores[f.clave] ?? 0), 0),
    [valores],
  );

  const completo = FACTORES.every((f) => valores[f.clave] !== undefined);
  const resultado = completo ? claseDeSuma(suma) : null;

  function actualizar(campo: string, v: number) {
    if (readOnly) return;
    const next: Record<string, number | string> = { ...valor, [campo]: v };
    const nuevaSuma = FACTORES.reduce((acc, f) => acc + ((f.clave === campo ? v : valores[f.clave]) ?? 0), 0);
    if (FACTORES.every((f) => (f.clave === campo ? v : valores[f.clave]) !== undefined)) {
      const res = claseDeSuma(nuevaSuma);
      next["suma"] = nuevaSuma;
      next["clase_graffar"] = res.clase;
      next["clasificacion"] = res.riesgo;
      next["clasificacion_label"] = res.label;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <BannerValidacion texto="Graffar Méndez Castellano modificado. Pendiente de validación clínica / trabajo social antes de uso en producción." />

      {FACTORES.map((factor) => (
        <div key={factor.clave}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink-1)" }}>
            {factor.label}
          </p>
          <OpcionRadios
            name={`graffar_${factor.clave}`}
            opciones={factor.opciones}
            valor={valores[factor.clave]}
            onChange={(v) => actualizar(factor.clave, v)}
            readOnly={readOnly}
          />
        </div>
      ))}

      {resultado && (
        <TotalRow>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Suma: {suma} · Graffar {resultado.clase}
          </span>
          <ClasificacionChip colorClass={CHIP_COLOR[resultado.riesgo] ?? "green"} texto={resultado.label} />
        </TotalRow>
      )}
    </div>
  );
}
