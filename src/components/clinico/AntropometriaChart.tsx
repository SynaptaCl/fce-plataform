"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { AntropometriaRecord } from "@/types/antropometria";

// recharts no resuelve CSS vars — hex hardcoded
const COLOR_PESO = "#00B0A8";
const COLOR_IMC  = "#F5A623";

interface Props {
  data: AntropometriaRecord[];
}

interface DataPoint {
  fecha: string;
  peso: number;
  imc: number | null;
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

export function AntropometriaChart({ data }: Props) {
  const puntos: DataPoint[] = [...data]
    .sort((a, b) => a.registrado_at.localeCompare(b.registrado_at))
    .map((r) => ({
      fecha: formatFecha(r.registrado_at),
      peso:  r.peso_kg,
      imc:   r.imc ?? null,
    }));

  if (puntos.length < 2) {
    return (
      <p className="text-sm text-center py-6" style={{ color: "var(--color-ink-3)" }}>
        Se necesitan al menos 2 registros para mostrar el gráfico de evolución.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={puntos} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
        />
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
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="peso"
          type="monotone"
          dataKey="peso"
          name="Peso (kg)"
          stroke={COLOR_PESO}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
        <Line
          yAxisId="imc"
          type="monotone"
          dataKey="imc"
          name="IMC"
          stroke={COLOR_IMC}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
