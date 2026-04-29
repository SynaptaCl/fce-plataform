'use client';

import { useState } from "react";
import { Stethoscope, Grid3x3, BarChart2, ClipboardList } from "lucide-react";
import { NotaClinicaForm } from "@/components/clinico/NotaClinicaForm";
import { InstrumentosPanel } from "@/components/clinico/InstrumentosPanel";
import { PlanTratamientoPanel } from "@/components/dental/PlanTratamientoPanel";
import { PeriogramaForm } from "@/components/dental/PeriogramaForm";
import { OdontogramaInteractivo } from "@/components/dental/OdontogramaInteractivo";
import type { Patient } from "@/types/patient";
import type { NotaClinica } from "@/types/nota-clinica";
import type { Periograma } from "@/types/periograma";
import type { PlanTratamiento, ProcedimientoCatalogo } from "@/types/plan-tratamiento";
import type { OdontogramaEntry } from "@/types";

type Tab = "odontograma" | "periograma" | "plan" | "nota";

interface DentalWorkspaceProps {
  paciente: Patient;
  encuentroId: string;
  especialidad: string;
  notaExistente: NotaClinica | null;
  periogramaExistente: Periograma | null;
  planInicial: PlanTratamiento | null;
  catalogo: ProcedimientoCatalogo[];
  piezasIniciales: OdontogramaEntry[];
  denticionInicial: "adulto" | "nino" | "mixta";
  encuentroFinalizado: boolean;
  readOnly: boolean;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "odontograma", label: "Odontograma",        icon: <Grid3x3 className="w-4 h-4" /> },
  { id: "periograma",  label: "Periograma",          icon: <BarChart2 className="w-4 h-4" /> },
  { id: "plan",        label: "Plan de tratamiento", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "nota",        label: "Nota clínica",        icon: <Stethoscope className="w-4 h-4" /> },
];

export function DentalWorkspace({
  paciente,
  encuentroId,
  especialidad,
  notaExistente,
  periogramaExistente,
  planInicial,
  catalogo,
  piezasIniciales,
  denticionInicial,
  encuentroFinalizado,
  readOnly,
}: DentalWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>("odontograma");

  return (
    <div className="rounded-xl border border-kp-border bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-kp-border">
        <div>
          <p className="text-xs font-semibold text-kp-accent uppercase tracking-wide">
            Módulo Odontológico
          </p>
          <h1 className="text-base font-semibold text-ink-1 mt-0.5">
            Encuentro dental — {especialidad}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {encuentroFinalizado ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-medium">
              Encuentro cerrado
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              En progreso
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-kp-border px-6 gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-kp-primary text-kp-primary"
                : "border-transparent text-ink-2 hover:text-ink-1 hover:border-kp-border",
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "odontograma" && (
          <OdontogramaInteractivo
            pacienteId={paciente.id}
            encuentroId={encuentroId}
            piezasIniciales={piezasIniciales}
            denticion={denticionInicial}
            readOnly={readOnly}
          />
        )}

        {activeTab === "periograma" && (
          <PeriogramaForm
            encuentroId={encuentroId}
            patientId={paciente.id}
            periogramaExistente={periogramaExistente}
            readOnly={readOnly}
          />
        )}

        {activeTab === "plan" && (
          <PlanTratamientoPanel
            planInicial={planInicial}
            patientId={paciente.id}
            encuentroId={encuentroId}
            catalogo={catalogo}
            readOnly={readOnly}
          />
        )}

        {activeTab === "nota" && (
          <div className="flex flex-col lg:flex-row gap-0">
            <div className="flex-1 lg:border-r border-kp-border lg:pr-6">
              <NotaClinicaForm
                encuentroId={encuentroId}
                patientId={paciente.id}
                notaExistente={notaExistente}
                readOnly={readOnly}
              />
            </div>
            <div className="w-full lg:w-80 xl:w-96 lg:pl-6 mt-6 lg:mt-0">
              <InstrumentosPanel
                encuentroId={encuentroId}
                patientId={paciente.id}
                especialidad={especialidad}
                encuentroFinalizado={encuentroFinalizado}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-0 flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-ink-3" />
      </div>
      <h3 className="text-sm font-semibold text-ink-1">{titulo}</h3>
      <p className="text-sm text-ink-3 max-w-sm">{descripcion}</p>
    </div>
  );
}
