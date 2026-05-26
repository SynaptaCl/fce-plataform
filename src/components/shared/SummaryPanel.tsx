import Link from "next/link";
import {
  Activity,
  CircleDot,
  Heart,
  ClipboardList,
  FileText,
  Pill,
  PlusCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Target,
} from "lucide-react";
import { getModeloDeEspecialidad } from "@/lib/modules/modelos";
import type { PatientSummary } from "@/app/actions/timeline";

interface SummaryPanelProps {
  summary: PatientSummary;
  patientId: string;
  especialidadesActivas: string[];
  resumenIASlot?: React.ReactNode;
}

// ── Section title component ────────────────────────────────────────────────

function SectionTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span style={{ color: "var(--color-ink-3, #94A3B8)" }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          color: "var(--color-ink-3, #94A3B8)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Interactive empty state ────────────────────────────────────────────────

function EmptyState({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "var(--color-ink-3, #94A3B8)",
        textDecoration: "none",
        cursor: "pointer",
      }}
      className="hover:text-kp-accent transition-colors"
    >
      <PlusCircle className="w-3 h-3" />
      {label}
    </Link>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        height: "0.5px",
        background: "var(--color-kp-border, #E2E8F0)",
        margin: "12px 0",
      }}
    />
  );
}

// ── SummaryPanel ───────────────────────────────────────────────────────────

