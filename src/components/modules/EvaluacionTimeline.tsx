"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  FileText,
  Activity,
  ChevronDown,
  Lock,
  Clock,
  ClipboardX,
} from "lucide-react";
import type { TimelineEntryClinico } from "@/app/actions/timeline";

// ── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  evaluacion: {
    Icon: ClipboardList,
    label: "Evaluación",
    iconCls: "text-kp-accent",
    borderCls: "border-l-kp-accent",
    bgCls: "bg-kp-accent/5",
  },
  soap: {
    Icon: FileText,
    label: "SOAP",
    iconCls: "text-kp-primary",
    borderCls: "border-l-kp-primary",
    bgCls: "bg-kp-primary/5",
  },
  signos_vitales: {
    Icon: Activity,
    label: "Signos vitales",
    iconCls: "text-rose-500",
    borderCls: "border-l-rose-400",
    bgCls: "bg-rose-50",
  },
} as const;

const PERIOD_MS: Record<string, number> = {
  mes: 30 * 24 * 60 * 60 * 1000,
  trimestre: 90 * 24 * 60 * 60 * 1000,
  año: 365 * 24 * 60 * 60 * 1000,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// ── Entry detail content ─────────────────────────────────────────────────────

function EvalDetail({ data }: { data: Record<string, unknown> }) {
  const subArea = data.sub_area ? String(data.sub_area).replace(/_/g, " ") : null;
  const campos = data.campos as Record<string, unknown> | null | undefined;

  const camposPreviews = campos
    ? Object.entries(campos)
        .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
        .slice(0, 4)
    : [];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
      {subArea && (
        <div>
          <p className="text-ink-3">Área</p>
          <p className="font-medium text-ink-1 capitalize">{subArea}</p>
        </div>
      )}
      {camposPreviews.map(([key, val]) => (
        <div key={key}>
          <p className="text-ink-3 capitalize">{key.replace(/_/g, " ")}</p>
          <p className="font-medium text-ink-1">{String(val)}</p>
        </div>
      ))}
      {camposPreviews.length === 0 && !subArea && (
        <p className="text-ink-3 col-span-2">Sin campos adicionales registrados.</p>
      )}
    </div>
  );
}

function SoapDetail({ data }: { data: Record<string, unknown> }) {
  const subjetivo = data.subjetivo as string | null | undefined;
  return (
    <div className="text-xs">
      <p className="text-ink-3 mb-1">Subjetivo</p>
      <p className="text-ink-2 leading-relaxed">{subjetivo ?? "—"}</p>
    </div>
  );
}

function VitalsDetail({ data }: { data: Record<string, unknown> }) {
  const fields: [string, string, string][] = [
    ["PA", String(data.presion_arterial ?? "—"), "mmHg"],
    ["FC", String(data.frecuencia_cardiaca ?? "—"), "bpm"],
    ["SpO₂", String(data.spo2 ?? "—"), "%"],
    ["T°", String(data.temperatura ?? "—"), "°C"],
    ["FR", String(data.frecuencia_respiratoria ?? "—"), "rpm"],
  ];
  return (
    <div className="grid grid-cols-5 gap-2 text-xs">
      {fields.map(([label, val, unit]) => (
        <div key={label} className="text-center">
          <p className="text-ink-3">{label}</p>
          <p className="font-semibold text-ink-1 text-sm">{val}</p>
          <p className="text-ink-4">{unit}</p>
        </div>
      ))}
    </div>
  );
}

// ── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: TimelineEntryClinico;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const cfg = TYPE_CONFIG[entry.tipo];
  const { Icon } = cfg;

  return (
    <div className={`border-l-4 ${cfg.borderCls} px-5 py-4`}>
      {/* Top row: icon + type + date + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 shrink-0 ${cfg.iconCls}`} />
          <span className={`text-xs font-semibold ${cfg.iconCls}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-ink-3">{fmtDate(entry.fecha)}</span>
          {entry.tipo === "soap" && (
            entry.firmado ? (
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Lock className="w-2.5 h-2.5" />
                Firmada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5" />
                Borrador
              </span>
            )
          )}
        </div>
      </div>

      {/* Author line */}
      <p className="text-xs text-ink-3 mt-1 ml-6">
        {entry.autorNombre}
        {entry.autorEspecialidad && (
          <span className="text-ink-4"> · {entry.autorEspecialidad}</span>
        )}
      </p>

      {/* Summary + expand toggle */}
      <div className="flex items-end justify-between gap-4 mt-2 ml-6">
        <p className="text-sm text-ink-2 leading-snug line-clamp-2 flex-1">
          {entry.resumen}
        </p>
        <button
          onClick={onToggle}
          className="flex items-center gap-0.5 text-xs text-ink-3 hover:text-ink-2 transition-colors shrink-0 pb-0.5"
        >
          {isExpanded ? "Cerrar" : "Detalle"}
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && entry.data && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className={`ml-6 mt-3 pt-3 border-t border-kp-border rounded-lg p-3 ${cfg.bgCls}`}>
              {entry.tipo === "evaluacion" && <EvalDetail data={entry.data} />}
              {entry.tipo === "soap" && <SoapDetail data={entry.data} />}
              {entry.tipo === "signos_vitales" && <VitalsDetail data={entry.data} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface EvaluacionTimelineProps {
  entries: TimelineEntryClinico[];
  especialidadesActivas: string[];
}

export function EvaluacionTimeline({ entries, especialidadesActivas }: EvaluacionTimelineProps) {
  const [filterEsp, setFilterEsp] = useState("todas");
  const [filterPeriod, setFilterPeriod] = useState("mes");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filteredEntries = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return entries.filter((e) => {
      if (filterEsp !== "todas" && e.especialidad !== filterEsp) return false;
      if (filterPeriod !== "todo") {
        const diff = now - new Date(e.fecha).getTime();
        if (diff > (PERIOD_MS[filterPeriod] ?? Infinity)) return false;
      }
      return true;
    });
  }, [entries, filterEsp, filterPeriod]);

  const selectCls =
    "text-xs border border-kp-border rounded-lg px-3 py-1.5 bg-surface-1 text-ink-2 focus:outline-none focus:ring-1 focus:ring-kp-accent/30 cursor-pointer";

  return (
    <div className="bg-surface-1 rounded-2xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-kp-border bg-surface-0">
        <h3 className="text-sm font-semibold text-ink-1">Historial clínico</h3>
        <div className="flex items-center gap-2">
          <select
            value={filterEsp}
            onChange={(e) => setFilterEsp(e.target.value)}
            className={selectCls}
          >
            <option value="todas">Todas las especialidades</option>
            {especialidadesActivas
              .filter((e) => e !== "Administración Clínica")
              .map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
          </select>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={selectCls}
          >
            <option value="mes">Último mes</option>
            <option value="trimestre">Últimos 3 meses</option>
            <option value="año">Último año</option>
            <option value="todo">Todo el historial</option>
          </select>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-kp-border">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ClipboardX className="w-10 h-10 text-ink-4 mb-3" />
            <p className="text-sm font-medium text-ink-2">Sin registros clínicos</p>
            <p className="text-xs text-ink-3 mt-1 max-w-xs">
              {entries.length === 0
                ? "Las evaluaciones, notas SOAP y signos vitales de este paciente aparecerán aquí."
                : "No hay registros para el filtro seleccionado. Prueba con otro período o especialidad."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expanded.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
