"use client";

import { useState } from "react";
import { OdontogramaPieza, PW, PH } from "./OdontogramaPieza";
import { OdontogramaLeyenda } from "./OdontogramaLeyenda";
import { PiezaDetailPanel } from "./PiezaDetailPanel";
import type { OdontogramaEntry, EstadoPieza, SuperficieDental } from "@/types";

// ── Constantes de layout SVG ──────────────────────────────────────────────────

const GAP = 2;         // gap entre piezas
const STEP = PW + GAP; // 36px
const QGAP = 8;        // gap entre cuadrantes

// Adulto: 8 piezas por cuadrante. Q1 empieza en x=20.
// Total: 20 + 8*34 + 7*2 + 8 + 8*34 + 7*2 + 20 = 620 ✓
const ADULT_START_X = 20;
const ADULT_Q2_X = ADULT_START_X + 8 * STEP - GAP + QGAP; // 314

// Niño: 5 piezas por cuadrante, centrado.
// Q5+Q6 width = 5*34 + 4*2 + 8 + 5*34 + 4*2 = 2*(178) + 8 - 8 = 364
// Start = (620 - 364) / 2 = 128
const NINO_START_X = 128;
const NINO_Q6_X = NINO_START_X + 5 * STEP - GAP + QGAP; // 302

const UPPER_Y = 25;    // y superior
const LOWER_Y = 82;    // y inferior
const SVG_H = 158;     // altura total SVG

// Layout de piezas (de izquierda a derecha en pantalla)
const LAYOUT = {
  adulto: {
    upper: [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]] as number[][],
    lower: [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]] as number[][],
    startX: [ADULT_START_X, ADULT_Q2_X],
  },
  nino: {
    upper: [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]] as number[][],
    lower: [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]] as number[][],
    startX: [NINO_START_X, NINO_Q6_X],
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface OdontogramaInteractivoProps {
  pacienteId: string;
  encuentroId: string;
  piezasIniciales: OdontogramaEntry[];
  readOnly?: boolean;
  denticion: "adulto" | "nino" | "mixta";
}

type DenticionView = "adulto" | "nino";

// ── Componente ────────────────────────────────────────────────────────────────

