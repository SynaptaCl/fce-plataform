"use client";

import { useLayoutEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarMode } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ProfesionalSelector } from "./ProfesionalSelector";
import { SessionIdleTimeout } from "./SessionIdleTimeout";
import type { BrandingConfig } from "@/lib/modules/registry";
import type { ProfesionalPerfil } from "@/lib/fce/profesional";

interface DashboardShellProps {
  children: React.ReactNode;
  practitionerName: string;
  practitionerInitials: string;
  especialidad: string | null;
  rol: string;
  branding: BrandingConfig | null;
  clinicFullName: string;
  /** Optional patient name forwarded from patient-detail routes */
  patientName?: string;
  /** All professional profiles for the logged-in user */
  perfilesProfesional?: ProfesionalPerfil[];
  /** ID of the currently active professional profile */
  perfilActivoId?: string;
}

/**
 * Derives the breadcrumb ReactNode from the current pathname.
 */
const SIDEBAR_KEY = "fce-sidebar-mode";

function getBreadcrumb(pathname: string, patientName?: string): React.ReactNode {
  if (pathname.startsWith("/dashboard/configuracion")) {
    return "Configuración";
  }
  if (pathname.startsWith("/dashboard/pacientes")) {
    const afterPacientes = pathname.slice("/dashboard/pacientes".length);
    // /dashboard/pacientes/[id] or deeper
    if (afterPacientes.length > 1) {
      return (
        <>
          <span style={{ color: "var(--color-ink-3, #64748B)", fontWeight: 400 }}>Pacientes</span>
          <span style={{ color: "var(--color-ink-3, #64748B)" }}>›</span>
          <span>{patientName ?? "Detalle"}</span>
        </>
      );
    }
    return "Pacientes";
  }
  return "Agenda Diaria";
}

export function DashboardShell({
  children,
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
  clinicFullName,
  patientName,
  perfilesProfesional,
  perfilActivoId,
}: DashboardShellProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname, patientName);
  const [mode, setMode] = useState<SidebarMode>("rail");

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored === "expanded" || stored === "rail" || stored === "hidden") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(stored);
      } else if (localStorage.getItem("fce-sidebar-expanded") === "true") {
        setMode("expanded");
      }
    } catch {}
  }, []);

  function changeMode(next: SidebarMode) {
    setMode(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {}
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-surface-0, #F1F5F9)",
      }}
    >
      <SessionIdleTimeout />
      <Sidebar
        mode={mode}
        onModeChange={changeMode}
        practitionerName={practitionerName}
        practitionerInitials={practitionerInitials}
        especialidad={especialidad}
        rol={rol}
        branding={branding}
        clinicFullName={clinicFullName}
      />

      {/* Content column: TopBar + scrollable main */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <TopBar
          breadcrumb={breadcrumb}
          leading={
            mode === "hidden" ? (
              <button
                type="button"
                onClick={() => changeMode("rail")}
                title="Mostrar menú"
                aria-label="Mostrar menú"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--color-kp-border, #E2E8F0)",
                  background: "var(--color-surface-1, #FFFFFF)",
                  color: "var(--color-ink-2, #475569)",
                  cursor: "pointer",
                }}
              >
                <PanelLeftOpen size={16} />
              </button>
            ) : undefined
          }
        >
          {perfilesProfesional &&
            perfilesProfesional.length > 0 &&
            perfilActivoId && (
              <ProfesionalSelector
                perfiles={perfilesProfesional}
                perfilActivoId={perfilActivoId}
              />
            )}
        </TopBar>
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
