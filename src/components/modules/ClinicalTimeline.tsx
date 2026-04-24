"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Stethoscope,
  FileText,
  FileSignature,
  Lock,
  ChevronsUpDown,
  ChevronsDownUp,
  User,
  Clock,
  ClipboardList,
  Pill,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/app/actions/timeline";
import { SoapExpandedCard } from "./timeline/SoapExpandedCard";
import { EvaluacionExpandedCard } from "./timeline/EvaluacionExpandedCard";
import { NotaClinicaExpandedCard } from "./timeline/NotaClinicaExpandedCard";
import { InstrumentoExpandedCard } from "./timeline/InstrumentoExpandedCard";
import { SignosVitalesExpandedCard } from "./timeline/SignosVitalesExpandedCard";
import { ConsentimientoExpandedCard } from "./timeline/ConsentimientoExpandedCard";
import { PrescripcionExpandedCard } from "./timeline/PrescripcionExpandedCard";
import { PrescripcionDetalleModal } from "@/components/shared/PrescripcionDetalleModal";
import { OrdenExamenExpandedCard } from "./timeline/OrdenExamenExpandedCard";
import { OrdenExamenDetalleModal } from "@/components/shared/OrdenExamenDetalleModal";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

// ── Types ──────────────────────────────────────────────────────────────────

interface ClinicalTimelineProps {
  entries: TimelineEntry[];
  currentUserId: string;
  patientId: string;
  /** Especialidades activas de la clínica — códigos exactos del catálogo */
  especialidadesActivas: string[];
  paciente?: Patient;       // needed for PrescripcionDetalleModal
  clinica?: ClinicaConfig;  // needed for PrescripcionDetalleModal
}

// ── Config ─────────────────────────────────────────────────────────────────

/** Especialidades que no generan actividad clínica en el timeline */
const ESPECIALIDADES_SIN_TIMELINE = ["Administración Clínica"];

type BadgeVariant = "teal" | "info" | "warning" | "success";

const TYPE_CONFIG: Record<
  TimelineEntry["type"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeVariant: BadgeVariant;
    borderClass: string;
    bgClass: string;
  }
