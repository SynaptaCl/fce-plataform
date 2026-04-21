"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/app/actions/timeline";

// ── Types ──────────────────────────────────────────────────────────────────

interface ClinicalTimelineProps {
  entries: TimelineEntry[];
  currentUserId: string;
  patientId: string;
  /** Especialidades activas de la clínica — códigos exactos del catálogo */
  especialidadesActivas: string[];
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

// ── Expanded content by type ───────────────────────────────────────────────

function SoapContent({ data }: { data: TimelineEntry["data"] }) {
  return (
    <div className="space-y-2.5 text-xs text-ink-2">
      {data.subjetivo && (
        <div>
          <p className="font-bold text-ink-1 uppercase tracking-wide text-[0.6rem] mb-0.5">
            S — Subjetivo
          </p>
          <p className="leading-relaxed">{data.subjetivo}</p>
        </div>
      )}
      {data.objetivo && (
        <div>
          <p className="font-bold text-ink-1 uppercase tracking-wide text-[0.6rem] mb-0.5">
            O — Objetivo
          </p>
          <p className="leading-relaxed">{data.objetivo}</p>
        </div>
      )}
      {data.plan && (
        <div>
          <p className="font-bold text-ink-1 uppercase tracking-wide text-[0.6rem] mb-0.5">
            P — Plan
          </p>
          <p className="leading-relaxed">{data.plan}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {data.proxima_sesion && (
          <span className="flex items-center gap-1 text-kp-primary font-medium">
            <Clock className="w-3 h-3" />
            Próxima: {data.proxima_sesion}
          </span>
        )}
        {data.cif_count > 0 && (
          <Badge variant="teal">{data.cif_count} ítems CIF</Badge>
        )}
        {data.firmado && (
          <span className="flex items-center gap-1 text-kp-success font-medium">
            <Lock className="w-3 h-3" />
            Firmado {data.firmado_at ? formatDateTime(data.firmado_at) : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function EvaluacionContent({ data }: { data: TimelineEntry["data"] }) {
  // Mostrar especialidad tal cual viene (código del catálogo con tildes)
  const esp = data.especialidad ?? null;
  const area = data.sub_area
    ? String(data.sub_area).replace(/_/g, " ")
    : null;
  return (
    <div className="text-xs text-ink-2 space-y-1.5">
      {esp && (
        <p>
          <span className="font-semibold text-ink-1">Especialidad:</span> {esp}
        </p>
      )}
      {area && (
        <p>
          <span className="font-semibold text-ink-1">Área:</span>{" "}
          <span className="capitalize">{area}</span>
        </p>
      )}
      {data.contraindicaciones_certificadas === true && (
        <Badge variant="success">Contraindicaciones certificadas ✓</Badge>
      )}
    </div>
  );
}

function SignosContent({ data }: { data: TimelineEntry["data"] }) {
  const fields = [
    { label: "PA", value: data.presion_arterial, unit: "mmHg" },
    { label: "FC", value: data.frecuencia_cardiaca, unit: "bpm" },
    { label: "SpO₂", value: data.spo2, unit: "%" },
    { label: "T°", value: data.temperatura, unit: "°C" },
    { label: "FR", value: data.frecuencia_respiratoria, unit: "rpm" },
  ].filter((f) => f.value != null);

  if (fields.length === 0) {
    return <p className="text-xs text-ink-4 italic">Sin datos de signos vitales</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {fields.map((f) => (
        <div
          key={f.label}
          className="bg-surface-0 rounded-lg px-2 py-1.5 text-center"
        >
          <p className="text-[0.55rem] font-bold text-ink-3 uppercase tracking-wide">
            {f.label}
          </p>
          <p className="text-sm font-bold text-ink-1">
            {String(f.value)}{" "}
            <span className="text-[0.6rem] font-normal text-ink-3">{f.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function ConsentimientoContent({ data }: { data: TimelineEntry["data"] }) {
  const tipo = String(data.tipo ?? "");
  const tipoLabel =
    tipo === "general"
      ? "General de tratamiento"
      : tipo === "menores"
        ? "Menores / vulnerables"
        : tipo === "teleconsulta"
          ? "Teleconsulta"
          : tipo || "—";
  return (
    <div className="text-xs text-ink-2 space-y-1">
      <p>
        <span className="font-semibold text-ink-1">Tipo:</span> {tipoLabel}
      </p>
      {data.version && (
        <p>
          <span className="font-semibold text-ink-1">Versión:</span> {data.version}
        </p>
      )}
    </div>
  );
}

function NotaClinicaContent({
  entry,
  patientId,
}: {
  entry: TimelineEntry;
  patientId: string;
}) {
  const firmado = entry.data?.firmado ?? entry.firmado;
  return (
    <div className="text-xs text-ink-2 space-y-2">
      <div className="flex items-center gap-2">
        {firmado ? (
          <Badge variant="success" icon={<Lock className="w-3 h-3" />}>
            Firmado
          </Badge>
        ) : (
          <Badge variant="warning">Borrador</Badge>
        )}
      </div>
      {entry.resumen && (
        <p className="leading-relaxed text-ink-2">{entry.resumen}</p>
      )}
      {entry.encuentroId && (
        <Link
          href={`/dashboard/pacientes/${patientId}/encuentro/${entry.encuentroId}/clinico`}
          className="inline-flex items-center gap-1 text-[var(--kp-accent)] font-medium hover:underline"
        >
          Ver nota →
        </Link>
      )}
    </div>
  );
}

function InstrumentoContent({
  entry,
  patientId,
}: {
  entry: TimelineEntry;
  patientId: string;
}) {
  const interpretacion = entry.data?.interpretacion as string | null | undefined;
  return (
    <div className="text-xs text-ink-2 space-y-2">
      {interpretacion && (
        <p>
          <span className="font-semibold text-ink-1">Interpretación:</span>{" "}
          <span className="inline-block px-1.5 py-0.5 rounded bg-surface-0 text-ink-2 border border-kp-border">
            {interpretacion}
          </span>
        </p>
      )}
      {entry.encuentroId && (
        <Link
          href={`/dashboard/pacientes/${patientId}/encuentro/${entry.encuentroId}/clinico`}
          className="inline-flex items-center gap-1 text-[var(--kp-accent)] font-medium hover:underline"
        >
          Ver encuentro →
        </Link>
      )}
    </div>
  );
}

function EntryContent({
  entry,
  patientId,
}: {
  entry: TimelineEntry;
  patientId: string;
}) {
  switch (entry.type) {
    case "soap":
      return <SoapContent data={entry.data} />;
    case "evaluacion":
      return <EvaluacionContent data={entry.data} />;
    case "signos_vitales":
      return <SignosContent data={entry.data} />;
    case "consentimiento":
      return <ConsentimientoContent data={entry.data} />;
    case "nota_clinica":
      return <NotaClinicaContent entry={entry} patientId={patientId} />;
    case "instrumento":
      return <InstrumentoContent entry={entry} patientId={patientId} />;
  }
}

// ── TimelineCard ───────────────────────────────────────────────────────────

function TimelineCard({
  entry,
  expanded,
  onToggle,
  patientId,
}: {
  entry: TimelineEntry;
  expanded: boolean;
  onToggle: () => void;
  patientId: string;
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
          <EntryContent entry={entry} patientId={patientId} />
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
}: ClinicalTimelineProps) {
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
            />
          ))
        )}
      </div>
    </div>
  );
}
