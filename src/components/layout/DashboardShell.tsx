"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { BrandingConfig } from "@/lib/modules/registry";

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
}

/**
 * Derives the breadcrumb ReactNode from the current pathname.
 */
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
          <span style={{ color: "var(--color-ink-3, #94A3B8)", fontWeight: 400 }}>Pacientes</span>
          <span style={{ color: "var(--color-ink-3, #94A3B8)" }}>›</span>
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
}: DashboardShellProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname, patientName);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-surface-0, #F1F5F9)",
      }}
    >
      <Sidebar
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
        <TopBar breadcrumb={breadcrumb} />
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
