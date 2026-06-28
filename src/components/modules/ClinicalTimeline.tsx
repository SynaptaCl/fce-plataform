"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  LogOut,
} from "lucide-react";
import { useProfesionalActivo } from "@/lib/modules/provider";
import { EncuentroLauncher } from "@/components/shared/EncuentroLauncher";
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
import { EgresoCard } from "@/components/shared/EgresoCard";
import { PlanIntervencionExpandedCard } from "./timeline/PlanIntervencionExpandedCard";
import { AdendaExpandedCard } from "./timeline/AdendaExpandedCard";
import { AdendaModal } from "@/components/shared/AdendaModal";
import type { AdendaTarget } from "@/types/adenda";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

// ── Types ──────────────────────────────────────────────────────────────────

interface ClinicalTimelineProps {
  entries: TimelineEntry[];
  currentUserId: string;
  patientId: string;
  /** Especialidades activas de la clínica — códigos exactos del catálogo */
  especialidadesActivas: string[];
  paciente?: Patient;
  clinica?: ClinicaConfig;
  rolActual?: string;
}

type ViewMode = "todos" | "solo_notas";

// ── Config ─────────────────────────────────────────────────────────────────

const ESPECIALIDADES_SIN_TIMELINE = ["Administración Clínica"];

type BadgeVariant = "teal" | "info" | "warning" | "success";

/**
 * Entry types that can be signed/drafted.
 * Others (signos_vitales, instrumento, evaluacion, egreso) are always neutral.
 */
const FIRMA_TYPES = new Set<TimelineEntry["type"]>([
  "nota_clinica",
  "soap",
  "consentimiento",
  "prescripcion",
]);

const TYPE_CONFIG: Record<
  TimelineEntry["type"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    badgeVariant: BadgeVariant;
    /** 3px left border color (CSS var string) */
    borderColor: string;
    /** Icon box background (CSS var string) */
    iconBg: string;
    /** Icon color as CSS var string — applied via inline style */
    iconColor: string;
  }
