import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  ClipboardList,
  Target,
  Clock,
  Calendar,
  Pencil,
  Heart,
  Pill,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getModeloDeEspecialidad } from "@/lib/modules/modelos";
import type { PatientSummary } from "@/app/actions/timeline";

interface SummaryPanelProps {
  summary: PatientSummary;
  patientId: string;
  especialidadesActivas: string[];
}

// ── Section wrapper ────────────────────────────────────────────────────────

function PanelSection({
  title,
  icon,
  children,
  className,
  editHref,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  editHref?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-kp-accent">{icon}</span>
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-wider flex-1">
          {title}
        </p>
        {editHref && (
          <Link
            href={editHref}
            className="text-ink-4 hover:text-kp-accent transition-colors"
            title={`Ir a ${title}`}
          >
            <Pencil className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ── SummaryPanel ───────────────────────────────────────────────────────────

export function SummaryPanel({ summary, patientId, especialidadesActivas }: SummaryPanelProps) {
  const hasRedFlags = summary.red_flags_activos.length > 0;
  const base = `/dashboard/pacientes/${patientId}`;

  const modelos = new Set(
    especialidadesActivas.map(getModeloDeEspecialidad).filter((m) => m !== "ninguno")
  );
  const showCif = modelos.has("rehabilitacion") || modelos.size === 0;
  const showDiagnosticos = modelos.has("clinico_general");

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Resumen Clínico
        </p>
      </div>

      <div className="p-4 space-y-4 divide-y divide-kp-border">
        {/* Red Flags — siempre primero si los hay */}
        {hasRedFlags && (
          <PanelSection
            title="Alertas Activas"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            editHref={`${base}/anamnesis`}
          >
            <div className="bg-kp-danger-lt rounded-lg p-2.5 space-y-1.5">
              {summary.red_flags_activos.map((flag) => (
                <div
                  key={flag}
                  className="flex items-center gap-1.5 text-xs font-medium text-kp-danger"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-kp-danger shrink-0" />
                  {flag}
                </div>
              ))}
            </div>
          </PanelSection>
        )}

        {/* Motivo de consulta */}
        <PanelSection
          title="Motivo de Consulta"
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          className={hasRedFlags ? "pt-4" : ""}
          editHref={`${base}/anamnesis`}
        >
          {summary.motivo_consulta ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-5">
              {summary.motivo_consulta}
            </p>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* Diagnósticos CIF — modelo rehabilitacion */}
        {showCif && (
          <PanelSection
            title="Diagnósticos CIF"
            icon={<Target className="w-3.5 h-3.5" />}
            className="pt-4"
          >
            {summary.cif_activos > 0 ? (
              <Badge variant="teal">{summary.cif_activos} ítems activos</Badge>
            ) : (
              <p className="text-xs text-ink-4 italic">Sin diagnósticos CIF</p>
            )}
          </PanelSection>
        )}

        {/* Diagnósticos — modelo clinico_general */}
        {showDiagnosticos && (
          <PanelSection
            title="Diagnósticos"
            icon={<Target className="w-3.5 h-3.5" />}
            className="pt-4"
          >
            {summary.diagnosticos_recientes.length > 0 ? (
              <div className="space-y-1">
                {summary.diagnosticos_recientes.map((diag) => (
                  <p key={diag} className="text-xs text-ink-2 leading-snug">
                    {diag}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-4 italic">Sin diagnósticos</p>
            )}
          </PanelSection>
        )}

        {/* Antecedentes */}
        <PanelSection
          title="Antecedentes"
          icon={<Heart className="w-3.5 h-3.5" />}
          className="pt-4"
          editHref={`${base}/anamnesis`}
        >
          {summary.antecedentes ? (
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-ink-3">Mórbidos: </span>
                <span className="text-ink-2">
                  {summary.antecedentes.morbidos ?? "Sin registro"}
                </span>
              </div>
              <div>
                <span className="text-ink-3">Alergias: </span>
                <span className="text-ink-2">
                  {summary.antecedentes.alergias ?? "Sin registro"}
                </span>
              </div>
              <div>
                <span className="text-ink-3">Medicamentos: </span>
                <span className="text-ink-2">
                  {summary.antecedentes.medicamentos_habituales ?? "Sin registro"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* Últimos signos vitales */}
        <PanelSection
          title="Últimos Signos Vitales"
          icon={<Activity className="w-3.5 h-3.5" />}
          className="pt-4"
          editHref={`${base}/anamnesis`}
        >
          {summary.vitales ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { label: "PA", value: summary.vitales.presion_arterial, unit: "mmHg" },
                  { label: "FC", value: summary.vitales.frecuencia_cardiaca, unit: "bpm" },
                  { label: "SpO₂", value: summary.vitales.spo2, unit: "%" },
                  { label: "T°", value: summary.vitales.temperatura, unit: "°C" },
                ] as { label: string; value: string | number | null | undefined; unit: string }[]
              )
                .filter((f) => f.value != null)
                .map((f) => (
                  <div
                    key={f.label}
                    className="bg-surface-0 rounded-lg px-2 py-1.5 text-center"
                  >
                    <p className="text-[0.55rem] font-bold text-ink-3 uppercase tracking-wide">
                      {f.label}
                    </p>
                    <p className="text-xs font-bold text-ink-1">
                      {String(f.value)}{" "}
                      <span className="text-[0.55rem] font-normal text-ink-3">
                        {f.unit}
                      </span>
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* Plan actual */}
        <PanelSection
          title="Plan Actual"
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          className="pt-4"
        >
          {summary.plan_actual ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-6">
              {summary.plan_actual}
            </p>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin plan registrado</p>
          )}
        </PanelSection>

        {/* Indicaciones farmacológicas */}
        <PanelSection
          title="Indicaciones Farmacológicas"
          icon={<Pill className="w-3.5 h-3.5" />}
          className="pt-4"
        >
          {summary.indicaciones_farmacologicas.length > 0 ? (
            <div className="space-y-1">
              {summary.indicaciones_farmacologicas.slice(0, 5).map((ind, i) => (
                <div key={`${ind.nombre}-${i}`} className="text-xs">
                  <span className="font-medium text-ink-2">{ind.nombre}</span>
                  {ind.presentacion && (
                    <span className="text-ink-3"> · {ind.presentacion}</span>
                  )}
                </div>
              ))}
              {summary.indicaciones_farmacologicas.length > 5 && (
                <Link
                  href="#clinical-timeline"
                  className="text-xs text-kp-accent hover:underline"
                >
                  Ver todas ({summary.indicaciones_farmacologicas.length})
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin indicaciones registradas</p>
          )}
        </PanelSection>

        {/* Próxima sesión */}
        <PanelSection
          title="Próxima Sesión"
          icon={<Calendar className="w-3.5 h-3.5" />}
          className="pt-4"
        >
          {summary.proxima_sesion ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-kp-primary bg-kp-accent-xs rounded-lg px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-kp-accent shrink-0" />
              {summary.proxima_sesion}
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">No agendada</p>
          )}
        </PanelSection>
      </div>
    </div>
  );
}
