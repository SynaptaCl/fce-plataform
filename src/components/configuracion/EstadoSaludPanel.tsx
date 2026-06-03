import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ValidationResult, ValidationIssue } from "@/lib/onboarding/validate-clinica";

// ── Mapeo código → sección ────────────────────────────────────────────────────

const SECTION_CODES: Record<string, string[]> = {
  "Config FCE": [
    "clinica_no_existe",
    "config_fce_no_existe",
    "especialidades_vacias",
    "especialidad_invalida",
  ],
  Profesionales: [
    "sin_profesionales",
    "profesional_especialidad_invalida",
    "prescriptor_sin_registro",
    "m7_sin_prescriptores",
    "m8_sin_indicadores_examenes",
    "profesional_sin_registro",
    "especialidad_sin_profesional",
    "profesional_sin_admin_user",
  ],
  Servicios: ["modulos_solo_base"],
  Branding: ["sin_branding"],
};

const SECTION_ORDER = ["Config FCE", "Profesionales", "Servicios", "Branding"];

function getSectionForCode(code: string): string {
  for (const [section, codes] of Object.entries(SECTION_CODES)) {
    if (codes.includes(code)) return section;
  }
  return "Config FCE";
}

function groupBySection(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  const grouped: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    const section = getSectionForCode(issue.codigo);
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(issue);
  }
  return grouped;
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  type,
  idx,
}: {
  issue: ValidationIssue;
  type: "bloqueo" | "advertencia";
  idx: number;
}) {
  const isBloqueo = type === "bloqueo";
  return (
    <div
      key={`${issue.codigo}-${idx}`}
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 8,
        background: isBloqueo ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)",
        border: `1px solid ${isBloqueo ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.28)"}`,
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {isBloqueo ? (
          <XCircle size={15} style={{ color: "var(--color-kp-danger, #ef4444)" }} />
        ) : (
          <AlertTriangle size={15} style={{ color: "var(--color-kp-warning, #f59e0b)" }} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-ink-1, #1E293B)",
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          {issue.mensaje}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-ink-2, #475569)",
            margin: "4px 0 0 0",
            lineHeight: 1.45,
          }}
        >
          {issue.accionSugerida}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  bloqueos,
  advertencias,
}: {
  title: string;
  bloqueos: ValidationIssue[];
  advertencias: ValidationIssue[];
}) {
  const allClear = bloqueos.length === 0 && advertencias.length === 0;
  const hasBloqueos = bloqueos.length > 0;

  return (
    <div
      style={{
        background: "var(--color-surface-1, #ffffff)",
        borderRadius: 12,
        border: "1px solid var(--color-kp-border, #E2E8F0)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          borderBottom: allClear ? "none" : "1px solid var(--color-kp-border, #E2E8F0)",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {allClear ? (
            <CheckCircle2 size={15} style={{ color: "var(--color-kp-success, #16a34a)", flexShrink: 0 }} />
          ) : hasBloqueos ? (
            <XCircle size={15} style={{ color: "var(--color-kp-danger, #ef4444)", flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={15} style={{ color: "var(--color-kp-warning, #f59e0b)", flexShrink: 0 }} />
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-1, #1E293B)",
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {allClear && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-kp-success, #16a34a)",
              }}
            >
              OK
            </span>
          )}
          {hasBloqueos && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-kp-danger, #ef4444)",
                background: "rgba(239,68,68,0.08)",
                padding: "2px 8px",
                borderRadius: 100,
              }}
            >
              {bloqueos.length} bloqueo{bloqueos.length > 1 ? "s" : ""}
            </span>
          )}
          {advertencias.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-kp-warning, #f59e0b)",
                background: "rgba(245,158,11,0.09)",
                padding: "2px 8px",
                borderRadius: 100,
              }}
            >
              {advertencias.length} advertencia{advertencias.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Issue list */}
      {!allClear && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {bloqueos.map((issue, i) => (
            <IssueCard key={`b-${issue.codigo}-${i}`} issue={issue} type="bloqueo" idx={i} />
          ))}
          {advertencias.map((issue, i) => (
            <IssueCard key={`a-${issue.codigo}-${i}`} issue={issue} type="advertencia" idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Props públicas ─────────────────────────────────────────────────────────────

interface EstadoSaludPanelProps {
  result: ValidationResult;
  clinicaNombre: string;
}

// ── Componente principal ───────────────────────────────────────────────────────

export function EstadoSaludPanel({ result, clinicaNombre }: EstadoSaludPanelProps) {
  const { ready, bloqueos, advertencias } = result;
  const bloqueosBySection = groupBySection(bloqueos);
  const advertenciasBySection = groupBySection(advertencias);

  const summaryBg = ready
    ? "rgba(22,163,74,0.06)"
    : bloqueos.length > 0
      ? "rgba(239,68,68,0.05)"
      : "rgba(245,158,11,0.05)";
  const summaryBorder = ready
    ? "rgba(22,163,74,0.35)"
    : bloqueos.length > 0
      ? "rgba(239,68,68,0.3)"
      : "rgba(245,158,11,0.35)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Banner de estado global */}
      <div
        style={{
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: summaryBg,
          border: `1px solid ${summaryBorder}`,
        }}
      >
        {ready ? (
          <CheckCircle2
            size={22}
            style={{ color: "var(--color-kp-success, #16a34a)", flexShrink: 0, marginTop: 1 }}
          />
        ) : bloqueos.length > 0 ? (
          <XCircle
            size={22}
            style={{ color: "var(--color-kp-danger, #ef4444)", flexShrink: 0, marginTop: 1 }}
          />
        ) : (
          <AlertTriangle
            size={22}
            style={{ color: "var(--color-kp-warning, #f59e0b)", flexShrink: 0, marginTop: 1 }}
          />
        )}
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--color-ink-1, #1E293B)",
              lineHeight: 1.4,
            }}
          >
            {ready
              ? `${clinicaNombre} está lista para producción`
              : bloqueos.length > 0
                ? `${clinicaNombre} tiene ${bloqueos.length} bloqueo${bloqueos.length > 1 ? "s" : ""} que impide${bloqueos.length > 1 ? "n" : ""} el go-live`
                : `${clinicaNombre} tiene ${advertencias.length} advertencia${advertencias.length > 1 ? "s" : ""} por revisar`}
          </div>
          {!ready && (
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-2, #475569)",
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              {bloqueos.length > 0
                ? "Resolver los bloqueos antes de activar la clínica en producción."
                : "La clínica puede activarse, pero se recomienda resolver las advertencias."}
            </div>
          )}
        </div>
      </div>

      {/* Cards por sección */}
      {SECTION_ORDER.map((section) => (
        <SectionCard
          key={section}
          title={section}
          bloqueos={bloqueosBySection[section] ?? []}
          advertencias={advertenciasBySection[section] ?? []}
        />
      ))}
    </div>
  );
}
