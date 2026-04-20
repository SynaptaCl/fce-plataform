"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calendar,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useClinicaConfig, useRol } from "@/lib/modules/provider";
import { ROLES_QUE_CONFIGURAN, ESPECIALIDADES_REGISTRY } from "@/lib/modules/registry";
import type { EspecialidadCodigo } from "@/lib/modules/registry";

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, text, active = false, collapsed = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? text : undefined}
      className={cn(
        "flex items-center w-full px-4 py-3 transition-colors cursor-pointer",
        active
          ? "bg-kp-accent/10 text-kp-accent border-l-4 border-kp-accent"
          : "text-ink-3 hover:bg-white/5 hover:text-white border-l-4 border-transparent",
        collapsed && "justify-center px-0"
      )}
    >
      <span className={cn("w-5 h-5 shrink-0", !collapsed && "mr-3")}>{icon}</span>
      {!collapsed && <span className="text-sm font-medium">{text}</span>}
    </button>
  );
}

interface SidebarProps {
  practitionerName: string;
  practitionerInitials: string;
  especialidad: string | null;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  practitionerName,
  practitionerInitials,
  especialidad,
  activeSection,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = useClinicaConfig();
  const rol = useRol();

  const clinicName = config.nombreDisplay;
  const logoUrl    = config.logoUrl;
  const clinicInitials = config.clinicInitials;
  const puedeConfigurar = ROLES_QUE_CONFIGURAN.includes(rol);

  const roleLabel =
    rol === "profesional"
      ? (especialidad
          ? (ESPECIALIDADES_REGISTRY[especialidad as EspecialidadCodigo]?.label ?? especialidad)
          : "Profesional")
      : rol === "admin"
        ? "Administración Clínica"
        : rol === "director"
          ? "Director Clínico"
          : rol === "superadmin"
            ? "Super Admin"
            : "Administración";

  return (
    <aside
      className={cn(
        "bg-surface-dark text-ink-3 flex flex-col shadow-xl z-20 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 justify-between">
        <div className="flex items-center min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${clinicName} logo`}
              width={28}
              height={28}
              className="shrink-0 object-contain"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-kp-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
              {clinicInitials}
            </div>
          )}
          {!collapsed && (
            <span className="text-white font-bold tracking-wider ml-3 text-sm truncate">
              {clinicName}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-ink-3 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="text-[0.6rem] text-ink-3 font-semibold uppercase tracking-wider mb-2">
            Usuario Activo
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-kp-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {practitionerInitials}
            </div>
            <div className="ml-3 min-w-0">
              <div className="text-sm font-bold text-white truncate">{practitionerName}</div>
              <div className="text-xs text-kp-accent">{roleLabel}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3">
        <NavItem
          icon={<Calendar />}
          text="Agenda Diaria"
          active={activeSection === "agenda"}
          collapsed={collapsed}
          onClick={() => onNavigate("agenda")}
        />
        <NavItem
          icon={<User />}
          text="Pacientes"
          active={activeSection === "pacientes"}
          collapsed={collapsed}
          onClick={() => onNavigate("pacientes")}
        />
        {puedeConfigurar && (
          <NavItem
            icon={<Settings />}
            text="Configuración"
            active={activeSection === "config"}
            collapsed={collapsed}
            onClick={() => onNavigate("config")}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10">
        <NavItem
          icon={<LogOut />}
          text="Cerrar sesión"
          collapsed={collapsed}
          onClick={onLogout}
        />
        <div
          className={cn(
            "px-4 py-3 text-[0.6rem] text-ink-3 flex items-center",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success shrink-0" />
          {!collapsed && <span>TLS 1.3 Activo</span>}
        </div>
      </div>
    </aside>
  );
}
