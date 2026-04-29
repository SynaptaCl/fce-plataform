'use client';

import { ARCO_SUPERIOR, ARCO_INFERIOR, meanOf } from "@/lib/dental/periograma";
import type { PeriogramaPiezaDatos } from "@/types/periograma";

interface Props {
  datos: Record<number, PeriogramaPiezaDatos>;
}

const MAX_MM = 10;
const CHART_H = 40; // px per half (vestibular above, lingual below)
const BAR_W = 8;
const TOOTH_W = 22;
const LABEL_W = 60;
const REF_MM = 3; // clinical health threshold

function barColor(mm: number): string {
  if (mm >= 6) return "#ef4444";
  if (mm >= 4) return "#f59e0b";
  if (mm > 0)  return "#22c55e";
  return "#CBD5E1";
}

function ArcoChart({
  piezas,
  datos,
  innerLabel,
}: {
  piezas: number[];
  datos: Record<number, PeriogramaPiezaDatos>;
  innerLabel: string;
}) {
  const svgW = LABEL_W + piezas.length * TOOTH_W + 4;
  const svgH = CHART_H * 2 + 20; // top half + bottom half + tooth numbers
  const centerY = CHART_H;
  const refY = (REF_MM / MAX_MM) * CHART_H;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Horizontal center line */}
      <line x1={LABEL_W} y1={centerY} x2={svgW} y2={centerY} stroke="#E2E8F0" strokeWidth="1" />
      {/* 3mm reference lines */}
      <line x1={LABEL_W} y1={centerY - refY} x2={svgW} y2={centerY - refY}
        stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="3,3" />
      <line x1={LABEL_W} y1={centerY + refY} x2={svgW} y2={centerY + refY}
        stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="3,3" />

      {/* Y axis labels */}
      <text x={LABEL_W - 4} y={centerY - refY + 2} textAnchor="end" fontSize="6" fill="#94A3B8">V. 3mm</text>
      <text x={LABEL_W - 4} y={centerY + refY + 2} textAnchor="end" fontSize="6" fill="#94A3B8">{innerLabel} 3mm</text>

      {piezas.map((pieza, idx) => {
        const d = datos[pieza];
        const vestMean = meanOf(d.sondaje.vestibular);
        const lingMean = meanOf(d.sondaje.lingual);
        const vestH = Math.min((vestMean / MAX_MM) * CHART_H, CHART_H);
        const lingH = Math.min((lingMean / MAX_MM) * CHART_H, CHART_H);
        const cx = LABEL_W + idx * TOOTH_W + TOOTH_W / 2;

        return (
          <g key={pieza}>
            {/* Vestibular bar (up) */}
            <rect
              x={cx - BAR_W / 2}
              y={centerY - vestH}
              width={BAR_W}
              height={vestH}
              fill={barColor(vestMean)}
              opacity={0.85}
              rx="1"
            >
              <title>{pieza} Vest: {vestMean}mm</title>
            </rect>
            {/* Lingual bar (down) */}
            <rect
              x={cx - BAR_W / 2}
              y={centerY}
              width={BAR_W}
              height={lingH}
              fill={barColor(lingMean)}
              opacity={0.7}
              rx="1"
            >
              <title>{pieza} {innerLabel}: {lingMean}mm</title>
            </rect>
            {/* Tooth number */}
            <text
              x={cx}
              y={svgH - 2}
              textAnchor="middle"
              fontSize="5.5"
              fill="#94A3B8"
            >
              {pieza}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function PeriogramaChart({ datos }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[10px] text-ink-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-green-400" />
          1-3mm normal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
          4-5mm bolsa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-red-400" />
          ≥6mm severa
        </span>
      </div>

      <div className="rounded-lg border border-kp-border bg-surface-0 p-3">
        <p className="text-[10px] font-medium text-ink-3 mb-1 uppercase tracking-wide">Arco Superior</p>
        <ArcoChart piezas={ARCO_SUPERIOR} datos={datos} innerLabel="Pal." />
      </div>

      <div className="rounded-lg border border-kp-border bg-surface-0 p-3">
        <p className="text-[10px] font-medium text-ink-3 mb-1 uppercase tracking-wide">Arco Inferior</p>
        <ArcoChart piezas={ARCO_INFERIOR} datos={datos} innerLabel="Ling." />
      </div>
    </div>
  );
}
