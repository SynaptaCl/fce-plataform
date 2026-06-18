"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  Activity,
  FileSignature,
  ClipboardList,
  Download,
  Code,
  MoreHorizontal,
  Pill,
  Microscope,
  Shield,
} from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { QuickNoteModal } from "@/components/clinico/QuickNoteModal";

interface ActionBarProps {
  patientId: string;
  primaryAction?: React.ReactNode;
}

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  background: "var(--color-surface-0, #F1F5F9)",
  border: "0.5px solid var(--color-kp-border, #E2E8F0)",
  color: "var(--color-ink-2, #475569)",
  cursor: "pointer",
  textDecoration: "none",
  transition: "border-color 0.15s, color 0.15s",
  whiteSpace: "nowrap",
};

const chipCondicional: React.CSSProperties = {
  ...chipBase,
  borderStyle: "dashed",
  borderColor: "var(--color-kp-accent, #00B0A8)",
  color: "var(--color-kp-primary, #006B6B)",
};

const divider: React.CSSProperties = {
  width: 1,
  height: 20,
  background: "var(--color-kp-border, #E2E8F0)",
  flexShrink: 0,
};

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ width: 12, height: 12, display: "flex", alignItems: "center" }}>
      {children}
    </span>
  );
}

export function ActionBar({ patientId, primaryAction }: ActionBarProps) {
  const router = useRouter();
  const { config, rol, profesionalActivo } = useClinicaSession();
  const modulosActivos = config.modulosActivos;
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [overflowOpen]);

  const base = `/dashboard/pacientes/${patientId}`;

  const hasM2 = modulosActivos.includes("M2_anamnesis");
  const hasM5 = modulosActivos.includes("M5_consentimiento");
  const hasM7 = modulosActivos.includes("M7_prescripciones");
  const hasM8 = modulosActivos.includes("M8_examenes");
  const puedePrescribir = profesionalActivo?.puede_prescribir ?? false;
  const puedeExamenes = profesionalActivo?.puede_indicar_examenes ?? false;
  const showCondicionales = (hasM7 && puedePrescribir) || (hasM8 && puedeExamenes);
  const canSeeAudit = ["admin", "director", "superadmin"].includes(rol);

  const overflowItems = [
    { id: "signos-vitales", label: "Signos vitales", Icon: Activity, href: `${base}/anamnesis`, show: hasM2 },
    { id: "exportar-pdf", label: "Exportar PDF", Icon: Download, href: `${base}/exportar-pdf`, show: true },
    { id: "fhir", label: "FHIR", Icon: Code, href: `${base}/fhir`, show: true },
    { id: "auditoria", label: "Auditoría", Icon: Shield, href: `${base}/auditoria`, show: canSeeAudit },
  ].filter((i) => i.show);

  return (
    <>
      <div
        role="toolbar"
        aria-label="Acciones del paciente"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 20px",
          background: "var(--color-surface-1, #FFFFFF)",
          borderBottom: "0.5px solid var(--color-kp-border, #E2E8F0)",
        }}
      >
        {/* Nivel 1 — CTA principal */}
        {primaryAction && (
          <>
            <div style={{ flexShrink: 0 }}>{primaryAction}</div>
            <div style={divider} />
          </>
        )}

        {/* Nivel 2 — Acciones clínicas frecuentes */}
        <button
          type="button"
          onClick={() => setQuickNoteOpen(true)}
          style={chipBase}
          className="hover:border-kp-accent hover:text-kp-accent"
        >
          <IconBox><FileEdit style={{ width: 12, height: 12 }} /></IconBox>
          Nota rápida
        </button>

        {hasM2 && (
          <Link
            href={`${base}/anamnesis`}
            style={chipBase}
            className="hover:border-kp-accent hover:text-kp-accent"
          >
            <IconBox><ClipboardList style={{ width: 12, height: 12 }} /></IconBox>
            Anamnesis
          </Link>
        )}

        {hasM5 && (
          <Link
            href={`${base}/consentimiento`}
            style={chipBase}
            className="hover:border-kp-accent hover:text-kp-accent"
          >
            <IconBox><FileSignature style={{ width: 12, height: 12 }} /></IconBox>
            Consentimiento
          </Link>
        )}

        {/* Nivel 3 — Acciones condicionales (M7/M8) */}
        {showCondicionales && (
          <>
            <div style={divider} />
            {hasM7 && puedePrescribir && (
              <Link
                href={`${base}`}
                style={chipCondicional}
                className="hover:border-kp-primary hover:text-kp-primary"
                title="Crear prescripción"
              >
                <IconBox><Pill style={{ width: 12, height: 12 }} /></IconBox>
                Prescripción
              </Link>
            )}
            {hasM8 && puedeExamenes && (
              <Link
                href={`${base}`}
                style={chipCondicional}
                className="hover:border-kp-primary hover:text-kp-primary"
                title="Crear orden de examen"
              >
                <IconBox><Microscope style={{ width: 12, height: 12 }} /></IconBox>
                Orden examen
              </Link>
            )}
          </>
        )}

        {/* Overflow — acciones poco frecuentes */}
        <div ref={overflowRef} style={{ position: "relative", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setOverflowOpen((p) => !p)}
            style={chipBase}
            className="hover:border-kp-accent hover:text-kp-accent"
            aria-label="Más acciones"
            aria-expanded={overflowOpen}
          >
            <MoreHorizontal style={{ width: 12, height: 12 }} />
          </button>

          {overflowOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--color-surface-1, #FFFFFF)",
                border: "0.5px solid var(--color-kp-border, #E2E8F0)",
                borderRadius: 8,
                padding: 4,
                minWidth: 170,
                zIndex: 50,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {overflowItems.map(({ id, label, Icon, href }) => (
                <Link
                  key={id}
                  href={href}
                  onClick={() => setOverflowOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--color-ink-2, #475569)",
                    textDecoration: "none",
                  }}
                  className="hover:bg-surface-0 hover:text-kp-accent transition-colors"
                >
                  <Icon style={{ width: 13, height: 13 }} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {quickNoteOpen && (
        <QuickNoteModal
          patientId={patientId}
          onClose={() => setQuickNoteOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
