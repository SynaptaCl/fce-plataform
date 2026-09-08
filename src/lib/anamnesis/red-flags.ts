import type { RedFlags } from "@/types/anamnesis";

/**
 * Fuente única de verdad de red flags de anamnesis: label, descripción y si son
 * "críticas" (bloquean atención en especialidades con tieneContraindicaciones=true,
 * regla 9 CLAUDE.md). Consumido por RedFlagsChecklist (UI) y por los server actions
 * de firma (hard-stop real, no solo cosmético) — nunca duplicar esta lista.
 */
export interface RedFlagMeta {
  key: keyof RedFlags;
  label: string;
  description: string;
  critical: boolean;
}

export const RED_FLAG_DEFS: RedFlagMeta[] = [
  { key: "marcapasos", label: "Marcapasos / DAI", description: "Dispositivo cardíaco implantado", critical: true },
  { key: "embarazo", label: "Embarazo", description: "Embarazo activo o posible", critical: false },
  { key: "tvp", label: "TVP / Tromboembolia", description: "Trombosis venosa profunda activa", critical: true },
  { key: "oncologico", label: "Oncológico activo", description: "Tratamiento activo de cáncer", critical: true },
  { key: "fiebre", label: "Fiebre aguda", description: "Temperatura >37.5°C en este momento", critical: true },
  { key: "alergias_severas", label: "Alergias severas", description: "Anafilaxia conocida o alergias graves", critical: false },
  { key: "infeccion_cutanea", label: "Infección cutánea", description: "Infección o lesión activa en piel", critical: true },
  { key: "fragilidad_capilar", label: "Fragilidad capilar", description: "Historial de hematomas espontáneos", critical: false },
];

/** Red flags críticas activas para un paciente (bloquean firma en especialidades con hard-stop). */
export function getContraindicacionesActivas(
  redFlags: RedFlags | null | undefined,
): RedFlagMeta[] {
  if (!redFlags) return [];
  return RED_FLAG_DEFS.filter((f) => f.critical && redFlags[f.key]);
}
