"use client";

import { calculateAge } from "@/lib/utils";
import type { OrdenExamen, ExamenIndicado } from "@/types/orden-examen";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

// Hardcoded hex — html2pdf.js does not support CSS variables
const COLOR = {
  ink: "#1E293B",
  muted: "#475569",
  label: "#64748B",
  border: "#E2E8F0",
  bgLight: "#F8FAFC",
  white: "#ffffff",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

const CATEGORIA_LABELS: Record<string, string> = {
  laboratorio: "LABORATORIO",
  imagenologia: "IMAGENOLOGÍA",
  procedimiento: "PROCEDIMIENTOS",
  otro: "OTROS",
};

const CATEGORIA_ORDER = ["laboratorio", "imagenologia", "procedimiento", "otro"];

function groupByCategoria(
  examenes: ExamenIndicado[]
): Map<string, ExamenIndicado[]> {
  const map = new Map<string, ExamenIndicado[]>();
  for (const cat of CATEGORIA_ORDER) {
    const items = examenes.filter((e) => e.categoria === cat);
    if (items.length > 0) map.set(cat, items);
  }
  // Examenes with unknown categories
  const known = new Set(CATEGORIA_ORDER);
  const rest = examenes.filter((e) => !known.has(e.categoria));
  if (rest.length > 0) {
    const prev = map.get("otro") ?? [];
    map.set("otro", [...prev, ...rest]);
  }
  return map;
}

interface Props {
  orden: OrdenExamen;
  paciente: Patient;
  clinica: ClinicaConfig;
}

export function OrdenExamenPdfView({ orden, paciente, clinica }: Props) {
  const fullName = [
    paciente.nombre,
    paciente.apellido_paterno,
    paciente.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  const age = calculateAge(paciente.fecha_nacimiento);

  const fechaEmision = orden.firmado_at
    ? new Date(orden.firmado_at).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const grouped = groupByCategoria(orden.examenes);

  let examCounter = 0;

  return (
    <div
      id="orden-examen-pdf"
      style={{
        width: "215.9mm",
        padding: "20mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "11px",
        color: COLOR.ink,
        background: COLOR.white,
        lineHeight: "1.5",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8px",
        }}
      >
        <div>
          {clinica.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinica.logoUrl}
              alt={clinica.nombreDisplay}
              style={{ maxHeight: "48px", maxWidth: "160px", objectFit: "contain" }}
            />
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "13px",
              color: COLOR.ink,
              margin: 0,
            }}
          >
            {clinica.nombreDisplay}
          </p>
        </div>
      </div>

      {/* Separator */}
      <hr style={{ borderColor: COLOR.border, marginBottom: "10px" }} />

      {/* ── Title row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
              color: COLOR.ink,
            }}
          >
            ORDEN DE EXÁMENES
          </p>
          {orden.prioridad === "urgente" && (
            <span
              style={{
                background: COLOR.redLight,
                color: COLOR.red,
                fontWeight: "bold",
                fontSize: "10px",
                padding: "2px 6px",
                border: `1px solid ${COLOR.red}`,
                borderRadius: "4px",
              }}
            >
              [URGENTE]
            </span>
          )}
        </div>
        <p style={{ fontSize: "11px", color: COLOR.label, margin: 0 }}>
          {orden.folio_display}
        </p>
      </div>

      {/* Date */}
      <p style={{ fontSize: "10px", color: COLOR.label, marginBottom: "12px" }}>
        Fecha: {fechaEmision}
      </p>

      {/* ── Patient section ── */}
      <div
        style={{
          background: COLOR.bgLight,
          border: `1px solid ${COLOR.border}`,
          borderRadius: "6px",
          padding: "10px 12px",
          marginBottom: "12px",
        }}
      >
        <p
          style={{
            fontWeight: "bold",
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: COLOR.label,
            marginBottom: "6px",
            margin: "0 0 6px 0",
          }}
        >
          DATOS DEL PACIENTE
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
          <span style={{ fontSize: "11px", color: COLOR.ink }}>
            <strong>Nombre:</strong> {fullName || "—"}
          </span>
          <span style={{ fontSize: "11px", color: COLOR.ink }}>
            <strong>RUT:</strong> {paciente.rut ?? "—"}
          </span>
          {age !== null && (
            <span style={{ fontSize: "11px", color: COLOR.ink }}>
              <strong>Edad:</strong> {age} años
            </span>
          )}
          {paciente.prevision && (
            <span style={{ fontSize: "11px", color: COLOR.ink }}>
              <strong>Previsión:</strong> {paciente.prevision.tipo}
            </span>
          )}
        </div>
      </div>

      {/* ── Diagnóstico ── */}
      {orden.diagnostico_presuntivo && (
        <div style={{ marginBottom: "12px" }}>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: COLOR.label,
              margin: "0 0 3px 0",
            }}
          >
            DIAGNÓSTICO PRESUNTIVO
          </p>
          <p style={{ fontSize: "11px", color: COLOR.ink, margin: 0 }}>
            {orden.diagnostico_presuntivo}
          </p>
        </div>
      )}

      {/* ── Examenes grouped by category ── */}
      <div style={{ marginBottom: "12px" }}>
        {Array.from(grouped.entries()).map(([categoria, examenes]) => (
          <div key={categoria} style={{ marginBottom: "10px" }}>
            {/* Category header */}
            <p
              style={{
                fontWeight: "bold",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: COLOR.muted,
                borderBottom: `1px solid ${COLOR.border}`,
                paddingBottom: "3px",
                margin: "0 0 6px 0",
              }}
            >
              {CATEGORIA_LABELS[categoria] ?? categoria.toUpperCase()}
            </p>

            {examenes.map((examen) => {
              examCounter += 1;
              const num = examCounter;
              return (
                <div
                  key={`${examen.codigo}-${num}`}
                  style={{
                    marginBottom: "8px",
                    paddingLeft: "12px",
                  }}
                >
                  {/* Nombre + urgente badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "11px",
                        color: COLOR.ink,
                      }}
                    >
                      {num}. {examen.nombre}
                    </span>
                    {examen.urgente && (
                      <span
                        style={{
                          background: COLOR.redLight,
                          color: COLOR.red,
                          fontWeight: "bold",
                          fontSize: "9px",
                          padding: "1px 5px",
                          border: `1px solid ${COLOR.red}`,
                          borderRadius: "3px",
                        }}
                      >
                        URG
                      </span>
                    )}
                  </div>

                  {/* Indicación clínica */}
                  <p
                    style={{
                      fontSize: "10px",
                      color: COLOR.muted,
                      margin: "0 0 2px 0",
                    }}
                  >
                    <strong style={{ color: COLOR.label }}>Indicación:</strong>{" "}
                    {examen.indicacion_clinica}
                  </p>

                  {/* Muestra requerida — only present on ExamenCatalogo; ExamenIndicado doesn't carry it */}

                  {/* Preparación */}
                  {examen.preparacion_paciente && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: COLOR.muted,
                        margin: "0 0 2px 0",
                      }}
                    >
                      <strong style={{ color: COLOR.label }}>
                        Preparación:
                      </strong>{" "}
                      {examen.preparacion_paciente}
                    </p>
                  )}

                  {/* Instrucciones */}
                  {examen.instrucciones && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: COLOR.muted,
                        margin: "0 0 2px 0",
                      }}
                    >
                      <strong style={{ color: COLOR.label }}>
                        Instrucciones:
                      </strong>{" "}
                      {examen.instrucciones}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Observaciones ── */}
      {orden.observaciones && (
        <div style={{ marginBottom: "16px" }}>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: COLOR.label,
              margin: "0 0 3px 0",
            }}
          >
            OBSERVACIONES
          </p>
          <p style={{ fontSize: "11px", color: COLOR.ink, margin: 0 }}>
            {orden.observaciones}
          </p>
        </div>
      )}

      {/* ── Signature ── */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: `1px solid ${COLOR.border}`,
        }}
      >
        {orden.modo_firma === "canvas" && orden.firma_canvas ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={orden.firma_canvas}
            alt="Firma digital"
            style={{ maxHeight: "60px", marginBottom: "6px" }}
          />
        ) : (
          <div
            style={{
              width: "200px",
              borderBottom: `1px solid ${COLOR.ink}`,
              marginBottom: "6px",
            }}
          />
        )}
        <p
          style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: COLOR.ink,
            margin: "0 0 2px 0",
          }}
        >
          {orden.prof_nombre_snapshot ?? ""}
        </p>
        {orden.prof_rut_snapshot && (
          <p style={{ fontSize: "10px", color: COLOR.muted, margin: "0 0 1px 0" }}>
            RUT: {orden.prof_rut_snapshot}
          </p>
        )}
        {orden.prof_registro_snapshot && (
          <p style={{ fontSize: "10px", color: COLOR.muted, margin: "0 0 1px 0" }}>
            {orden.prof_tipo_registro_snapshot ?? "Reg."}: {orden.prof_registro_snapshot}
          </p>
        )}
        {orden.prof_especialidad_snapshot && (
          <p style={{ fontSize: "10px", color: COLOR.muted, margin: 0 }}>
            {orden.prof_especialidad_snapshot}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <p
        style={{
          marginTop: "20px",
          fontSize: "9px",
          color: COLOR.label,
          textAlign: "center",
        }}
      >
        Documento generado por FCE Synapta · {orden.folio_display}
      </p>
    </div>
  );
}
