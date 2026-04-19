"use client";

/**
 * Context para propagar config de clínica + rol del usuario a todos los
 * Client Components descendientes del dashboard layout.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ClinicaConfig } from "./config";
import type { Rol } from "./registry";

export interface ClinicaSession {
  config: ClinicaConfig;
  rol: Rol;
  userId: string;
}

const ClinicaSessionContext = createContext<ClinicaSession | null>(null);

interface ProviderProps {
  session: ClinicaSession;
  children: ReactNode;
}

export function ClinicaSessionProvider({ session, children }: ProviderProps) {
  return (
    <ClinicaSessionContext.Provider value={session}>{children}</ClinicaSessionContext.Provider>
  );
}

export function useClinicaSession(): ClinicaSession {
  const ctx = useContext(ClinicaSessionContext);
  if (!ctx) {
    throw new Error(
      "useClinicaSession debe usarse dentro de <ClinicaSessionProvider> en el dashboard layout."
    );
  }
  return ctx;
}

export function useClinicaConfig(): ClinicaConfig {
  return useClinicaSession().config;
}

export function useRol(): Rol {
  return useClinicaSession().rol;
}

/** Variante opcional para componentes que pueden usarse fuera del dashboard. */
export function useClinicaSessionOptional(): ClinicaSession | null {
  return useContext(ClinicaSessionContext);
}
