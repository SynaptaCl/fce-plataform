"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PlanObjetivo, PlanProgreso } from "@/types/plan-intervencion";
import { formatTimestamp } from "@/lib/dates";

// ── Tipos ──────────────────────────────────────────────────────────────────

type ObjetivoConDisciplina = PlanObjetivo & { responsable_especialidad?: string | null };

interface ProgresoChartProps {
  objetivos: ObjetivoConDisciplina[];
  /** Progreso por objetivo: { [objetivoId]: PlanProgreso[] } */
  progresoPorObjetivo: Record<string, PlanProgreso[]>;
}

/** Fila del gráfico: `x` = instante (ms epoch) + un nivel GAS (o null) por objetivo. */
type DataPoint = { x: number } & { [objetivoId: string]: number | null };

// ── Constantes ─────────────────────────────────────────────────────────────

// hex hardcoded — recharts no resuelve CSS vars en el motor SVG/canvas
const LINE_COLORS = [
  "#00B0A8",
  "#E53935",
  "#F5A623",
  "#3B6FD4",
  "#43A047",
  "#8E44AD",
  "#006B6B",
  "#D81B60",
];

const GAS_TICKS = [-2, -1, 0, 1, 2];

const GAS_TICK_LABELS: Record<number, string> = {
  "-2": "−2 Muy por debajo",
  "-1": "−1 Por debajo",
  "0": "0 Esperado",
  "1": "+1 Sobre lo esperado",
  "2": "+2 Muy sobre lo esperado",
};

const DIA_MS = 24 * 60 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Disciplina responsable del objetivo; si no hay responsable cae al dominio. */
function disciplinaDe(obj: ObjetivoConDisciplina): string {
  return obj.responsable_especialidad?.trim() || obj.dominio_label;
}

function formatTick(ms: number): string {
  return formatTimestamp(new Date(ms), "numerica").slice(0, 5).replace("-", "/");
}

function formatTooltipFecha(ms: number): string {
  return formatTimestamp(new Date(ms), "larga");
}

// ── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string | null;
  color?: string;
}

function TooltipContenido({
  active,
  payload,
  label,
  objetivosPorId,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
  objetivosPorId: Record<string, ObjetivoConDisciplina>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entradas = payload.filter((e) => e.value !== null && e.value !== undefined);
  if (entradas.length === 0) return null;
  return (
    <div
      className="bg-white shadow-md"
      style={{
        maxWidth: 320,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #E2E8F0",
        fontSize: 11,
        color: "#1E293B",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{formatTooltipFecha(Number(label))}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entradas.map((e) => {
          const obj = objetivosPorId[String(e.dataKey)];
          if (!obj) return null;
          const nivel = Number(e.value);
          return (
            <div key={obj.id} style={{ display: "flex", gap: 6 }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: e.color,
                  marginTop: 3,
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontWeight: 600 }}>{disciplinaDe(obj)}</p>
                <p style={{ color: "#475569", whiteSpace: "normal" }}>{obj.descripcion}</p>
                <p style={{ fontWeight: 600 }}>GAS: {GAS_TICK_LABELS[nivel] ?? String(nivel)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente ─────────────────────────────────────────────────────────────

export function ProgresoChart({ objetivos, progresoPorObjetivo }: ProgresoChartProps) {
  // Solo objetivos con al menos 1 registro de progreso
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

  const objetivosPorId: Record<string, ObjetivoConDisciplina> = {};
  for (const obj of objetivosConDatos) objetivosPorId[obj.id] = obj;

  // Una fila por instante; cada línea une sus propios puntos (connectNulls) en orden cronológico.
  const filasPorX = new Map<number, DataPoint>();
  for (const obj of objetivosConDatos) {
    for (const p of progresoPorObjetivo[obj.id] ?? []) {
      const x = new Date(p.registrado_at).getTime();
      if (Number.isNaN(x)) continue;
      const fila = filasPorX.get(x) ?? ({ x } as DataPoint);
      fila[obj.id] = p.nivel_gas;
      filasPorX.set(x, fila);
    }
  }
  const chartData = Array.from(filasPorX.values()).sort((a, b) => a.x - b.x);
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-ink-3">
        Sin registros de progreso aún
      </div>
    );
  }

  const xMin = chartData[0].x;
  const xMax = chartData[chartData.length - 1].x;
  const pad = Math.max(DIA_MS, (xMax - xMin) * 0.05);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />

            <XAxis
              dataKey="x"
              type="number"
              scale="time"
              domain={[xMin - pad, xMax + pad]}
              tickFormatter={formatTick}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              minTickGap={24}
            />

            <YAxis
              domain={[-2, 2]}
              ticks={GAS_TICKS}
              allowDataOverflow
              tickFormatter={(v: number) => GAS_TICK_LABELS[v] ?? String(v)}
              tick={{ fontSize: 10, fill: "#475569" }}
              width={140}
            />

            <ReferenceLine
              y={0}
              stroke="#006B6B"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: "Esperado",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#006B6B",
              }}
            />

            <Tooltip
              content={<TooltipContenido objetivosPorId={objetivosPorId} />}
              cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }}
            />

            {objetivosConDatos.map((obj, idx) => (
              <Line
                key={obj.id}
                type="linear"
                dataKey={obj.id}
                name={disciplinaDe(obj)}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda propia: disciplina + objetivo, sin truncar el nombre de la disciplina */}
      <ul
        className="grid gap-x-4 gap-y-1.5 mt-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {objetivosConDatos.map((obj, idx) => (
          <li
            key={obj.id}
            className="flex items-start gap-2 text-xs"
            style={{ color: "#475569" }}
            title={obj.descripcion}
          >
            <span
              aria-hidden
              style={{
                width: 12,
                height: 3,
                marginTop: 6,
                flexShrink: 0,
                borderRadius: 2,
                background: LINE_COLORS[idx % LINE_COLORS.length],
              }}
            />
            <span className="min-w-0">
              <span style={{ fontWeight: 600, color: "#1E293B" }}>{disciplinaDe(obj)}</span>
              <span
                className="block"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {obj.descripcion}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
