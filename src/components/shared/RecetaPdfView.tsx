"use client";

import type { Prescripcion, MedicamentoPrescrito } from "@/types/prescripcion";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";
import { calculateAge } from "@/lib/utils";

// ── Helper functions ──────────────────────────────────────────────────────────

function formatFechaPrescripcion(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

function formatRutDisplay(rut: string | null): string {
  if (!rut) return "—";
  return rut; // already formatted from DB
}

function getFullName(p: Patient): string {
  return (
    [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "—"
  );
}

function formatVia(via: string): string {
  const MAP: Record<string, string> = {
    oral: "vía oral",
    topica: "vía tópica",
    intramuscular: "vía intramuscular",
    endovenosa: "vía endovenosa",
    subcutanea: "vía subcutánea",
    rectal: "vía rectal",
    oftalmica: "vía oftálmica",
    otica: "vía ótica",
    nasal: "vía nasal",
    vaginal: "vía vaginal",
    inhalatoria: "vía inhalatoria",
    sublingual: "vía sublingual",
    transdermica: "vía transdérmica",
    otra: "otra vía",
  };
  return MAP[via] ?? via;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RecetaPdfViewProps {
  prescripcion: Prescripcion;
  paciente: Patient;
  clinica: ClinicaConfig;
  textoLegalPie?: string;
}

export function RecetaPdfView({
  prescripcion,
  paciente,
  clinica,
  textoLegalPie,
}: RecetaPdfViewProps) {
  const age = calculateAge(paciente.fecha_nacimiento);

  return (
    <div
      id="receta-pdf"
      style={{
        width: "215.9mm",
        minHeight: "279.4mm",
        padding: "20mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "11pt",
        color: "#1E293B",
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      {/* --- HEADER --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "2px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {clinica.logoUrl && (
            <img
              src={clinica.logoUrl}
              alt="Logo"
              style={{ maxHeight: "50px", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "14pt",
              fontWeight: "bold",
              color: "#1E293B",
            }}
          >
            {clinica.nombreDisplay}
          </div>
        </div>
      </div>

      {/* --- TITLE --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "13pt",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#1E293B",
          }}
        >
          {prescripcion.tipo === "farmacologica"
            ? "Receta Médica Simple"
            : "Indicación Médica"}
        </div>
        <div
          style={{
            fontSize: "11pt",
            fontWeight: "600",
            color: "#475569",
          }}
        >
          {prescripcion.folio_display}
        </div>
      </div>

      {/* Fecha */}
      <div
        style={{
          fontSize: "9pt",
          color: "#64748B",
          marginBottom: "20px",
        }}
      >
        Fecha de emisión: {formatFechaPrescripcion(prescripcion.firmado_at)}
      </div>

      {/* --- DATOS DEL PACIENTE --- */}
      <div
        style={{
          backgroundColor: "#F8FAFC",
          borderRadius: "6px",
          padding: "12px 16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "9pt",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748B",
            marginBottom: "8px",
          }}
        >
          Datos del Paciente
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                style={{
                  width: "30%",
                  padding: "2px 0",
                  color: "#64748B",
                  fontSize: "10pt",
                }}
              >
                Nombre:
              </td>
              <td
                style={{
                  padding: "2px 0",
                  fontWeight: "600",
                  fontSize: "10pt",
                }}
              >
                {getFullName(paciente)}
              </td>
              <td
                style={{
                  width: "20%",
                  padding: "2px 0",
                  color: "#64748B",
                  fontSize: "10pt",
                }}
              >
                RUT:
              </td>
              <td
                style={{
                  padding: "2px 0",
                  fontWeight: "600",
                  fontSize: "10pt",
                }}
              >
                {formatRutDisplay(paciente.rut)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "2px 0",
                  color: "#64748B",
                  fontSize: "10pt",
                }}
              >
                Edad:
              </td>
              <td
                style={{
                  padding: "2px 0",
                  fontWeight: "600",
                  fontSize: "10pt",
                }}
              >
                {age !== null ? `${age} años` : "—"}
              </td>
              <td
                style={{
                  padding: "2px 0",
                  color: "#64748B",
                  fontSize: "10pt",
                }}
              >
                Previsión:
              </td>
              <td
                style={{
                  padding: "2px 0",
                  fontWeight: "600",
                  fontSize: "10pt",
                }}
              >
                {paciente.prevision?.tipo ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- DIAGNÓSTICO (if exists) --- */}
      {prescripcion.diagnostico_asociado && (
        <div
          style={{
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              fontSize: "9pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748B",
              marginBottom: "6px",
            }}
          >
            Diagnóstico
          </div>
          <div style={{ fontSize: "11pt" }}>{prescripcion.diagnostico_asociado}</div>
        </div>
      )}

      {/* --- Rp. SECTION (if farmacologica) --- */}
      {prescripcion.tipo === "farmacologica" &&
        Array.isArray(prescripcion.medicamentos) &&
        prescripcion.medicamentos.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "16pt",
                fontStyle: "italic",
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: "12px",
              }}
            >
              Rp.
            </div>
            {(prescripcion.medicamentos as MedicamentoPrescrito[]).map((med, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "16px",
                  paddingLeft: "16px",
                  borderLeft: "3px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {index + 1}. {med.principio_activo}
                  {med.nombre_comercial ? ` (${med.nombre_comercial})` : ""}{" "}
                  {med.presentacion}
                </div>
                <div
                  style={{
                    fontSize: "10pt",
                    color: "#475569",
                    marginBottom: "2px",
                  }}
                >
                  Tomar {med.dosis} {formatVia(med.via)}, {med.frecuencia}
                </div>
                <div
                  style={{
                    fontSize: "10pt",
                    color: "#475569",
                    marginBottom: "2px",
                  }}
                >
                  Por {med.duracion}
                </div>
                <div
                  style={{
                    fontSize: "10pt",
                    color: "#475569",
                    marginBottom: "2px",
                  }}
                >
                  Cantidad total: {med.cantidad_total}
                </div>
                {med.instrucciones && (
                  <div
                    style={{
                      fontSize: "10pt",
                      color: "#475569",
                      fontStyle: "italic",
                    }}
                  >
                    {med.instrucciones}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* --- INDICACIONES GENERALES --- */}
      {prescripcion.indicaciones_generales && (
        <div
          style={{
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              fontSize: "9pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748B",
              marginBottom: "8px",
            }}
          >
            Indicaciones Generales
          </div>
          <div
            style={{
              fontSize: "10pt",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
            }}
          >
            {prescripcion.indicaciones_generales}
          </div>
        </div>
      )}

      {/* --- FIRMA SECTION --- */}
      <div
        style={{
          marginTop: "30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {prescripcion.modo_firma === "canvas" && prescripcion.firma_canvas ? (
          <img
            src={prescripcion.firma_canvas}
            alt="Firma digital"
            style={{
              maxWidth: "200px",
              maxHeight: "80px",
              objectFit: "contain",
              marginBottom: "8px",
            }}
          />
        ) : (
          <div
            style={{
              width: "200px",
              height: "60px",
              marginBottom: "8px",
            }}
          />
        )}
        <div
          style={{
            width: "250px",
            borderTop: "1px solid #1E293B",
            paddingTop: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11pt", fontWeight: "600" }}>
            {prescripcion.prof_nombre_snapshot ?? "—"}
          </div>
          {prescripcion.prof_rut_snapshot && (
            <div style={{ fontSize: "9pt", color: "#64748B" }}>
              RUT: {prescripcion.prof_rut_snapshot}
            </div>
          )}
          {prescripcion.prof_registro_snapshot && (
            <div style={{ fontSize: "9pt", color: "#64748B" }}>
              {prescripcion.prof_tipo_registro_snapshot ?? "Reg."}:{" "}
              {prescripcion.prof_registro_snapshot}
            </div>
          )}
          {prescripcion.prof_especialidad_snapshot && (
            <div style={{ fontSize: "9pt", color: "#64748B" }}>
              {prescripcion.prof_especialidad_snapshot}
            </div>
          )}
        </div>
      </div>

      {/* --- FOOTER LEGAL --- */}
      <div
        style={{
          marginTop: "30px",
          paddingTop: "12px",
          borderTop: "1px solid #E2E8F0",
          fontSize: "7pt",
          color: "#94A3B8",
          textAlign: "center",
        }}
      >
        {textoLegalPie ??
          `Receta médica simple. No válida para psicotrópicos ni estupefacientes. Documento generado por FCE Synapta · ${prescripcion.folio_display}`}
      </div>
    </div>
  );
}
