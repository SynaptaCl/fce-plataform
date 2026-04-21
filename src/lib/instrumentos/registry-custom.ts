import type { ComponentType } from "react";
import type { InstrumentoCustomProps } from "@/types/instrumento";

type CustomComponent = ComponentType<InstrumentoCustomProps>;
type ComponentLoader = () => Promise<{ default: CustomComponent }>;

const CUSTOM_REGISTRY: Record<string, ComponentLoader> = {
  glasgow_coma_scale: () =>
    import("@/components/clinico/instrumentos-custom/GlasgowComaScale"),
  apgar_score: () =>
    import("@/components/clinico/instrumentos-custom/ApgarScore"),
};

export function getCustomComponentLoader(componente_id: string): ComponentLoader | null {
  return CUSTOM_REGISTRY[componente_id] ?? null;
}