> = {
  soap: {
    label: "Nota SOAP",
    icon: FileText,
    badgeVariant: "teal",
    borderColor: "var(--color-kp-primary, #006B6B)",
    iconBg: "var(--color-indigo-icon-bg, #EEF2FF)",
    iconColor: "var(--color-indigo-icon, #4F46E5)",
  },
  evaluacion: {
    label: "Evaluación",
    icon: Stethoscope,
    badgeVariant: "info",
    borderColor: "var(--color-kp-primary, #006B6B)",
    iconBg: "var(--color-indigo-icon-bg, #EEF2FF)",
    iconColor: "var(--color-indigo-icon, #4F46E5)",
  },
  signos_vitales: {
    label: "Signos Vitales",
    icon: Activity,
    badgeVariant: "warning",
    borderColor: "var(--color-ink-3, #94A3B8)",
    iconBg: "var(--color-surface-0, #F1F5F9)",
    iconColor: "var(--color-ink-3, #94A3B8)",
  },
  consentimiento: {
    label: "Consentimiento",
    icon: FileSignature,
    badgeVariant: "success",
    borderColor: "var(--color-ink-3, #94A3B8)",
    iconBg: "var(--color-surface-0, #F1F5F9)",
    iconColor: "var(--color-ink-3, #94A3B8)",
  },
  nota_clinica: {
    label: "Nota Clínica",
    icon: FileText,
    badgeVariant: "teal",
    borderColor: "var(--color-kp-primary, #006B6B)",
    iconBg: "var(--color-indigo-icon-bg, #EEF2FF)",
    iconColor: "var(--color-indigo-icon, #4F46E5)",
  },
  instrumento: {
    label: "Instrumento",
    icon: ClipboardList,
    badgeVariant: "info",
    borderColor: "var(--color-kp-accent, #00B0A8)",
    iconBg: "var(--color-kp-accent-lt, #D5F5F4)",
    iconColor: "var(--color-kp-primary, #006B6B)",
  },
  prescripcion: {
    label: "Prescripción",
    icon: Pill,
    badgeVariant: "info" as BadgeVariant,
    borderColor: "var(--color-kp-secondary, #F5A623)",
    iconBg: "var(--color-kp-secondary-lt, #FEF3E2)",
    iconColor: "var(--color-amber-icon, #B45309)",
  },
  orden_examen: {
    label: "Orden de Examen",
    icon: ClipboardList,
    badgeVariant: "info" as BadgeVariant,
    borderColor: "var(--color-kp-secondary, #F5A623)",
    iconBg: "var(--color-kp-secondary-lt, #FEF3E2)",
    iconColor: "var(--color-amber-icon, #B45309)",
  },
  egreso: {
    label: "Egreso",
    icon: LogOut,
    badgeVariant: "warning" as BadgeVariant,
    borderColor: "var(--color-kp-danger, #DC2626)",
    iconBg: "var(--color-kp-danger-lt, #FEE2E2)",
    iconColor: "var(--color-kp-danger, #DC2626)",
  },
  plan_intervencion: {
    label: "Plan de Intervención",
    icon: ClipboardList,
    badgeVariant: "info" as BadgeVariant,
    borderColor: "var(--color-kp-accent, #00B0A8)",
    iconBg: "var(--color-kp-accent-lt, #D5F5F4)",
    iconColor: "var(--color-kp-primary, #006B6B)",
  },
  adenda: {
    label: "Adenda",
    icon: FileText,
    badgeVariant: "warning" as BadgeVariant,
    borderColor: "var(--color-ink-2, #475569)",
    iconBg: "var(--color-surface-0, #F1F5F9)",
    iconColor: "var(--color-ink-2, #475569)",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determina si un entry es "principal" (expandido por defecto).
 * Principales: nota_clinica, soap, evaluacion.
 * Instrumento: principal solo si la interpretación contiene "alto" o "muy alto".
 */
function isMainEntry(entry: TimelineEntry): boolean {
  if (
    entry.type === "nota_clinica" ||
    entry.type === "soap" ||
    entry.type === "evaluacion"
  ) {
    return true;
  }
  if (entry.type === "instrumento") {
    const interp = String(entry.data.interpretacion ?? "").toLowerCase();
    return interp.includes("alto") || interp.includes("muy alto");
  }
  return false;
}

function normalizeEsp(esp: string): string {
  return esp
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, HH:mm", { locale: es });
}

function formatRelativeDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffDays = Math.floor(
    (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays}d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)}sem`;
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

// ── EntryContent ───────────────────────────────────────────────────────────

function EntryContent({
  entry,
  patientId,
  onVerReceta,
  onVerOrden,
  onAgregarAdenda,
}: {
  entry: TimelineEntry;
  patientId: string;
  onVerReceta?: (id: string) => void;
  onVerOrden?: (id: string) => void;
  onAgregarAdenda?: (target: AdendaTarget) => void;
}) {
  switch (entry.type) {
    case "soap":
      return <SoapExpandedCard entry={entry} patientId={patientId} onAgregarAdenda={onAgregarAdenda} />;
    case "evaluacion":
      return <EvaluacionExpandedCard entry={entry} patientId={patientId} />;
    case "signos_vitales":
      return <SignosVitalesExpandedCard entry={entry} patientId={patientId} />;
    case "consentimiento":
      return <ConsentimientoExpandedCard entry={entry} patientId={patientId} />;
    case "nota_clinica":
      return <NotaClinicaExpandedCard entry={entry} patientId={patientId} onAgregarAdenda={onAgregarAdenda} />;
    case "instrumento":
      return <InstrumentoExpandedCard entry={entry} patientId={patientId} />;
    case "prescripcion":
      return (
        <PrescripcionExpandedCard
          entry={entry}
          patientId={patientId}
          onVerReceta={onVerReceta}
        />
      );
    case "orden_examen":
      return (
        <OrdenExamenExpandedCard
          entry={entry}
          patientId={patientId}
          onVerOrden={onVerOrden}
        />
      );
    case "egreso":
      return <EgresoCard entry={entry} patientId={patientId} />;
    case "plan_intervencion":
      return <PlanIntervencionExpandedCard entry={entry} patientId={patientId} />;
    case "adenda":
      return <AdendaExpandedCard entry={entry} patientId={patientId} />;
  }
}

// ── TimelineCard ───────────────────────────────────────────────────────────

/**
 * Determines the 3px left border color for a card.
 * Draft entries of firma-capable types get a neutral gray border.
 */
function getCardBorderColor(entry: TimelineEntry): string {
  const cfg = TYPE_CONFIG[entry.type];
  // Entry types that have firma concept: show colored border only when signed
  if (FIRMA_TYPES.has(entry.type)) {
    if (entry.firmado) return cfg.borderColor;
    // Draft: subtle gray
    return "var(--color-kp-border, #E2E8F0)";
  }
  // No firma concept: always colored border
  return cfg.borderColor;
}

/**
 * Footer bar shown at the bottom of expanded signed documents.
 */
function SignedFooterBar({
  nombre,
  fecha,
}: {
  nombre?: string;
  fecha: string;
}) {
  const parts = ["Firmado"];
  if (nombre) parts.push(nombre);
  parts.push(formatDateTime(fecha));

  return (
    <div
      style={{
        borderTop: "0.5px solid var(--color-kp-border, #E2E8F0)",
        padding: "8px 16px",
        fontSize: "11px",
        color: "var(--color-kp-success, #16A34A)",
        background: "var(--color-kp-success-lt, #DCFCE7)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <Lock size={12} className="shrink-0" />
      <span>{parts.join(" · ")}</span>
    </div>
  );
}

function TimelineCard({
  entry,
  expanded,
  isMain,
  onToggle,
  patientId,
  onVerReceta,
  onVerOrden,
  onAgregarAdenda,
}: {
  entry: TimelineEntry;
  expanded: boolean;
  isMain: boolean;
  onToggle: () => void;
  patientId: string;
  onVerReceta?: (id: string) => void;
  onVerOrden?: (id: string) => void;
  onAgregarAdenda?: (target: AdendaTarget) => void;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const TypeIcon = cfg.icon;
  const espLabel = entry.especialidad ?? null;

  // Determine firma state
  const hasFirmaConcept = FIRMA_TYPES.has(entry.type);
  const isSigned = Boolean(entry.firmado);
  const isDraft = hasFirmaConcept && !isSigned;

  // Signed date: look in entry.data.firmado_at first, then fall back to entry.date
  const firmadoAt =
    typeof entry.data?.firmado_at === "string" ? entry.data.firmado_at : entry.date;

  const cardBorderColor = getCardBorderColor(entry);

  // Secondary + collapsed → compact single-line row
  if (!isMain && !expanded) {
    return (
      <button
        onClick={onToggle}
        aria-expanded={false}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 text-left",
          "border-b border-kp-border hover:bg-surface-0 transition-colors group cursor-pointer"
        )}
      >
        <TypeIcon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
        <span className="text-xs text-ink-2 flex-1 truncate min-w-0">
          {entry.titulo}
        </span>
        {isDraft && (
          <span
            style={{
              fontSize: "10px",
              background: "var(--color-kp-secondary-lt, #FEF3E2)",
              color: "var(--color-kp-secondary, #F5A623)",
              padding: "1px 5px",
              borderRadius: "4px",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            Borrador
          </span>
        )}
        {espLabel && <Badge variant={cfg.badgeVariant}>{espLabel}</Badge>}
        <span className="text-[0.65rem] text-ink-3 whitespace-nowrap shrink-0">
          {formatRelativeDate(entry.date)}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-3 shrink-0 group-hover:text-kp-accent transition-colors" />
      </button>
    );
  }

  // Full card (main entry or expanded secondary)
  return (
    <div
      style={{
        borderRadius: "10px",
        border: "0.5px solid var(--color-kp-border, #E2E8F0)",
        borderLeft: `3px solid ${cardBorderColor}`,
        marginBottom: "10px",
        overflow: "hidden",
        background: "var(--color-surface-1, #FFFFFF)",
        transition: "border-color 0.15s",
      }}
      className={cn(
        "transition-shadow hover:shadow-sm",
        // Draft cards invite editing on hover; signed cards are stable
        isDraft && "hover:[border-color:var(--color-kp-accent,#00B0A8)]"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left group cursor-pointer"
        style={{ padding: "14px 16px" }}
        aria-expanded={expanded}
      >
        {/* Type icon box */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: cfg.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <span style={{ color: cfg.iconColor, display: "flex" }}>
            <TypeIcon size={14} />
          </span>
        </div>

        {/* Header content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: "13px", fontWeight: 500 }} className="text-ink-1">
              {entry.titulo}
            </span>
            {/* Draft badge */}
            {isDraft && (
              <span
                style={{
                  fontSize: "10px",
                  background: "var(--color-kp-secondary-lt, #FEF3E2)",
                  color: "var(--color-kp-secondary, #F5A623)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Borrador
              </span>
            )}
            {espLabel && <Badge variant={cfg.badgeVariant}>{espLabel}</Badge>}
            {/* Lock icon for signed docs — right side */}
            {isSigned && (
              <Lock
                size={12}
                className="text-kp-accent shrink-0 ml-auto"
                aria-label="Firmado"
              />
            )}
          </div>
          {/* Meta row */}
          <div
            style={{ fontSize: "11px" }}
            className="flex flex-wrap items-center gap-3 mt-0.5 text-ink-3"
          >
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

      {/* Height-animated expand area */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          expanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-kp-border bg-surface-0/40">
            <EntryContent
              entry={entry}
              patientId={patientId}
              onVerReceta={onVerReceta}
              onVerOrden={onVerOrden}
              onAgregarAdenda={onAgregarAdenda}
            />
          </div>
          {/* Signed footer bar — only for signed firma-capable types */}
          {isSigned && hasFirmaConcept && (
            <SignedFooterBar
              nombre={entry.profesional_nombre}
              fecha={firmadoAt}
            />
          )}
        </div>
      </div>
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
  rolActual = "",
}: ClinicalTimelineProps) {
  const router = useRouter();
  const profesionalActivo = useProfesionalActivo();
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("todos");
  // Inicializar con los entries principales expandidos
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(entries.filter(isMainEntry).map((e) => e.id))
  );
  const [modalPrescripcionId, setModalPrescripcionId] = useState<string | null>(null);
  const [modalOrdenId, setModalOrdenId] = useState<string | null>(null);
  const [adendaTarget, setAdendaTarget] = useState<AdendaTarget | null>(null);

  // Construir tabs solo desde especialidades con entradas reales en este paciente
  const filterTabs = useMemo(() => {
    const base = [
      { key: "todos", label: "Todos" },
      { key: "mis", label: "Mis Atenciones" },
    ];
    const espConEntradas = new Set(
      entries
        .map((e) => e.especialidad)
        .filter((esp): esp is string => !!esp && !ESPECIALIDADES_SIN_TIMELINE.includes(esp))
    );
    const espTabs = especialidadesActivas
      .filter((esp) => !ESPECIALIDADES_SIN_TIMELINE.includes(esp) && espConEntradas.has(esp))
      .map((esp) => ({ key: esp, label: esp }));
    return [...base, ...espTabs];
  }, [especialidadesActivas, entries]);

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = entries;
    if (activeTab === "mis") {
      result = result.filter((e) => e.autor_id === currentUserId);
    } else if (activeTab !== "todos") {
      const tabNorm = normalizeEsp(activeTab);
      result = result.filter(
        (e) => e.especialidad && normalizeEsp(e.especialidad) === tabNorm
      );
    }
    if (viewMode === "solo_notas") {
      result = result.filter(
        (e) => e.type === "nota_clinica" || e.type === "soap"
      );
    }
    return result;
  }, [entries, activeTab, currentUserId, viewMode]);

  // ── Tab counts (basado solo en el filtro de tab, no en viewMode) ──────
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
      <div className="px-4 py-3 border-b border-kp-border flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest shrink-0">
          Timeline Clínico
        </p>
        <div className="flex items-center gap-2">
          {/* Segmented control: Todos / Solo notas */}
          <div className="flex items-center rounded-md border border-kp-border overflow-hidden text-[0.65rem]">
            {(["todos", "solo_notas"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                  viewMode === mode
                    ? "bg-kp-accent text-white"
                    : "text-ink-3 hover:text-ink-2 hover:bg-surface-0"
                )}
              >
                {mode === "todos" ? "Todos" : "Solo notas"}
              </button>
            ))}
          </div>
          {/* Expandir / Colapsar todo */}
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
          entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FileText className="w-8 h-8 text-ink-4 mb-2" />
              <p className="text-sm font-medium text-ink-3">
                Paciente sin registros clínicos
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <Link
                  href={`/dashboard/pacientes/${patientId}/anamnesis`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-kp-border bg-surface-0 text-ink-2 hover:text-kp-accent hover:border-kp-accent transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Completar anamnesis
                </Link>
                {profesionalActivo && (
                  <EncuentroLauncher
                    patientId={patientId}
                    especialidad={profesionalActivo.especialidad}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FileText className="w-8 h-8 text-ink-4 mb-2" />
              <p className="text-sm font-medium text-ink-3">
                Sin registros para este filtro
              </p>
              <p className="text-xs text-ink-4 mt-1">
                Los registros aparecerán aquí en orden cronológico inverso
              </p>
            </div>
          )
        ) : (
          filtered.map((entry) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              expanded={expandedIds.has(entry.id)}
              isMain={isMainEntry(entry)}
              onToggle={() => toggleEntry(entry.id)}
              patientId={patientId}
              onVerReceta={paciente && clinica ? setModalPrescripcionId : undefined}
              onVerOrden={paciente && clinica ? setModalOrdenId : undefined}
              onAgregarAdenda={setAdendaTarget}
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
      {adendaTarget && (
        <AdendaModal
          open={true}
          onClose={() => setAdendaTarget(null)}
          target={adendaTarget}
          idPaciente={patientId}
          profesionalIdActual={currentUserId}
          rolActual={rolActual}
          onSuccess={() => {
            setAdendaTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
