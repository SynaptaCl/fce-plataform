"use client";

import { calculateAge } from "@/lib/utils";
import { getLabelZona } from "@/lib/estetica/zonas";
import type { FichaEsteticaDetalle, FichaEsteticaFotoConUrl } from "@/types/estetica";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

const COLOR = {
  ink: "#1E293B",
  muted: "#475569",
  label: "#64748B",
  border: "#E2E8F0",
  bgLight: "#F8FAFC",
  white: "#ffffff",
};

interface Props {
  ficha: FichaEsteticaDetalle;
  paciente: Patient;
  clinica: ClinicaConfig;
  fotos: FichaEsteticaFotoConUrl[];
}

export function FichaEsteticaPdfView({ ficha, paciente, clinica, fotos }: Props) {
  const fullName = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
    .filter(Boolean)
    .join(" ");
  const age = calculateAge(paciente.fecha_nacimiento);
  const fecha = ficha.firmado_at
    ? new Date(ficha.firmado_at).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });

  const antes = fotos.find((f) => f.tipo === "antes");
  const despues = fotos.find((f) => f.tipo === "despues");

  return (
    <div
      id="ficha-estetica-pdf"
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
      <h1 style={{ fontSize: "16px", marginBottom: "4px" }}>{clinica.nombreDisplay}</h1>
      <h2 style={{ fontSize: "14px", color: COLOR.muted, marginBottom: "16px" }}>
        Ficha Estética — {ficha.tipo_ficha}
      </h2>

      <table style={{ width: "100%", marginBottom: "16px", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td style={{ color: COLOR.label, width: "30%" }}>Paciente</td>
            <td>{fullName}{age !== null ? ` (${age} años)` : ""}</td>
          </tr>
          <tr>
            <td style={{ color: COLOR.label }}>Fecha</td>
            <td>{fecha}</td>
          </tr>
          {ficha.motivo && (
            <tr>
              <td style={{ color: COLOR.label }}>Motivo</td>
              <td>{ficha.motivo}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ fontSize: "12px", marginBottom: "8px" }}>Zonas tratadas</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ background: COLOR.bgLight }}>
            <th style={{ textAlign: "left", padding: "6px", border: `1px solid ${COLOR.border}` }}>Zona</th>
            <th style={{ textAlign: "left", padding: "6px", border: `1px solid ${COLOR.border}` }}>Producto</th>
            <th style={{ textAlign: "left", padding: "6px", border: `1px solid ${COLOR.border}` }}>Lote</th>
            <th style={{ textAlign: "left", padding: "6px", border: `1px solid ${COLOR.border}` }}>Dosis</th>
          </tr>
        </thead>
        <tbody>
          {ficha.zonas.map((z) => (
            <tr key={z.id}>
              <td style={{ padding: "6px", border: `1px solid ${COLOR.border}` }}>{getLabelZona(z.region, z.zona_codigo)}</td>
              <td style={{ padding: "6px", border: `1px solid ${COLOR.border}` }}>{z.producto_comercial ?? "—"}</td>
              <td style={{ padding: "6px", border: `1px solid ${COLOR.border}` }}>{z.lote ?? "—"}</td>
              <td style={{ padding: "6px", border: `1px solid ${COLOR.border}` }}>
                {z.dosis !== null ? `${z.dosis} ${z.unidad_dosis ?? ""}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(antes || despues) && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          {antes && (
            <div>
              <p style={{ color: COLOR.label, marginBottom: "4px" }}>Antes</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={antes.signedUrl} alt="Antes" style={{ width: "80mm", objectFit: "cover" }} />
            </div>
          )}
          {despues && (
            <div>
              <p style={{ color: COLOR.label, marginBottom: "4px" }}>Después</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={despues.signedUrl} alt="Después" style={{ width: "80mm", objectFit: "cover" }} />
            </div>
          )}
        </div>
      )}

      {ficha.observaciones_generales && (
        <div>
          <h3 style={{ fontSize: "12px", marginBottom: "4px" }}>Observaciones</h3>
          <p style={{ color: COLOR.muted }}>{ficha.observaciones_generales}</p>
        </div>
      )}
    </div>
  );
}
