"use client";

/**
 * Context para propagar la config de clínica a todos los Client Components
 * descendientes del dashboard layout.
 *
 * Server Components pueden leer la config vía getClinicaConfigFromSession().
 * Client Components la leen vía useClinicaConfig().
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ClinicaConfig } from "./config";

const ClinicaConfigContext = createContext<ClinicaConfig | null>(null);

interface ProviderProps {
  config: ClinicaConfig;
  children: ReactNode;
}

export function ClinicaConfigProvider({ config, children }: ProviderProps) {
  return (
    <ClinicaConfigContext.Provider value={config}>{children}</ClinicaConfigContext.Provider>
  );
}

export function useClinicaConfig(): ClinicaConfig {
  const ctx = useContext(ClinicaConfigContext);
  if (!ctx) {
    throw new Error(
      "useClinicaConfig debe usarse dentro de <ClinicaConfigProvider>. ¿Estás en un Client Component fuera del dashboard layout?"
    );
  }
  return ctx;
}

/**
 * Variante opcional que no lanza si no hay provider (útil para componentes
 * usados tanto dentro como fuera del dashboard).
 */
export function useClinicaConfigOptional(): ClinicaConfig | null {
  return useContext(ClinicaConfigContext);
}
