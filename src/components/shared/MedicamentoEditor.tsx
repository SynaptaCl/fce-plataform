"use client";

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

interface Props {
  medicamento: MedicamentoPrescrito;
  onChange: (updated: MedicamentoPrescrito) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-2)" }}>{label}</label>
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
          style={{ borderColor: "var(--kp-border)", color: "var(--ink-3)" }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function MedicamentoEditor({ medicamento, onChange }: Props) {
  function update(field: keyof MedicamentoPrescrito, value: string | null) {
    onChange({ ...medicamento, [field]: value });
  }

  const inputCls = "w-full text-sm px-3 py-1.5 rounded-lg border";
  const inputStyle = { borderColor: "var(--kp-border)", color: "var(--ink-1)" };

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

      <Field label="Cantidad total *">
        <input
          className={inputCls}
          style={inputStyle}
          value={medicamento.cantidad_total}
          onChange={(e) => update("cantidad_total", e.target.value)}
          placeholder="Ej: 15 comprimidos"
        />
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
