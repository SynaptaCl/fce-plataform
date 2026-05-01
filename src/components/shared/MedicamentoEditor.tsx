"use client";

import { useEffect, useRef } from "react";
import type { MedicamentoPrescrito, ViaAdministracion } from "@/types/prescripcion";

const VIAS: { value: ViaAdministracion; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "topica", label: "Tópica" },
  { value: "intramuscular", label: "Intramuscular" },
  { value: "endovenosa", label: "Endovenosa" },
  { value: "subcutanea", label: "Subcutánea" },
  { value: "rectal", label: "Rectal" },
  { value: "oftalmica", label: "Oftálmica" },
  { value: "otica", label: "Ótica" },
  { value: "nasal", label: "Nasal" },
  { value: "vaginal", label: "Vaginal" },
  { value: "inhalatoria", label: "Inhalatoria" },
  { value: "sublingual", label: "Sublingual" },
  { value: "transdermica", label: "Transdérmica" },
  { value: "otra", label: "Otra" },
];

const FRECUENCIAS_RAPIDAS = ["cada 8 horas", "cada 12 horas", "1 vez al día", "antes de dormir"];
const DURACIONES_RAPIDAS = ["3 días", "5 días", "7 días", "10 días", "tratamiento permanente"];

function calcularCantidad(frecuencia: string, duracion: string): string | null {
  if (!frecuencia || !duracion) return null;
  if (/permanente|indefinido/i.test(duracion)) return null;

  const diasMatch = duracion.match(/(\d+)\s*d[íi]a/i);
  if (!diasMatch) return null;
  const dias = parseInt(diasMatch[1]);

  let tomasPorDia: number | null = null;
  if (/cada\s+4\s+h/i.test(frecuencia)) tomasPorDia = 6;
  else if (/cada\s+6\s+h/i.test(frecuencia)) tomasPorDia = 4;
  else if (/cada\s+8\s+h/i.test(frecuencia)) tomasPorDia = 3;
  else if (/cada\s+12\s+h/i.test(frecuencia)) tomasPorDia = 2;
  else if (/1\s*vez\s+al\s+d[íi]a|una\s+vez/i.test(frecuencia)) tomasPorDia = 1;
  else if (/2\s*veces\s+al\s+d[íi]a/i.test(frecuencia)) tomasPorDia = 2;
  else if (/3\s*veces\s+al\s+d[íi]a/i.test(frecuencia)) tomasPorDia = 3;
  else if (/antes\s+de\s+dormir|nocturno/i.test(frecuencia)) tomasPorDia = 1;

  if (!tomasPorDia) return null;
  return `${dias * tomasPorDia} unidades`;
}

interface Props {
  medicamento: MedicamentoPrescrito;
  onChange: (updated: MedicamentoPrescrito) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function QuickPills({ options, onSelect }: { options: string[]; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(o)}
          className="text-xs px-2 py-0.5 rounded-full border"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-3)" }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function MedicamentoEditor({ medicamento, onChange }: Props) {
  const autoFilled = useRef(false);

  useEffect(() => {
    if (!autoFilled.current && medicamento.cantidad_total) return;
    const calculado = calcularCantidad(medicamento.frecuencia, medicamento.duracion);
    if (calculado) {
      autoFilled.current = true;
      onChange({ ...medicamento, cantidad_total: calculado });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicamento.frecuencia, medicamento.duracion]);

  function update(field: keyof MedicamentoPrescrito, value: string | null) {
    if (field === "cantidad_total") autoFilled.current = false;
    onChange({ ...medicamento, [field]: value });
  }

  // Derivar si el valor actual fue auto-calculado: coincide con lo que calcularCantidad devuelve
  const expectedCalc = calcularCantidad(medicamento.frecuencia, medicamento.duracion);
  const autoCalculado = expectedCalc !== null && medicamento.cantidad_total === expectedCalc;

  const inputCls = "w-full text-sm px-3 py-1.5 rounded-lg border";
  const inputStyle = { borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Dosis *">
        <input
          className={inputCls}
          style={inputStyle}
          value={medicamento.dosis}
          onChange={(e) => update("dosis", e.target.value)}
          placeholder="Ej: 1 comprimido"
        />
      </Field>

      <Field label="Vía *">
        <select
          className={inputCls}
          style={inputStyle}
          value={medicamento.via}
          onChange={(e) => update("via", e.target.value as ViaAdministracion)}
        >
          {VIAS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Frecuencia *">
        <input
          className={inputCls}
          style={inputStyle}
          value={medicamento.frecuencia}
          onChange={(e) => update("frecuencia", e.target.value)}
          placeholder="Ej: cada 8 horas"
        />
        <QuickPills options={FRECUENCIAS_RAPIDAS} onSelect={(v) => update("frecuencia", v)} />
      </Field>

      <Field label="Duración *">
        <input
          className={inputCls}
          style={inputStyle}
          value={medicamento.duracion}
          onChange={(e) => update("duracion", e.target.value)}
          placeholder="Ej: 5 días"
        />
        <QuickPills options={DURACIONES_RAPIDAS} onSelect={(v) => update("duracion", v)} />
      </Field>

      <Field label="Cantidad total">
        <input
          className={inputCls}
          style={{
            ...inputStyle,
            background: autoCalculado ? "var(--color-surface-0, #f8fafc)" : "#ffffff",
          }}
          value={medicamento.cantidad_total}
          onChange={(e) => update("cantidad_total", e.target.value)}
          placeholder="Se calcula automáticamente"
        />
        {autoCalculado && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
            Calculado — puede editarlo si la presentación es diferente
          </p>
        )}
      </Field>

      <Field label="Instrucciones">
        <input
          className={inputCls}
          style={inputStyle}
          value={medicamento.instrucciones ?? ""}
          onChange={(e) => update("instrucciones", e.target.value || null)}
          placeholder="Ej: Tomar con comida"
        />
      </Field>
    </div>
  );
}
