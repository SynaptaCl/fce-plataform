"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, Settings } from "lucide-react";
import type { BrandingConfig } from "@/lib/modules/registry";

/** Roles que tienen acceso a configuración */
const ROLES_CON_CONFIG = ["admin", "director", "superadmin"];

interface NavIconButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavIconButton({ href, icon, label, active }: NavIconButtonProps) {
  return (
    <Link
      href={href}
      title={label}
      className={active ? undefined : "hover:bg-white/[0.06]"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 8,
        color: active ? "var(--color-kp-accent, #00B0A8)" : "var(--color-ink-3, #64748B)",
        backgroundColor: active ? "rgba(0, 176, 168, 0.15)" : undefined,
        transition: "background-color 0.15s, color 0.15s",
        textDecoration: "none",
        position: "relative",
      }}
    >
      {icon}
    </Link>
  );
}

interface SidebarProps {
  practitionerName: string;
  practitionerInitials: string;
  especialidad: string | null;
  rol: string;
  branding: BrandingConfig | null;
}

function getClinicInitials(branding: BrandingConfig | null): string {
  if (branding?.clinic_initials) return branding.clinic_initials;
  if (branding?.clinic_short_name) {
    return branding.clinic_short_name
      .split(" ")
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return "FC";
}

function getClinicName(branding: BrandingConfig | null): string {
  return branding?.clinic_short_name ?? "FCE";
}

export function Sidebar({
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
}: SidebarProps) {
  const pathname = usePathname();

  const activeSection = (() => {
    if (pathname.startsWith("/dashboard/configuracion")) return "config";
    if (pathname.startsWith("/dashboard/pacientes")) return "pacientes";
    return "agenda";
  })();

  const clinicInitials = getClinicInitials(branding);
  const clinicName = getClinicName(branding);
  const showConfig = ROLES_CON_CONFIG.includes(rol);
  const specialtyLabel = especialidad ?? "Profesional";

  return (
    <aside
      style={{
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        background: "var(--color-kp-primary-deep, #004545)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 12,
        zIndex: 20,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Clinic logo / initials */}
      <div
        title={clinicName}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          flexShrink: 0,
          cursor: "default",
          userSelect: "none",
        }}
      >
        {branding?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logo_url}
            alt={clinicName}
            width={24}
            height={24}
            style={{ objectFit: "contain", borderRadius: 4 }}
          />
        ) : (
          clinicInitials
        )}
      </div>

      {/* Separator */}
      <div
        style={{
          width: 32,
          height: 1,
          background: "rgba(255,255,255,0.12)",
          marginTop: 16,
          marginBottom: 16,
          flexShrink: 0,
        }}
      />

      {/* Nav icons */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <NavIconButton
          href="/dashboard"
          icon={<Calendar size={20} />}
          label="Agenda"
          active={activeSection === "agenda"}
        />
        <NavIconButton
          href="/dashboard/pacientes"
          icon={<Users size={20} />}
          label="Pacientes"
          active={activeSection === "pacientes"}
        />
        {showConfig && (
          <NavIconButton
            href="/dashboard/configuracion"
            icon={<Settings size={20} />}
            label="Configuración"
            active={activeSection === "config"}
          />
        )}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Professional avatar */}
      <div
        title={`${practitionerName}${specialtyLabel !== "Profesional" ? ` · ${specialtyLabel}` : ""}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--color-kp-primary, #006B6B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 11,
          fontWeight: 700,
          cursor: "default",
          userSelect: "none",
          flexShrink: 0,
          border: "2px solid rgba(255,255,255,0.15)",
        }}
      >
        {practitionerInitials}
      </div>
    </aside>
  );
}
