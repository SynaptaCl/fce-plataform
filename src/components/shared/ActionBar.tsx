"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  Activity,
  FileSignature,
  ClipboardList,
  Download,
  Code,
} from "lucide-react";
import { useClinicaConfig } from "@/lib/modules/provider";
import { QuickNoteModal } from "@/components/clinico/QuickNoteModal";
import type { ModuleId } from "@/lib/modules/registry";

interface ActionBarProps {
  patientId: string;
}

interface Chip {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Navigation href — if set, renders as Link */
  href?: string;
  /** Click handler — if set (and no href), renders as button */
  onClick?: () => void;
  /** If true, renders with secondary/dashed styling */
  secondary?: boolean;
  /** If defined, chip only shows when this module is active */
  moduleId?: ModuleId;
}

/** Inline chip style base */
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

/** Secondary (FHIR) chip style override */
const chipSecondary: React.CSSProperties = {
  ...chipBase,
  borderStyle: "dashed",
  color: "var(--color-ink-3, #94A3B8)",
};

function ChipLink({
  chip,
}: {
  chip: Chip & { href: string };
}) {
  return (
    <Link
      href={chip.href}
      title={chip.label}
      style={chip.secondary ? chipSecondary : chipBase}
      className="hover:border-kp-accent hover:text-kp-accent"
    >
      <span style={{ width: 12, height: 12, display: "flex", alignItems: "center" }}>
        {chip.icon}
      </span>
      {chip.label}
    </Link>
  );
}

function ChipButton({
  chip,
}: {
  chip: Chip & { onClick: () => void };
}) {
  return (
    <button
      type="button"
      onClick={chip.onClick}
      title={chip.label}
      style={chip.secondary ? chipSecondary : chipBase}
      className="hover:border-kp-accent hover:text-kp-accent"
    >
      <span style={{ width: 12, height: 12, display: "flex", alignItems: "center" }}>
        {chip.icon}
      </span>
      {chip.label}
    </button>
  );
}

export function ActionBar({ patientId }: ActionBarProps) {
  const router = useRouter();
  const config = useClinicaConfig();
  const modulosActivos = config.modulosActivos;
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);

  const base = `/dashboard/pacientes/${patientId}`;

  const chips: Chip[] = [
    {
      id: "nota-rapida",
      label: "Nota rápida",
      icon: <FileEdit style={{ width: 12, height: 12 }} />,
      onClick: () => setQuickNoteOpen(true),
    },
    {
      id: "signos-vitales",
      label: "Signos vitales",
      icon: <Activity style={{ width: 12, height: 12 }} />,
      href: `${base}/anamnesis`,
      moduleId: "M2_anamnesis",
    },
    {
      id: "consentimiento",
      label: "Consentimiento",
      icon: <FileSignature style={{ width: 12, height: 12 }} />,
      href: `${base}/consentimiento`,
      moduleId: "M5_consentimiento",
    },
    {
      id: "anamnesis",
      label: "Anamnesis",
      icon: <ClipboardList style={{ width: 12, height: 12 }} />,
      href: `${base}/anamnesis`,
      moduleId: "M2_anamnesis",
    },
    {
      id: "exportar-pdf",
      label: "Exportar PDF",
      icon: <Download style={{ width: 12, height: 12 }} />,
      href: `${base}/exportar-pdf`,
    },
    {
      id: "fhir",
      label: "FHIR",
      icon: <Code style={{ width: 12, height: 12 }} />,
      href: `${base}/fhir`,
      secondary: true,
    },
  ];

  const visibleChips = chips.filter((chip) => {
    if (chip.moduleId && !modulosActivos.includes(chip.moduleId)) return false;
    return true;
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 20px",
          background: "var(--color-surface-1, #FFFFFF)",
          borderBottom: "0.5px solid var(--color-kp-border, #E2E8F0)",
        }}
        role="toolbar"
        aria-label="Acciones del paciente"
      >
        {visibleChips.map((chip) => {
          if (chip.href) {
            return <ChipLink key={chip.id} chip={{ ...chip, href: chip.href }} />;
          }
          if (chip.onClick) {
            return <ChipButton key={chip.id} chip={{ ...chip, onClick: chip.onClick }} />;
          }
          return null;
        })}
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
