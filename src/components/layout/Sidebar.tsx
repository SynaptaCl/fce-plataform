"use client";

import { useState, useEffect } from "react";
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
const W_EXPANDED = 220;
const W_COLLAPSED = 56;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  expanded: boolean;
}

function NavItem({ href, icon, label, active, expanded }: NavItemProps) {
  return (
    <Link
      href={href}
      title={!expanded ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 40,
        borderRadius: 8,
        paddingLeft: expanded ? 12 : 0,
        paddingRight: expanded ? 12 : 0,
        width: expanded ? "100%" : 40,
        justifyContent: expanded ? "flex-start" : "center",
        color: active ? "var(--color-kp-accent, #00B0A8)" : "var(--color-ink-3, #94A3B8)",
        backgroundColor: active ? "rgba(0, 176, 168, 0.15)" : undefined,
        transition: "background-color 0.15s, color 0.15s",
        textDecoration: "none",
        flexShrink: 0,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
      className={active ? undefined : "hover:bg-white/[0.06]"}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      {expanded && (
        <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
      )}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  practitionerName: string;
  practitionerInitials: string;
  especialidad: string | null;
  rol: string;
  branding: BrandingConfig | null;
}

export function Sidebar({
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    setMounted(true);
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
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

  const clinicInitials = getClinicInitials(branding);
  const clinicName = getClinicName(branding);
  const showConfig = ROLES_CON_CONFIG.includes(rol);
  const specialtyLabel = especialidad ?? "Profesional";

  // Avoid layout shift before localStorage is read
  const width = mounted ? (expanded ? W_EXPANDED : W_COLLAPSED) : W_COLLAPSED;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        background: "var(--color-kp-primary-deep, #004545)",
        display: "flex",
        flexDirection: "column",
        alignItems: expanded ? "stretch" : "center",
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: expanded ? 8 : 0,
        paddingRight: expanded ? 8 : 0,
        zIndex: 20,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease, padding 0.2s ease",
        flexShrink: 0,
      }}
    >
      {/* ── Clinic identity + toggle ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: expanded ? 4 : 0,
          paddingRight: expanded ? 4 : 0,
          justifyContent: expanded ? "space-between" : "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Logo / initials */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 0 }}
        >
          <div
            title={!expanded ? clinicName : undefined}
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
          {expanded && (
            <span
              style={{
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {clinicName}
            </span>
          )}
        </div>

        {/* Toggle button — right side when expanded, centered row when collapsed */}
        {expanded && (
          <button
            onClick={toggle}
            title="Contraer menú"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "rgba(255,255,255,0.4)",
              flexShrink: 0,
              transition: "background-color 0.15s, color 0.15s",
            }}
            className="hover:bg-white/[0.08] hover:!text-white"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Toggle button — only visible when collapsed, centered below logo */}
      {!expanded && (
        <button
          onClick={toggle}
          title="Expandir menú"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "rgba(255,255,255,0.35)",
            flexShrink: 0,
            marginTop: 6,
            transition: "background-color 0.15s, color 0.15s",
          }}
          className="hover:bg-white/[0.08] hover:!text-white"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── Separator ── */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.12)",
          marginTop: 16,
          marginBottom: 16,
          flexShrink: 0,
          width: expanded ? "100%" : 32,
          alignSelf: "center",
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
          icon={<Calendar size={20} />}
          label="Agenda"
          active={activeSection === "agenda"}
          expanded={expanded}
        />
        <NavItem
          href="/dashboard/pacientes"
          icon={<Users size={20} />}
          label="Pacientes"
          active={activeSection === "pacientes"}
          expanded={expanded}
        />
        {showConfig && (
          <NavItem
            href="/dashboard/configuracion"
            icon={<Settings size={20} />}
            label="Configuración"
            active={activeSection === "config"}
            expanded={expanded}
          />
        )}
      </nav>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── User section ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: expanded ? "stretch" : "center",
          flexShrink: 0,
        }}
      >
        {/* Professional info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingLeft: expanded ? 4 : 0,
            overflow: "hidden",
          }}
        >
          <div
            title={!expanded ? `${practitionerName} · ${specialtyLabel}` : undefined}
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
          {expanded && (
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div
                style={{
                  color: "white",
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {practitionerName}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            paddingLeft: expanded ? 12 : 0,
            paddingRight: expanded ? 12 : 0,
            width: expanded ? "100%" : 40,
            justifyContent: expanded ? "flex-start" : "center",
            color: "rgba(255,255,255,0.45)",
            transition: "background-color 0.15s, color 0.15s",
            flexShrink: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          className="hover:bg-white/[0.06] hover:!text-white"
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {expanded && (
            <span style={{ fontSize: 13 }}>Cerrar sesión</span>
          )}
        </button>

      </div>
    </aside>
  );
}
