"use client";

import { useState, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import type { BrandingConfig } from "@/lib/modules/registry";
import { createClient } from "@/lib/supabase/client";
const ROLES_CON_CONFIG = ["admin", "director", "superadmin"];
const STORAGE_KEY = "fce-sidebar-expanded";
const W_EXPANDED = 240;
const W_COLLAPSED = 58;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClinicInitials(branding: BrandingConfig | null, fallback: string): string {
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
  return fallback.slice(0, 2).toUpperCase() || "FC";
}

function getClinicDisplayName(branding: BrandingConfig | null, fullName: string): string {
  return branding?.clinic_short_name ?? fullName;
}

// ── NavItem ────────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  expanded: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, active, expanded, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      title={!expanded ? label : undefined}
      className="fce-sb-nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 38,
        paddingLeft: expanded ? 10 : 0,
        paddingRight: expanded ? 10 : 0,
        width: expanded ? "100%" : 38,
        justifyContent: expanded ? "flex-start" : "center",
        color: active
          ? "var(--color-kp-accent, #00B0A8)"
          : "rgba(255,255,255,0.5)",
        background: active ? "rgba(0,176,168,0.13)" : "transparent",
        boxShadow: active ? "inset 3px 0 0 var(--color-kp-accent, #00B0A8)" : "none",
        textDecoration: "none",
        flexShrink: 0,
        overflow: "hidden",
        whiteSpace: "nowrap",
        borderRadius: active && expanded ? "0 8px 8px 0" : "8px",
        position: "relative",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      {expanded && (
        <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.01em", flex: 1 }}>
          {label}
        </span>
      )}
      {expanded && badge !== undefined && badge > 0 && (
        <span
          style={{
            background: "var(--color-kp-danger, #ef4444)",
            color: "#fff",
            borderRadius: 100,
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 6px",
            minWidth: 18,
            textAlign: "center",
            flexShrink: 0,
            lineHeight: 1.6,
          }}
        >
          {badge}
        </span>
      )}
      {!expanded && badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--color-kp-danger, #ef4444)",
          }}
        />
      )}
    </Link>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  practitionerName: string;
  practitionerInitials: string;
  especialidad: string | null;
  rol: string;
  branding: BrandingConfig | null;
  clinicFullName: string;
}