export function OdontogramaInteractivo({
  pacienteId,
  encuentroId,
  piezasIniciales,
  readOnly = false,
  denticion,
}: OdontogramaInteractivoProps) {
  // Vista activa (mixta muestra primero adulto)
  const [view, setView] = useState<DenticionView>(
    denticion === "nino" ? "nino" : "adulto"
  );
  const [selectedPieza, setSelectedPieza] = useState<number | null>(null);
  const [highlightSurface, setHighlightSurface] = useState<SuperficieDental | null>(null);

  // Mapa mutable de piezas por número
  const [piezasMap, setPiezasMap] = useState<Map<number, OdontogramaEntry>>(() => {
    const m = new Map<number, OdontogramaEntry>();
    piezasIniciales.forEach((p) => m.set(p.pieza, p));
    return m;
  });

  const layout = LAYOUT[view];

  const getEntry = (pieza: number) => piezasMap.get(pieza);

  const handlePiezaClick = (pieza: number) => {
    if (readOnly) return;
    setSelectedPieza((prev) => (prev === pieza ? null : pieza));
    setHighlightSurface(null);
  };

  const handleSurfaceClick = (pieza: number, superficie: SuperficieDental) => {
    if (readOnly) return;
    setSelectedPieza(pieza);
    setHighlightSurface(superficie);
  };

  const handleSaved = (updated: OdontogramaEntry) => {
    setPiezasMap((prev) => new Map(prev).set(updated.pieza, updated));
  };

  const renderRow = (
    quadrants: number[][],
    startXs: number[],
    y: number,
    labelPos: "above" | "below"
  ) => (
    <>
      {quadrants.map((quad, qi) => {
        const startX = startXs[qi];
        return quad.map((pieza, i) => {
          const entry = getEntry(pieza);
          return (
            <OdontogramaPieza
              key={pieza}
              pieza={pieza}
              estado={(entry?.estado as EstadoPieza) ?? "sano"}
              superficies={entry?.superficies ?? {}}
              movilidad={entry?.movilidad ?? null}
              selected={selectedPieza === pieza}
              onClick={handlePiezaClick}
              onSurfaceClick={handleSurfaceClick}
              readOnly={readOnly}
              x={startX + i * STEP}
              y={y}
              labelPosition={labelPos}
            />
          );
        });
      })}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Toggle dentición */}
      {denticion === "mixta" && (
        <div className="flex gap-1">
          {(["adulto", "nino"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setView(v); setSelectedPieza(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{
                background: view === v ? "var(--color-kp-primary)" : "var(--color-surface-0)",
                color: view === v ? "#FFFFFF" : "var(--color-ink-2)",
                borderColor: view === v ? "var(--color-kp-primary)" : "var(--color-kp-border)",
              }}
            >
              {v === "adulto" ? "Dentición permanente" : "Dentición temporal"}
            </button>
          ))}
        </div>
      )}
      {denticion !== "mixta" && (
        <p className="text-xs text-ink-3">
          {denticion === "adulto" ? "Dentición permanente (32 piezas)" : "Dentición temporal (20 piezas)"}
          {!readOnly && " · Haz click en una pieza para editar su estado"}
        </p>
      )}
      {denticion === "mixta" && (
        <p className="text-xs text-ink-3">
          {!readOnly && "Haz click en una pieza para editar su estado"}
        </p>
      )}

      {/* Layout principal */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* SVG */}
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 620 ${SVG_H}`}
            className="w-full"
            style={{ maxHeight: 240 }}
            aria-label="Odontograma interactivo"
          >
            {/* Línea de separación maxilar/mandíbula */}
            <line
              x1={10}
              y1={UPPER_Y + PH + 8}
              x2={610}
              y2={UPPER_Y + PH + 8}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {/* Línea de separación entre cuadrantes */}
            <line
              x1={layout.startX[1] - QGAP / 2}
              y1={10}
              x2={layout.startX[1] - QGAP / 2}
              y2={SVG_H - 10}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="4 3"
            />

            {/* Etiquetas cuadrantes */}
            <text x={ADULT_START_X} y={12} fontSize={8} fill="#94A3B8" fontFamily="sans-serif">
              {view === "adulto" ? "Q1" : "Q5"}
            </text>
            <text x={ADULT_Q2_X} y={12} fontSize={8} fill="#94A3B8" fontFamily="sans-serif">
              {view === "adulto" ? "Q2" : "Q6"}
            </text>
            <text x={ADULT_START_X} y={SVG_H - 3} fontSize={8} fill="#94A3B8" fontFamily="sans-serif">
              {view === "adulto" ? "Q4" : "Q8"}
            </text>
            <text x={ADULT_Q2_X} y={SVG_H - 3} fontSize={8} fill="#94A3B8" fontFamily="sans-serif">
              {view === "adulto" ? "Q3" : "Q7"}
            </text>

            {/* Piezas superiores */}
            {renderRow(layout.upper, layout.startX, UPPER_Y, "above")}

            {/* Piezas inferiores */}
            {renderRow(layout.lower, layout.startX, LOWER_Y, "below")}
          </svg>

          {/* Leyenda */}
          <OdontogramaLeyenda />
        </div>

        {/* Panel lateral */}
        {selectedPieza !== null && (
          <div className="w-full xl:w-72 xl:flex-shrink-0">
            <PiezaDetailPanel
              pieza={selectedPieza}
              entry={getEntry(selectedPieza)}
              encuentroId={encuentroId}
              patientId={pacienteId}
              readOnly={readOnly}
              highlightSurface={highlightSurface}
              onClose={() => setSelectedPieza(null)}
              onSaved={handleSaved}
            />
          </div>
        )}
      </div>
    </div>
  );
}
