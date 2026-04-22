// src/components/modules/timeline/_shared.tsx
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { CifAssessment, CifItem } from "@/types/cif";
import { CIF_QUANTIFIER_LABELS } from "@/types/cif";

// ── Text helpers ──────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(iso.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return iso;
  }
}

// ── Layout atoms ──────────────────────────────────────────────────────────────

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-0.5">{label}</p>
      <p className="leading-relaxed text-ink-2 whitespace-pre-wrap text-xs">{children}</p>
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem]">{children}</p>
  );
}

// ── Footer (author + date + firmado/borrador) ─────────────────────────────────

export function EntryFooter({
  firmado,
  nombre,
  fecha,
  firmadoLabel = "Firmado",
  borradorLabel = "Borrador",
}: {
  firmado: boolean;
  nombre?: string;
  fecha: string;
  firmadoLabel?: string;
  borradorLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem] text-ink-3 pt-2 border-t border-kp-border mt-1">
      {firmado ? (
        <>
          <Lock className="w-3 h-3 text-kp-success shrink-0" />
          <span className="text-kp-success font-medium">{firmadoLabel}</span>
        </>
      ) : (
        <span className="italic text-ink-4">{borradorLabel}</span>
      )}
      {nombre && <span>· {nombre}</span>}
      <span>· {formatDate(fecha)}</span>
    </div>
  );
}

// ── Encounter link ────────────────────────────────────────────────────────────

export function EncuentroLink({ url }: { url: string }) {
  return (
    <div className="flex justify-end pt-1">
      <Link
        href={url}
        className="text-xs text-kp-accent font-medium hover:underline transition-colors flex items-center gap-0.5"
      >
        Ver encuentro completo →
      </Link>
    </div>
  );
}

// ── CIF section ───────────────────────────────────────────────────────────────

const CIF_DOMAINS: Array<{ key: keyof CifAssessment; label: string }> = [
  { key: "funciones",    label: "Funciones" },
  { key: "actividades",  label: "Actividades" },
  { key: "participacion", label: "Participación" },
  { key: "contexto",     label: "Contexto" },
];

export function CifSection({ cif }: { cif: CifAssessment }) {
  const activeDomains = CIF_DOMAINS.filter((d) => (cif[d.key]?.length ?? 0) > 0);
  if (activeDomains.length === 0) {
    return (
      <div>
        <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-0.5">A — Análisis CIF</p>
        <p className="text-xs text-ink-4 italic">Sin ítems CIF registrados</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1">A — Análisis CIF</p>
      <div className="space-y-2">
        {activeDomains.map(({ key, label }) => {
          const items = cif[key] as CifItem[];
          return (
            <div key={key}>
              <p className="text-[0.6rem] font-semibold text-ink-3 mb-0.5">{label}</p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-1.5 text-xs text-ink-2">
                    <span className="font-mono text-[0.6rem] text-ink-3 shrink-0 mt-0.5">{item.code}</span>
                    <span className="flex-1">{item.description}</span>
                    <span className="text-ink-3 shrink-0 text-[0.6rem]">
                      {CIF_QUANTIFIER_LABELS[item.quantifier]?.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Generic key-value list (for evaluacion evData) ────────────────────────────

export function KeyValueList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) return false;
    return true;
  });
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 text-xs text-ink-2">
          <span className="font-medium text-ink-1 capitalize shrink-0" style={{ minWidth: "8rem" }}>
            {key.replace(/_/g, " ")}:
          </span>
          <span className="flex-1 break-words">
            {typeof val === "boolean"
              ? val ? "Sí" : "No"
              : Array.isArray(val)
              ? val.join(", ")
              : typeof val === "object"
              ? JSON.stringify(val)
              : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}