export function Sidebar({
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
  clinicFullName,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [{ expanded, mounted }, setSidebarState] = useState({ expanded: false, mounted: false });

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarState({
      expanded: localStorage.getItem(STORAGE_KEY) === "true",
      mounted: true,
    });
  }, []);

  function toggle() {
    setSidebarState((prev) => {
      const next = !prev.expanded;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { expanded: next, mounted: prev.mounted };
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const activeSection = (() => {
    if (pathname.startsWith("/dashboard/configuracion")) return "config";
    if (pathname.startsWith("/dashboard/pacientes")) return "pacientes";
    return "agenda";
  })();

  const clinicInitials = getClinicInitials(branding, clinicFullName);
  const clinicDisplayName = getClinicDisplayName(branding, clinicFullName);
  const showSubtitle = expanded && clinicFullName && clinicDisplayName !== clinicFullName;
  const showConfig = ROLES_CON_CONFIG.includes(rol);
  const specialtyLabel = especialidad ?? "Profesional";

  const width = mounted ? (expanded ? W_EXPANDED : W_COLLAPSED) : W_COLLAPSED;

  return (
    <aside
      className="fce-sb-root"
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        display: "flex",
        flexDirection: "column",
        alignItems: expanded ? "stretch" : "center",
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: expanded ? 10 : 0,
        paddingRight: expanded ? 10 : 0,
        zIndex: 20,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1), max-width 0.22s cubic-bezier(0.4,0,0.2,1), padding 0.22s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
      }}
    >
      <style>{`
        .fce-sb-root {
          background: linear-gradient(
            170deg,
            var(--color-kp-primary-deep, #004545) 0%,
            color-mix(in srgb, var(--color-kp-primary-deep, #004545) 78%, #000 22%) 100%
          );
        }
        .fce-sb-nav {
          transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
        }
        .fce-sb-nav:hover {
          background: rgba(255,255,255,0.07) !important;
          color: rgba(255,255,255,0.85) !important;
        }
        .fce-sb-btn {
          transition: background 0.14s ease, color 0.14s ease;
        }
        .fce-sb-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          color: rgba(255,255,255,0.9) !important;
        }
        .fce-sb-logout {
          transition: background 0.14s ease, color 0.14s ease;
        }
        .fce-sb-logout:hover {
          background: rgba(239,68,68,0.1) !important;
          color: rgba(252,165,165,1) !important;
        }
      `}</style>

      {/* ── Clinic identity + toggle ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "space-between" : "center",
          gap: 8,
          flexShrink: 0,
          overflow: "hidden",
          marginBottom: expanded && showSubtitle ? 2 : 0,
        }}
      >
        {/* Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 0 }}>
          {/* Logo container */}
          <div
            title={!expanded ? clinicDisplayName : undefined}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={clinicDisplayName}
                width={24}
                height={24}
                style={{ objectFit: "contain", borderRadius: 5 }}
              />
            ) : (
              clinicInitials
            )}
          </div>

          {/* Clinic name */}
          {expanded && (
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}
              >
                {clinicDisplayName}
              </div>
              {showSubtitle && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.38)",
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 1,
                    lineHeight: 1.2,
                  }}
                >
                  {clinicFullName}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapse toggle (expanded state) */}
        {expanded && (
          <button
            onClick={toggle}
            title="Contraer menú"
            className="fce-sb-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "rgba(255,255,255,0.35)",
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* Expand toggle (collapsed state) */}
      {!expanded && (
        <button
          onClick={toggle}
          title="Expandir menú"
          className="fce-sb-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 7,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "rgba(255,255,255,0.3)",
            flexShrink: 0,
            marginTop: 6,
          }}
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* ── Separator ── */}
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent)",
          marginTop: 16,
          marginBottom: 14,
          flexShrink: 0,
          alignSelf: "stretch",
        }}
      />

      {/* ── Nav ── */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: expanded ? "stretch" : "center",
          gap: 2,
        }}
      >
        <NavItem
          href="/dashboard"
          icon={<Calendar size={18} />}
          label="Agenda"
          active={activeSection === "agenda"}
          expanded={expanded}
        />
        <NavItem
          href="/dashboard/pacientes"
          icon={<Users size={18} />}
          label="Pacientes"
          active={activeSection === "pacientes"}
          expanded={expanded}
        />
        {showConfig && (
          <>
            <NavItem
              href="/dashboard/configuracion"
              icon={<Settings size={18} />}
              label="Configuración"
              active={activeSection === "config"}
              expanded={expanded}
            />
          </>
        )}
      </nav>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── User section ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: expanded ? "stretch" : "center",
          flexShrink: 0,
        }}
      >
        {/* Top separator */}
        <div
          style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent)",
            marginBottom: 6,
            alignSelf: "stretch",
          }}
        />

        {/* Professional info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingLeft: expanded ? 4 : 0,
            paddingRight: expanded ? 4 : 0,
            overflow: "hidden",
          }}
        >
          {/* Avatar */}
          <div
            title={!expanded ? `${practitionerName} · ${specialtyLabel}` : undefined}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--color-kp-primary, #006B6B), var(--color-kp-accent, #00B0A8))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.03em",
              userSelect: "none",
              flexShrink: 0,
              boxShadow: "0 0 0 2px rgba(255,255,255,0.12)",
            }}
          >
            {practitionerInitials}
          </div>

          {/* Name + specialty */}
          {expanded && (
            <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}
              >
                {practitionerName}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.3,
                  marginTop: 1,
                }}
              >
                {specialtyLabel}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={!expanded ? "Cerrar sesión" : undefined}
          className="fce-sb-logout"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            paddingLeft: expanded ? 10 : 0,
            paddingRight: expanded ? 10 : 0,
            width: expanded ? "100%" : 38,
            justifyContent: expanded ? "flex-start" : "center",
            color: "rgba(255,255,255,0.38)",
            flexShrink: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {expanded && (
            <span style={{ fontSize: 13 }}>Cerrar sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
}
