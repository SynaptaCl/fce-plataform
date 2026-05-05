"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  FileSignature,
  ShieldCheck,
  FileDown,
  Share2,
  FileEdit,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClinicaConfig } from "@/lib/modules/provider";
import { QuickNoteModal } from "@/components/clinico/QuickNoteModal";
import type { ModuleId } from "@/lib/modules/registry";

interface PatientActionNavProps {
  patientId: string;
  isAdmin: boolean;
  resumenIA?: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
  moduleId?: ModuleId;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function buildNav(patientId: string): NavGroup[] {
  const base = `/dashboard/pacientes/${patientId}`;
  return [
    {
      title: "Registro",
      items: [
        {
          id: "signos",
          label: "Signos Vitales",
          icon: <Activity className="w-4 h-4" />,
          href: `${base}/anamnesis`,
          moduleId: "M2_anamnesis",
        },
        {
          id: "consentimiento",
          label: "Consentimientos",
          icon: <FileSignature className="w-4 h-4" />,
          href: `${base}/consentimiento`,
          moduleId: "M5_consentimiento",
        },
      ],
    },
    {
      title: "Documentos",
      items: [
        {
          id: "exportar-pdf",
          label: "Exportar PDF",
          icon: <FileDown className="w-4 h-4" />,
          href: `${base}/exportar-pdf`,
        },
        {
          id: "fhir",
          label: "FHIR Preview",
          icon: <Share2 className="w-4 h-4" />,
          href: `${base}/fhir`,
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          id: "egreso",
          label: "Egresos",
          icon: <LogOut className="w-4 h-4" />,
          href: `${base}/egreso`,
          moduleId: "M9_egresos",
        },
        {
          id: "auditoria",
          label: "Auditoría",
          icon: <ShieldCheck className="w-4 h-4" />,
          href: `${base}/auditoria`,
          adminOnly: true,
          moduleId: "M6_auditoria",
        },
      ],
    },
  ];
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors group",
        isActive
          ? "bg-kp-accent-xs text-kp-primary font-medium border border-kp-accent/30"
          : "text-ink-2 hover:bg-surface-0 hover:text-ink-1"
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-kp-accent" : "text-ink-3 group-hover:text-kp-accent"
        )}
      >
        {item.icon}
      </span>
      <span className="leading-tight text-xs font-medium">{item.label}</span>
    </Link>
  );
}

export function PatientActionNav({ patientId, isAdmin, resumenIA }: PatientActionNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const config = useClinicaConfig();
  const modulosActivos = config.modulosActivos;
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);

  const groups = buildNav(patientId);

  function isVisible(item: NavItem): boolean {
    if (item.adminOnly && !isAdmin) return false;
    if (item.moduleId && !modulosActivos.includes(item.moduleId)) return false;
    return true;
  }

  function isActiveHref(href: string) {
    return pathname === href || pathname.startsWith(href + "?");
  }

  return (
    <nav className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Acciones
        </p>
      </div>

      <div className="p-2 space-y-1">
        {/* Slot Resumen IA — sin grupo */}
        {resumenIA && (
          <>
            <div className="px-1">{resumenIA}</div>
            <div className="my-1 border-t border-kp-border" />
          </>
        )}

        {/* Nota rápida — primera acción del grupo Registro */}
        <p className="px-3 pt-1 pb-0.5 text-[0.58rem] font-bold text-ink-4 uppercase tracking-wider">
          Registro
        </p>
        <button
          onClick={() => setQuickNoteOpen(true)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors group cursor-pointer",
            "text-ink-2 hover:bg-surface-0 hover:text-ink-1"
          )}
        >
          <span className="shrink-0 text-ink-3 group-hover:text-kp-accent transition-colors">
            <FileEdit className="w-4 h-4" />
          </span>
          <span className="leading-tight text-xs font-medium">Nota rápida</span>
        </button>

        {/* Grupos semánticos */}
        {groups.map((group, idx) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title}>
              {idx > 0 && <div className="my-1 border-t border-kp-border" />}
              {idx > 0 && (
                <p className="px-3 pt-1 pb-0.5 text-[0.58rem] font-bold text-ink-4 uppercase tracking-wider">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.id}
                    item={item}
                    isActive={isActiveHref(item.href)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {quickNoteOpen && (
        <QuickNoteModal
          patientId={patientId}
          onClose={() => setQuickNoteOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </nav>
  );
}
