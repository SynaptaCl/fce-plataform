import type { ComponentType } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";

type CustomComponent = ComponentType<InstrumentoCustomProps>;
type ComponentLoader = () => Promise<{ default: CustomComponent }>;

const CUSTOM_REGISTRY: Record<string, ComponentLoader> = {
  // Claves = columna componente_id en instrumentos_valoracion (PascalCase, sembrado en migraciones)
  GlasgowComaScale: () =>
    import("@/components/clinico/instrumentos-custom/GlasgowComaScale"),
  ApgarScore: () =>
    import("@/components/clinico/instrumentos-custom/ApgarScore"),
  AtalahChart: () =>
    import("@/components/clinico/instrumentos-custom/AtalahChart"),
  AlarconPinaresChart: () =>
    import("@/components/clinico/instrumentos-custom/AlarconPinaresChart"),
  EEDPAssessment: () =>
    import("@/components/clinico/instrumentos-custom/EEDPAssessment"),
  GraffarScore: () =>
    import("@/components/clinico/instrumentos-custom/GraffarScore"),
  OlearyIndex: () =>
    import("@/components/clinico/instrumentos-custom/OlearyIndex"),
  CpodIndex: () =>
    import("@/components/clinico/instrumentos-custom/CpodIndex"),
  IndiceGingival: () =>
    import("@/components/clinico/instrumentos-custom/IndiceGingival"),
};

export function getCustomComponentLoader(componente_id: string): ComponentLoader | null {
  return CUSTOM_REGISTRY[componente_id] ?? null;
}