export function SummaryPanel({
  summary,
  patientId,
  especialidadesActivas,
  resumenIASlot,
}: SummaryPanelProps) {
  const base = `/dashboard/pacientes/${patientId}`;

  const modelos = new Set(
    especialidadesActivas
      .map(getModeloDeEspecialidad)
      .filter((m) => m !== "ninguno")
  );
  const showCif = modelos.has("rehabilitacion") || modelos.size === 0;
  const showDiagnosticos = modelos.has("clinico_general");

  // M7 active if any especialidad maps to clinico_general (or explicitly check config)
  // We use especialidadesActivas to infer — if clinico_general model is active, M7 may be active.
  // The spec says "Only show if M7 is active in clinic config" — we check via modelos
  const showFarma = modelos.has("clinico_general");

  const hasRedFlags = summary.red_flags_activos.length > 0;

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        background: "var(--color-surface-1, #FFFFFF)",
        borderLeft: "0.5px solid var(--color-kp-border, #E2E8F0)",
        padding: 16,
        overflowY: "auto",
        maxHeight: "calc(100vh - 160px)",
      }}
    >
      {/* ── ResumenIA slot — first section if provided ── */}
      {resumenIASlot && (
        <div style={{ marginBottom: 16 }}>
          {resumenIASlot}
        </div>
      )}

      {/* ── Red Flags — always first if present ── */}
      {hasRedFlags && (
        <>
          <SectionTitle
            icon={<AlertTriangle className="w-3 h-3" />}
            label="Alertas Activas"
          />
          <div
            style={{
              background: "var(--color-kp-danger-lt, #FEE2E2)",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 4,
            }}
          >
            {summary.red_flags_activos.map((flag) => (
              <div
                key={flag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-kp-danger, #DC2626)",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--color-kp-danger, #DC2626)",
                    flexShrink: 0,
                  }}
                />
                {flag}
              </div>
            ))}
          </div>
          <Divider />
        </>
      )}

      {/* ── a) Últimos Signos Vitales ── */}
      <SectionTitle
        icon={<Activity className="w-3 h-3" />}
        label="Últimos Signos Vitales"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {(
          [
            {
              label: "PA",
              value: summary.vitales?.presion_arterial ?? null,
              unit: "mmHg",
            },
            {
              label: "FC",
              value:
                summary.vitales?.frecuencia_cardiaca != null
                  ? String(summary.vitales.frecuencia_cardiaca)
                  : null,
              unit: "bpm",
            },
            {
              label: "Temp",
              value:
                summary.vitales?.temperatura != null
                  ? String(summary.vitales.temperatura)
                  : null,
              unit: "°C",
            },
            {
              label: "SpO₂",
              value:
                summary.vitales?.spo2 != null
                  ? String(summary.vitales.spo2)
                  : null,
              unit: "%",
            },
          ] as { label: string; value: string | null; unit: string }[]
        ).map((cell) => (
          <div
            key={cell.label}
            style={{
              background: "var(--color-surface-0, #F1F5F9)",
              borderRadius: 6,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-ink-1, #1E293B)",
                lineHeight: 1.2,
              }}
              className="font-mono-clinical"
            >
              {cell.value ?? "—"}
            </p>
            <p style={{ fontSize: 10, color: "var(--color-ink-3, #94A3B8)" }}>
              {cell.label} {cell.unit}
            </p>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── b) Diagnósticos CIF (rehabilitacion model) ── */}
      {showCif && (
        <>
          <SectionTitle
            icon={<Target className="w-3 h-3" />}
            label="Diagnósticos CIF"
          />
          <div style={{ marginBottom: 4 }}>
            {summary.cif_activos > 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-ink-2, #475569)" }}>
                {summary.cif_activos} ítem{summary.cif_activos !== 1 ? "s" : ""}{" "}
                activo{summary.cif_activos !== 1 ? "s" : ""}
              </p>
            ) : (
              <EmptyState
                href={`${base}/encuentro`}
                label="Agregar diagnóstico CIF"
              />
            )}
          </div>
          <Divider />
        </>
      )}

      {/* ── c) Diagnósticos Activos (clinico_general model) ── */}
      {showDiagnosticos && (
        <>
          <SectionTitle
            icon={<CircleDot className="w-3 h-3" />}
            label="Diagnósticos Activos"
          />
          <div style={{ marginBottom: 4 }}>
            {summary.diagnosticos_recientes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {summary.diagnosticos_recientes.map((diag) => (
                  <div
                    key={diag}
                    style={{ display: "flex", alignItems: "flex-start", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--color-kp-accent, #00B0A8)",
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--color-ink-2, #475569)",
                      }}
                    >
                      {diag}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                href={`${base}/encuentro`}
                label="Agregar diagnóstico"
              />
            )}
          </div>
          <Divider />
        </>
      )}

      {/* ── d) Antecedentes ── */}
      <SectionTitle
        icon={<Heart className="w-3 h-3" />}
        label="Antecedentes"
      />
      <div style={{ marginBottom: 4 }}>
        {summary.antecedentes ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div style={{ fontSize: 12, color: "var(--color-ink-2, #475569)" }}>
              <span style={{ color: "var(--color-ink-3, #94A3B8)" }}>
                Mórbidos:{" "}
              </span>
              {summary.antecedentes.morbidos ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink-2, #475569)" }}>
              <span style={{ color: "var(--color-ink-3, #94A3B8)" }}>
                Alergias:{" "}
              </span>
              {summary.antecedentes.alergias ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink-2, #475569)" }}>
              <span style={{ color: "var(--color-ink-3, #94A3B8)" }}>
                Medicamentos:{" "}
              </span>
              {summary.antecedentes.medicamentos_habituales ?? "—"}
            </div>
          </div>
        ) : (
          <EmptyState href={`${base}/anamnesis`} label="Agregar antecedentes" />
        )}
      </div>

      <Divider />

      {/* ── e) Motivo de Consulta ── */}
      <SectionTitle
        icon={<ClipboardList className="w-3 h-3" />}
        label="Motivo de Consulta"
      />
      <div
        style={{
          background: "var(--color-surface-0, #F1F5F9)",
          borderRadius: 6,
          padding: "8px 10px",
          marginBottom: 4,
        }}
      >
        {summary.motivo_consulta ? (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-2, #475569)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 5,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {summary.motivo_consulta}
          </p>
        ) : (
          <EmptyState
            href={`${base}/anamnesis`}
            label="Agregar motivo de consulta"
          />
        )}
      </div>

      <Divider />

      {/* ── f) Plan Actual ── */}
      <SectionTitle
        icon={<FileText className="w-3 h-3" />}
        label="Plan Actual"
      />
      <div
        style={{
          background: "var(--color-surface-0, #F1F5F9)",
          borderRadius: 6,
          padding: "8px 10px",
          marginBottom: 4,
        }}
      >
        {summary.plan_actual ? (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-2, #475569)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {summary.plan_actual}
          </p>
        ) : (
          <EmptyState href={`${base}/anamnesis`} label="Agregar plan actual" />
        )}
      </div>

      <Divider />

      {/* ── g) Indicaciones Farmacológicas (M7 / clinico_general only) ── */}
      {showFarma && (
        <>
          <SectionTitle
            icon={<Pill className="w-3 h-3" />}
            label="Indicaciones Farmacológicas"
          />
          <div style={{ marginBottom: 4 }}>
            {summary.indicaciones_farmacologicas.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {summary.indicaciones_farmacologicas.slice(0, 5).map(
                  (ind, i) => (
                    <div
                      key={`${ind.nombre}-${i}`}
                      style={{ fontSize: 12 }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--color-ink-2, #475569)",
                        }}
                      >
                        {ind.nombre}
                      </span>
                      {ind.presentacion && (
                        <span
                          style={{
                            color: "var(--color-ink-3, #94A3B8)",
                          }}
                        >
                          {" "}
                          · {ind.presentacion}
                        </span>
                      )}
                    </div>
                  )
                )}
                {summary.indicaciones_farmacologicas.length > 5 && (
                  <Link
                    href="#clinical-timeline"
                    style={{
                      fontSize: 11,
                      color: "var(--color-kp-accent, #00B0A8)",
                      textDecoration: "none",
                    }}
                    className="hover:underline"
                  >
                    Ver todas ({summary.indicaciones_farmacologicas.length})
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState
                href={`${base}/encuentro`}
                label="Agregar indicación"
              />
            )}
          </div>
          <Divider />
        </>
      )}

      {/* ── Próxima Sesión ── */}
      {summary.proxima_sesion && (
        <>
          <SectionTitle
            icon={<Calendar className="w-3 h-3" />}
            label="Próxima Sesión"
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-kp-primary, #006B6B)",
              background: "var(--color-kp-accent-xs, #E6FAF9)",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            <Clock
              className="w-3 h-3"
              style={{ color: "var(--color-kp-accent, #00B0A8)", flexShrink: 0 }}
            />
            {summary.proxima_sesion}
          </div>
        </>
      )}
    </div>
  );
}