> = {
  soap: {
    label: "Nota SOAP",
    icon: FileText,
    badgeVariant: "teal",
    borderClass: "border-l-kp-accent",
    bgClass: "bg-kp-accent-xs",
  },
  evaluacion: {
    label: "Evaluación",
    icon: Stethoscope,
    badgeVariant: "info",
    borderClass: "border-l-kp-info",
    bgClass: "bg-kp-info-lt",
  },
  signos_vitales: {
    label: "Signos Vitales",
    icon: Activity,
    badgeVariant: "warning",
    borderClass: "border-l-kp-secondary",
    bgClass: "bg-kp-secondary-lt",
  },
  consentimiento: {
    label: "Consentimiento",
    icon: FileSignature,
    badgeVariant: "success",
    borderClass: "border-l-kp-success",
    bgClass: "bg-kp-success-lt",
  },
  nota_clinica: {
    label: "Nota Clínica",
    icon: FileText,
    badgeVariant: "teal",
    borderClass: "border-l-kp-accent",
    bgClass: "bg-kp-accent-xs",
  },
  instrumento: {
    label: "Instrumento",
    icon: ClipboardList,
    badgeVariant: "info",
    borderClass: "border-l-kp-info",
    bgClass: "bg-kp-info-lt",
  },
  prescripcion: {
    label: "Prescripción",
    icon: Pill,
    badgeVariant: "info" as BadgeVariant,
    borderClass: "border-l-kp-info",
    bgClass: "bg-kp-info-lt",
  },
  orden_examen: {
    label: "Orden de Examen",
    icon: ClipboardList,
    badgeVariant: "info" as BadgeVariant,
    borderClass: "border-l-kp-info",
    bgClass: "bg-kp-info-lt",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normaliza un código de especialidad para comparación interna */
function normalizeEsp(esp: string): string {
  return esp
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EntryContent({
  entry,
  patientId,
  onVerReceta,
  onVerOrden,
}: {
  entry: TimelineEntry;
  patientId: string;
  onVerReceta?: (id: string) => void;
  onVerOrden?: (id: string) => void;
}) {
  switch (entry.type) {
    case "soap":
      return <SoapExpandedCard entry={entry} patientId={patientId} />;
    case "evaluacion":
      return <EvaluacionExpandedCard entry={entry} patientId={patientId} />;
    case "signos_vitales":
      return <SignosVitalesExpandedCard entry={entry} patientId={patientId} />;
    case "consentimiento":
      return <ConsentimientoExpandedCard entry={entry} patientId={patientId} />;
    case "nota_clinica":
      return <NotaClinicaExpandedCard entry={entry} patientId={patientId} />;
    case "instrumento":
      return <InstrumentoExpandedCard entry={entry} patientId={patientId} />;
    case "prescripcion":
      return <PrescripcionExpandedCard entry={entry} patientId={patientId} onVerReceta={onVerReceta} />;
    case "orden_examen":
      return <OrdenExamenExpandedCard entry={entry} patientId={patientId} onVerOrden={onVerOrden} />;
  }
}

// ── TimelineCard ───────────────────────────────────────────────────────────

function TimelineCard({
  entry,
  expanded,
  onToggle,
  patientId,
  onVerReceta,
  onVerOrden,
}: {
  entry: TimelineEntry;
  expanded: boolean;
  onToggle: () => void;
  patientId: string;
  onVerReceta?: (id: string) => void;
  onVerOrden?: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const TypeIcon = cfg.icon;
  // Mostrar especialidad tal cual (código del catálogo)
  const espLabel = entry.especialidad ?? null;

  return (
    <div
      className={cn(
        "bg-surface-1 rounded-xl border border-kp-border border-l-2 overflow-hidden",
        "transition-shadow hover:shadow-sm",
        cfg.borderClass
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left group cursor-pointer"
        aria-expanded={expanded}
      >
        <div
          className={cn(
            "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            cfg.bgClass
          )}
        >
          <TypeIcon className="w-3.5 h-3.5 text-ink-2" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-1">{entry.titulo}</span>
            {espLabel && (
              <Badge variant={cfg.badgeVariant}>{espLabel}</Badge>
            )}
            {entry.firmado && (
              <Lock className="w-3 h-3 text-kp-success shrink-0" aria-label="Firmado" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[0.65rem] text-ink-3">
            {entry.profesional_nombre && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.profesional_nombre}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(entry.date)}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-ink-3 mt-0.5 truncate">{entry.resumen}</p>
          )}
        </div>

        <div className="shrink-0 text-ink-4 group-hover:text-kp-accent transition-colors mt-0.5">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-kp-border bg-surface-0/40">
          <EntryContent entry={entry} patientId={patientId} onVerReceta={onVerReceta} onVerOrden={onVerOrden} />
        </div>
      )}
    </div>
  );
}

// ── ClinicalTimeline ───────────────────────────────────────────────────────

export function ClinicalTimeline({
  entries,
  currentUserId,
  patientId,
  especialidadesActivas,
  paciente,
  clinica,
}: ClinicalTimelineProps) {
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalPrescripcionId, setModalPrescripcionId] = useState<string | null>(null);
  const [modalOrdenId, setModalOrdenId] = useState<string | null>(null);

  // Construir tabs dinámicamente desde config de la clínica
  const filterTabs = useMemo(() => {
    const base = [
      { key: "todos", label: "Todos" },
      { key: "mis", label: "Mis Atenciones" },
    ];
    // Agregar tab por cada especialidad activa que tenga sentido clínico
    const espTabs = especialidadesActivas
      .filter((esp) => !ESPECIALIDADES_SIN_TIMELINE.includes(esp))
      .map((esp) => ({ key: esp, label: esp }));
    return [...base, ...espTabs];
  }, [especialidadesActivas]);

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === "todos") return entries;
    if (activeTab === "mis") return entries.filter((e) => e.autor_id === currentUserId);
    // Filtrar por especialidad — comparar normalizado para tolerar diferencias
    const tabNorm = normalizeEsp(activeTab);
    return entries.filter((e) => {
      if (!e.especialidad) return false;
      return normalizeEsp(e.especialidad) === tabNorm;
    });
  }, [entries, activeTab, currentUserId]);

  // ── Tab counts ────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      todos: entries.length,
      mis: entries.filter((e) => e.autor_id === currentUserId).length,
    };
    for (const tab of filterTabs) {
      if (tab.key === "todos" || tab.key === "mis") continue;
      const tabNorm = normalizeEsp(tab.key);
      counts[tab.key] = entries.filter(
        (e) => e.especialidad && normalizeEsp(e.especialidad) === tabNorm
      ).length;
    }
    return counts;
  }, [entries, currentUserId, filterTabs]);

  // ── Expand/collapse ───────────────────────────────────────────────────
  const allExpanded =
    filtered.length > 0 && filtered.every((e) => expandedIds.has(e.id));

  function toggleEntry(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(filtered.map((e) => e.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border flex items-center justify-between gap-2">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest shrink-0">
          Timeline Clínico
        </p>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="flex items-center gap-1 text-[0.65rem] font-medium text-ink-3 hover:text-kp-accent transition-colors px-2 py-1 rounded-md hover:bg-surface-0"
        >
          {allExpanded ? (
            <>
              <ChevronsDownUp className="w-3 h-3" />
              Colapsar todo
            </>
          ) : (
            <>
              <ChevronsUpDown className="w-3 h-3" />
              Expandir todo
            </>
          )}
        </button>
      </div>

      {/* Filter tabs — dinámicos desde config */}
      <div className="flex border-b border-kp-border overflow-x-auto">
        {filterTabs.map((tab) => {
          const count = tabCounts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap",
                "border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[0.55rem] font-bold px-1 py-0.5 rounded-full min-w-[1.1rem] text-center leading-tight",
                    activeTab === tab.key
                      ? "bg-kp-accent text-white"
                      : "bg-surface-0 text-ink-3"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Entries list */}
      <div className="p-3 space-y-2 min-h-[200px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <FileText className="w-8 h-8 text-ink-4 mb-2" />
            <p className="text-sm font-medium text-ink-3">
              {activeTab === "todos"
                ? "Sin actividad clínica registrada"
                : "Sin registros para este filtro"}
            </p>
            <p className="text-xs text-ink-4 mt-1">
              Los registros aparecerán aquí en orden cronológico inverso
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              expanded={expandedIds.has(entry.id)}
              onToggle={() => toggleEntry(entry.id)}
              patientId={patientId}
              onVerReceta={paciente && clinica ? setModalPrescripcionId : undefined}
              onVerOrden={paciente && clinica ? setModalOrdenId : undefined}
            />
          ))
        )}
      </div>

      {modalPrescripcionId && paciente && clinica && (
        <PrescripcionDetalleModal
          prescripcionId={modalPrescripcionId}
          paciente={paciente}
          clinica={clinica}
          onClose={() => setModalPrescripcionId(null)}
        />
      )}
      {modalOrdenId && paciente && clinica && (
        <OrdenExamenDetalleModal
          ordenId={modalOrdenId}
          paciente={paciente}
          clinica={clinica}
          onClose={() => setModalOrdenId(null)}
        />
      )}
    </div>
  );
}
