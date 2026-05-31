"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PlanObjetivo, PlanProgreso } from "@/types/plan-intervencion";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ProgresoChartProps {
  objetivos: PlanObjetivo[];
  /** Progreso por objetivo: { [objetivoId]: PlanProgreso[] } */
  progresoPorObjetivo: Record<string, PlanProgreso[]>;
}

// ── Constantes ─────────────────────────────────────────────────────────────

// hex hardcoded — recharts no resuelve CSS vars en el motor SVG/canvas
const LINE_COLORS = ["#00B0A8", "#006B6B", "#F5A623", "#E53935", "#43A047"];

const GAS_TICKS = [-2, -1, 0, 1, 2];

const GAS_LABELS: Record<number, string> = {
  "-2": "−2 Muy por debajo",
  "-1": "−1 Por debajo",
  "0": "0 Esperado",
  "1": "+1 Sobre esperado",
  "2": "+2 Muy sobre",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function truncarLabel(descripcion: string, dominioLabel: string): string {
  const desc = descripcion.length > 20 ? descripcion.slice(0, 20) + "…" : descripcion;
  return `${desc} (${dominioLabel})`;
}

function formatFecha(isoDate: string): string {
  const d = new Date(isoDate);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function ProgresoChart({ objetivos, progresoPorObjetivo }: ProgresoChartProps) {
  // Filtrar objetivos que tienen al menos 1 registro de progreso
  const objetivosConDatos = objetivos.filter(
    (obj) => (progresoPorObjetivo[obj.id] ?? []).length > 0
  );

  if (objetivosConDatos.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-ink-3">
        Sin registros de progreso aún
      </div>
    );
  }

  // Construir un set de fechas ordenadas (eje X) desde todos los registros
  const todasLasFechas = Array.from(
    new Set(
      objetivosConDatos.flatMap(
        (obj) => progresoPorObjetivo[obj.id].map((p) => p.registrado_at)
      )
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Transformar a formato recharts: array de puntos { fecha, [objetivoId]: nivelGas }
  // DataPoint tiene fecha (string) + un valor numérico nullable por cada objetivo
  type DataPoint = { fecha: string } & { [objetivoId: string]: number | null | string };

  const chartData: DataPoint[] = todasLasFechas.map((fechaIso) => {
    const punto: DataPoint = { fecha: formatFecha(fechaIso) };
    for (const obj of objetivosConDatos) {
      const registros = progresoPorObjetivo[obj.id] ?? [];
      const match = registros.find((p) => p.registrado_at === fechaIso);
      punto[obj.id] = match !== undefined ? match.nivel_gas : null;
    }
    return punto;
  });

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />

          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
          />

          <YAxis
            domain={[-2, 2]}
            ticks={GAS_TICKS}
            tickFormatter={(v: number) => GAS_LABELS[v] ?? String(v)}
            tick={{ fontSize: 10, fill: "#475569" }}
            width={130}
          />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _name: any, props: any) => {
              const numValue = typeof value === "number" ? value : Number(value ?? 0);
              const nivel = GAS_LABELS[numValue] ?? String(value ?? "");
              const keyStr = String(props?.dataKey ?? "");
              const obj = objetivosConDatos.find((o) => o.id === keyStr);
              const nombreObj = obj
                ? truncarLabel(obj.descripcion, obj.dominio_label)
                : keyStr;
              return [nivel, nombreObj];
            }}
            labelStyle={{ fontSize: 11, color: "#1E293B" }}
            contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#E2E8F0" }}
          />

          <Legend
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(_value: any, entry: any) => {
              const obj = objetivosConDatos.find((o) => o.id === entry?.dataKey);
              return obj ? truncarLabel(obj.descripcion, obj.dominio_label) : (_value ?? "");
            }}
            wrapperStyle={{ fontSize: 11 }}
          />

          {objetivosConDatos.map((obj, idx) => (
            <Line
              key={obj.id}
              type="monotone"
              dataKey={obj.id}
              name={obj.id}
              stroke={LINE_COLORS[idx % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
