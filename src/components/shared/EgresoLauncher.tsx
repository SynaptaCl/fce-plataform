"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useClinicaConfig } from "@/lib/modules/provider";

// ── Props ────────────────────────────────────────────────────────────────────

interface EgresoLauncherProps {
  patientId: string;
  estadoClinico: string;
  rol: string;
}

// ── Roles permitidos ─────────────────────────────────────────────────────────

const ROLES_PERMITIDOS = new Set(["profesional", "admin", "director", "superadmin"]);

// ── Componente ───────────────────────────────────────────────────────────────

export function EgresoLauncher({ patientId, estadoClinico, rol }: EgresoLauncherProps) {
  const router = useRouter();
  const config = useClinicaConfig();

  // Solo se muestra para pacientes activos con rol habilitado
  if (estadoClinico !== "activo") return null;
  if (!ROLES_PERMITIDOS.has(rol)) return null;

  // Verificar módulo activo
  if (!config.modulosActivos.includes("M9_egresos")) return null;

  function handleEgresar() {
    router.push(`/dashboard/pacientes/${patientId}/egreso`);
  }

  return (
    <button
      onClick={handleEgresar}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: "var(--kp-danger)",
        color: "#fff",
      }}
    >
      <LogOut className="w-4 h-4" />
      Egresar paciente
    </button>
  );
}
