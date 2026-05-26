import Link from "next/link";
import { Pencil, Download } from "lucide-react";
import { calculateAge, formatRut } from "@/lib/utils";
import type { Patient } from "@/types";

interface PatientHeaderProps {
  patient: Patient;
  hasConsent: boolean;
  patientId?: string;
}

export function PatientHeader({ patient, hasConsent, patientId }: PatientHeaderProps) {
  const initials =
    `${patient.nombre?.charAt(0) ?? ""}${patient.apellido_paterno?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  const fullName =
    [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";

  const age = calculateAge(patient.fecha_nacimiento);

  const previsionLabel =
    patient.prevision?.tipo === "FONASA"
      ? `FONASA ${patient.prevision.tramo || ""}`.trim()
      : patient.prevision?.tipo === "Isapre"
        ? patient.prevision.isapre || "Isapre"
        : patient.prevision?.tipo === "Particular"
          ? "Particular"
          : null;

  const sexDisplay =
    patient.sexo_registral === "M"
      ? "M"
      : patient.sexo_registral === "F"
        ? "F"
        : null;

  const isEgresado = patient.estado_clinico === "egresado";

  return (
    <div
      style={{
        background: "var(--color-surface-1, #FFFFFF)",
        borderBottom: "0.5px solid var(--color-kp-border, #E2E8F0)",
        padding: "16px 20px",
      }}
      className="flex items-center gap-3"
    >
      {/* Avatar 44×44 */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--color-kp-accent-xs, #E6FAF9)",
          color: "var(--color-kp-primary-deep, #004545)",
          fontWeight: 600,
          fontSize: 15,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Info — flex: 1 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: name + status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-ink-1, #1E293B)",
              lineHeight: 1.3,
            }}
            className="truncate"
          >
            {fullName}
          </span>

          {isEgresado ? (
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                background: "var(--color-kp-secondary-lt, #FEF3E2)",
                color: "var(--color-kp-secondary, #F5A623)",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              Egresado
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                background: "var(--color-kp-success-lt, #DCFCE7)",
                color: "var(--color-kp-success, #16A34A)",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              Activo
            </span>
          )}

          {hasConsent && (
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                background: "var(--color-kp-info-lt, #DBEAFE)",
                color: "var(--color-kp-info, #2563EB)",
                padding: "2px 6px",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              CI firmado
            </span>
          )}
        </div>

        {/* Line 2: RUT · age · sex · prevision · ocupacion */}
        <div
          style={{
            fontSize: 11,
            color: "var(--color-ink-3, #94A3B8)",
            marginTop: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: "0 0",
            alignItems: "center",
          }}
        >
          {patient.rut && (
            <>
              <span
                className="font-mono-clinical"
                style={{ color: "var(--color-ink-3, #94A3B8)" }}
              >
                {formatRut(patient.rut)}
              </span>
              {(age !== null || sexDisplay || previsionLabel || patient.ocupacion) && (
                <span style={{ margin: "0 4px" }}> · </span>
              )}
            </>
          )}
          {age !== null && (
            <>
              <span>{age} años</span>
              {(sexDisplay || previsionLabel || patient.ocupacion) && (
                <span style={{ margin: "0 4px" }}> · </span>
              )}
            </>
          )}
          {sexDisplay && (
            <>
              <span>{sexDisplay}</span>
              {(previsionLabel || patient.ocupacion) && (
                <span style={{ margin: "0 4px" }}> · </span>
              )}
            </>
          )}
          {previsionLabel && (
            <>
              <span>{previsionLabel}</span>
              {patient.ocupacion && (
                <span style={{ margin: "0 4px" }}> · </span>
              )}
            </>
          )}
          {patient.ocupacion && <span>{patient.ocupacion}</span>}
        </div>
      </div>

      {/* Actions — flex-shrink: 0 */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
        {patientId && (
          <Link
            href={`/dashboard/pacientes/${patientId}/editar`}
            title="Editar datos del paciente"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "0.5px solid var(--color-kp-border, #E2E8F0)",
              color: "var(--color-ink-2, #475569)",
              background: "transparent",
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            className="hover:border-kp-accent hover:text-kp-accent"
          >
            <Pencil style={{ width: 13, height: 13 }} />
            Editar
          </Link>
        )}

        {patientId && (
          <Link
            href={`/dashboard/pacientes/${patientId}/exportar-pdf`}
            title="Exportar PDF"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              border: "0.5px solid var(--color-kp-border, #E2E8F0)",
              color: "var(--color-ink-3, #94A3B8)",
              background: "transparent",
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            className="hover:border-kp-accent hover:text-kp-accent"
          >
            <Download style={{ width: 14, height: 14 }} />
          </Link>
        )}
      </div>
    </div>
  );
}
