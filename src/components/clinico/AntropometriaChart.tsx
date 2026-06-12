"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import type { AntropometriaRecord, ModoAntropometria } from "@/types/antropometria";
import { getBandaLimites } from "@/lib/nutricion/atalah";

// recharts no resuelve CSS vars — hex hardcoded
const COLOR_PESO  = "#00B0A8";
const COLOR_IMC   = "#F5A623";
const COLOR_ZSCORE = "#6366F1";

interface Props {
  data: AntropometriaRecord[];
  modo?: ModoAntropometria;
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "short",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// ── Adulto: peso + IMC ────────────────────────────────────────────────────────

interface DataPointAdulto {
  fecha: string;
  peso: number;
  imc: number | null;
}

function ChartAdulto({ puntos }: { puntos: DataPointAdulto[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={puntos} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} />
        <YAxis
          yAxisId="peso"
          orientation="left"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
          width={40}
          label={{ value: "kg", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }}
        />
        <YAxis
          yAxisId="imc"
          orientation="right"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
          width={36}
          label={{ value: "IMC", angle: 90, position: "insideRight", fontSize: 10, fill: "#94A3B8" }}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line yAxisId="peso" type="monotone" dataKey="peso" name="Peso (kg)"
          stroke={COLOR_PESO} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
        <Line yAxisId="imc" type="monotone" dataKey="imc" name="IMC"
          stroke={COLOR_IMC} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Pediátrico: z-score IMC/edad con bandas OMS ───────────────────────────────

interface DataPointZScore {
  fecha: string;
  z: number | null;
}

function ChartPediatrico({ puntos }: { puntos: DataPointZScore[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs px-1" style={{ color: "#6366F1" }}>
        Z-score IMC/edad (OMS) — bandas de referencia: rojo ±3, naranja ±2, verde 0
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={puntos} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} />
          <YAxis
            domain={[-4, 4]}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            width={28}
            tickFormatter={(v: number) => v > 0 ? `+${v}` : `${v}`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          {/* Zona normal: -2 a +2 */}
          <ReferenceArea y1={-2} y2={2} fill="#22C55E" fillOpacity={0.08} />
          {/* Zona riesgo: -3 a -2 y +2 a +3 */}
          <ReferenceArea y1={-3} y2={-2} fill="#F97316" fillOpacity={0.10} />
          <ReferenceArea y1={2}  y2={3}  fill="#F97316" fillOpacity={0.10} />
          {/* Líneas de referencia */}
          <ReferenceLine y={0}  stroke="#22C55E" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "0", position: "right", fontSize: 9, fill: "#22C55E" }} />
          <ReferenceLine y={-2} stroke="#F97316" strokeDasharray="4 2" strokeWidth={1}   label={{ value: "-2", position: "right", fontSize: 9, fill: "#F97316" }} />
          <ReferenceLine y={2}  stroke="#F97316" strokeDasharray="4 2" strokeWidth={1}   label={{ value: "+2", position: "right", fontSize: 9, fill: "#F97316" }} />
          <ReferenceLine y={-3} stroke="#EF4444" strokeDasharray="2 2" strokeWidth={1}   label={{ value: "-3", position: "right", fontSize: 9, fill: "#EF4444" }} />
          <ReferenceLine y={3}  stroke="#EF4444" strokeDasharray="2 2" strokeWidth={1}   label={{ value: "+3", position: "right", fontSize: 9, fill: "#EF4444" }} />
          <Line type="monotone" dataKey="z" name="Z-score IMC/edad"
            stroke={COLOR_ZSCORE} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Gestacional: IMC con bandas Atalah ────────────────────────────────────────

interface DataPointGestacional {
  semana: number;
  imc: number | null;
  bandaInf?: number;
  bandaSup?: number;
}

function ChartGestacional({ puntos }: { puntos: DataPointGestacional[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs px-1" style={{ color: "#92400E" }}>
        IMC gestacional — banda verde = rango Atalah/MINSAL
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={puntos} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="semana"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            label={{ value: "Semana", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#94A3B8" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} width={36}
            label={{ value: "IMC", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="bandaInf" name="Límite inf."
            stroke="#22C55E" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
          <Line type="monotone" dataKey="bandaSup" name="Límite sup."
            stroke="#22C55E" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
          <Line type="monotone" dataKey="imc" name="IMC actual"
            stroke={COLOR_IMC} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────────────────────

export function AntropometriaChart({ data, modo }: Props) {
  const sorted = [...data].sort((a, b) => a.registrado_at.localeCompare(b.registrado_at));

  if (sorted.length < 2) {
    return (
      <p className="text-sm text-center py-6" style={{ color: "var(--color-ink-3)" }}>
        Se necesitan al menos 2 registros para mostrar el gráfico de evolución.
      </p>
    );
  }

  // Modo pediátrico — mostrar z-score si disponible
  if (modo === "pediatrico" || sorted.some((r) => r.zscore_imc != null)) {
    const puntos: DataPointZScore[] = sorted.map((r) => ({
      fecha: formatFecha(r.registrado_at),
      z:     r.zscore_imc ?? null,
    }));
    if (puntos.some((p) => p.z !== null)) return <ChartPediatrico puntos={puntos} />;
  }

  // Modo gestacional — mostrar IMC vs semana con bandas Atalah
  if (modo === "gestacional" || sorted.some((r) => r.semana_gestacional != null)) {
    const puntos: DataPointGestacional[] = sorted
      .filter((r) => r.semana_gestacional != null && r.imc != null)
      .map((r) => {
        const semana = r.semana_gestacional!;
        const imc_pre = r.imc_pregestacional;
        let bandaInf: number | undefined;
        let bandaSup: number | undefined;
        if (imc_pre != null) {
          try {
            const limites = getBandaLimites(imc_pre, semana);
            bandaInf = limites.inferior;
            bandaSup = limites.superior;
          } catch { /* skip */ }
        }
        return { semana, imc: r.imc ?? null, bandaInf, bandaSup };
      });
    if (puntos.length >= 2) return <ChartGestacional puntos={puntos} />;
  }

  // Adulto (default)
  const puntos: DataPointAdulto[] = sorted.map((r) => ({
    fecha: formatFecha(r.registrado_at),
    peso:  r.peso_kg,
    imc:   r.imc ?? null,
  }));
  return <ChartAdulto puntos={puntos} />;
}
