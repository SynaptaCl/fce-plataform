"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Loader2, Clock } from "lucide-react";
import { getLabelPieza } from "@/lib/dental/fdi";
import { ESTADO_CONFIG } from "./OdontogramaPieza";
import { upsertPieza, getHistorialPieza } from "@/app/actions/dental/odontograma";
import type { OdontogramaEntry, EstadoPieza, SuperficieDental } from "@/types";
import type { HistorialPiezaEntry } from "@/app/actions/dental/odontograma";

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADOS = Object.entries(ESTADO_CONFIG) as [EstadoPieza, { fill: string; stroke: string; label: string }][];

const SUPERFICIES: { key: SuperficieDental; label: string }[] = [
  { key: "V", label: "V — Vestibular" },
  { key: "L", label: "L — Lingual/Palatino" },
  { key: "M", label: "M — Mesial" },
  { key: "D", label: "D — Distal" },
  { key: "O", label: "O — Oclusal/Incisal" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface PiezaDetailPanelProps {
  pieza: number;
  entry: OdontogramaEntry | undefined;
  encuentroId: string;
  patientId: string;
  readOnly: boolean;
  highlightSurface?: SuperficieDental | null;
  onClose: () => void;
  onSaved: (updated: OdontogramaEntry) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PiezaDetailPanel({
  pieza,
  entry,
  encuentroId,
  patientId,
  readOnly,
  highlightSurface,
  onClose,
  onSaved,
}: PiezaDetailPanelProps) {
  const [estado, setEstado] = useState<EstadoPieza>(entry?.estado ?? "sano");
  const [superficies, setSuperficies] = useState<Partial<Record<SuperficieDental, EstadoPieza | null>>>(
    entry?.superficies ?? {}
  );
  const [movilidad, setMovilidad] = useState<number | null>(entry?.movilidad ?? null);
  const [procedimiento, setProcedimiento] = useState("");
  const [notas, setNotas] = useState(entry?.notas ?? "");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [historial, setHistorial] = useState<HistorialPiezaEntry[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // Reset state when pieza changes
  useEffect(() => {
    setEstado(entry?.estado ?? "sano");
    setSuperficies(entry?.superficies ?? {});
    setMovilidad(entry?.movilidad ?? null);
    setNotas(entry?.notas ?? "");
    setProcedimiento("");
    setServerError(null);
    setLoadingHistorial(true);
    getHistorialPieza(patientId, pieza).then((res) => {
      setHistorial(res.success ? res.data : []);
      setLoadingHistorial(false);
    });
  }, [pieza, entry, patientId]);

  const handleSave = () => {
    setServerError(null);
    startTransition(async () => {
      const res = await upsertPieza({
        id_paciente: patientId,
        id_encuentro: encuentroId,
        pieza,
        estado,
        superficies,
        movilidad,
        notas: notas.trim() || null,
        procedimiento: procedimiento.trim() || null,
      });
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      setProcedimiento("");
      onSaved(res.data);
      setHistorial((prev) => [
        {
          ...res.data,
          id: crypto.randomUUID(),
          id_odontograma: res.data.id,
          id_encuentro: encuentroId,
          estado_anterior: entry?.estado ?? null,
          estado_nuevo: estado,
          superficies_anterior: entry?.superficies ?? null,
          superficies_nuevo: superficies,
          procedimiento: procedimiento.trim() || null,
          registrado_at: new Date().toISOString(),
          registrado_por: "",
        },
        ...prev,
      ]);
    });
  };

  const setSurface = (key: SuperficieDental, value: EstadoPieza | null) => {
    setSuperficies((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="flex flex-col border border-kp-border rounded-xl bg-surface-1 max-h-[75vh] overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-kp-border bg-surface-0 shrink-0 rounded-t-xl">
        <div>
          <p className="text-xs font-semibold text-kp-accent uppercase tracking-wide">Pieza {pieza}</p>
          <p className="text-sm font-medium text-ink-1 mt-0.5">{getLabelPieza(pieza)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-kp-border/40 transition-colors"
          aria-label="Cerrar panel"
        >
          <X className="w-4 h-4 text-ink-3" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-sm">

        {/* Estado general */}
        <fieldset>
          <legend className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Estado general</legend>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoPieza)}
            disabled={readOnly}
            className="w-full rounded-lg border border-kp-border bg-surface-0 px-3 py-2 text-sm text-ink-1 focus:outline-none focus:ring-2 focus:ring-kp-primary/30 disabled:opacity-60"
          >
            {ESTADOS.map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </fieldset>

        {/* Superficies */}
        <fieldset>
          <legend className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Superficies</legend>
          <div className="space-y-1.5">
            {SUPERFICIES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label
                  className="w-36 text-xs text-ink-2 shrink-0"
                  style={{ fontWeight: highlightSurface === key ? 600 : undefined, color: highlightSurface === key ? "var(--color-kp-primary)" : undefined }}
                >
                  {label}
                </label>
                <select
                  value={superficies[key] ?? ""}
                  onChange={(e) => setSurface(key, e.target.value ? e.target.value as EstadoPieza : null)}
                  disabled={readOnly}
                  className="flex-1 rounded-lg border border-kp-border bg-surface-0 px-2 py-1 text-xs text-ink-1 focus:outline-none focus:ring-1 focus:ring-kp-primary/30 disabled:opacity-60"
                >
                  <option value="">— igual al estado general</option>
                  {ESTADOS.map(([k, cfg]) => (
                    <option key={k} value={k}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </fieldset>

        {/* Movilidad */}
        <fieldset>
          <legend className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Movilidad</legend>
          <div className="flex gap-2">
            {[null, 0, 1, 2, 3].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => !readOnly && setMovilidad(v)}
                disabled={readOnly}
                className="flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60"
                style={{
                  borderColor: movilidad === v ? "var(--color-kp-primary)" : "var(--color-kp-border)",
                  background: movilidad === v ? "var(--color-kp-primary)" : "var(--color-surface-0)",
                  color: movilidad === v ? "#FFFFFF" : "var(--color-ink-2)",
                }}
              >
                {v === null ? "—" : v}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Procedimiento realizado */}
        {!readOnly && (
          <fieldset>
            <legend className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Procedimiento realizado</legend>
            <input
              type="text"
              value={procedimiento}
              onChange={(e) => setProcedimiento(e.target.value)}
              placeholder="Ej. Obturación resina MOD"
              className="w-full rounded-lg border border-kp-border bg-surface-0 px-3 py-2 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-kp-primary/30"
            />
          </fieldset>
        )}

        {/* Notas */}
        <fieldset>
          <legend className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Notas</legend>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={readOnly}
            rows={2}
            placeholder="Observaciones clínicas sobre esta pieza…"
            className="w-full rounded-lg border border-kp-border bg-surface-0 px-3 py-2 text-xs text-ink-1 placeholder:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-kp-primary/30 disabled:opacity-60"
          />
        </fieldset>

        {/* Error */}
        {serverError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{serverError}</p>
        )}

        {/* Historial */}
        <div>
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Historial de esta pieza
          </p>
          {loadingHistorial ? (
            <p className="text-xs text-ink-3">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="text-xs text-ink-3">Sin registros previos.</p>
          ) : (
            <ul className="space-y-2">
              {historial.map((h) => (
                <li key={h.id} className="text-xs text-ink-2 border-l-2 border-kp-border pl-2">
                  <span className="text-ink-3">{formatDate(h.registrado_at)}</span>
                  {" — "}
                  {ESTADO_CONFIG[h.estado_nuevo as EstadoPieza]?.label ?? h.estado_nuevo}
                  {h.procedimiento && (
                    <span className="block text-ink-3 mt-0.5">{h.procedimiento}</span>
                  )}
                  {h.profesional && (
                    <span className="block text-ink-3">{h.profesional.nombre}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer — botón guardar siempre visible */}
      {!readOnly && (
        <div className="px-4 py-3 border-t border-kp-border bg-surface-0 shrink-0 rounded-b-xl">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-kp-primary-deep)" }}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}
    </div>
  );
}
