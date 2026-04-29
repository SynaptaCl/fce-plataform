import type { EstadoPieza, SuperficieDental } from "@/types";

// ── Colores por estado ────────────────────────────────────────────────────────

export const ESTADO_CONFIG: Record<EstadoPieza, { fill: string; stroke: string; label: string }> = {
  sano:                   { fill: "#FFFFFF", stroke: "#CBD5E1", label: "Sano" },
  caries:                 { fill: "#FCA5A5", stroke: "#EF4444", label: "Caries" },
  obturado:               { fill: "#93C5FD", stroke: "#3B82F6", label: "Obturado" },
  corona:                 { fill: "#FDE68A", stroke: "#F59E0B", label: "Corona" },
  ausente:                { fill: "#E2E8F0", stroke: "#94A3B8", label: "Ausente" },
  ausente_no_erupcionado: { fill: "#F1F5F9", stroke: "#CBD5E1", label: "No erupcionado" },
  endodoncia:             { fill: "#FECDD3", stroke: "#EF4444", label: "Endodoncia" },
  implante:               { fill: "#A7F3D0", stroke: "#10B981", label: "Implante" },
  protesis_fija:          { fill: "#FDE68A", stroke: "#D97706", label: "Prótesis fija" },
  protesis_removible:     { fill: "#DDD6FE", stroke: "#7C3AED", label: "Prótesis removible" },
  fracturado:             { fill: "#FECDD3", stroke: "#DC2626", label: "Fracturado" },
  extraccion_indicada:    { fill: "#FEE2E2", stroke: "#B91C1C", label: "Extracción indicada" },
  sellante:               { fill: "#D1FAE5", stroke: "#059669", label: "Sellante" },
  en_erupcion:            { fill: "#DBEAFE", stroke: "#60A5FA", label: "En erupción" },
  retenido:               { fill: "#FEF3C7", stroke: "#F59E0B", label: "Retenido" },
  supernumerario:         { fill: "#FCE7F3", stroke: "#EC4899", label: "Supernumerario" },
};

// ── Dimensiones de pieza ──────────────────────────────────────────────────────

export const PW = 34; // piece width
export const PH = 38; // piece height
const IX = 7;         // inner box x-offset (20%)
const IY = 8;         // inner box y-offset (21%)

// 5 superficies: V (top trapezoid), L (bottom), M (left), D (right), O (center rect)
const SURFACES: SuperficieDental[] = ["V", "L", "M", "D", "O"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface OdontogramaPiezaProps {
  pieza: number;
  estado: EstadoPieza;
  superficies: Partial<Record<SuperficieDental, EstadoPieza | null>>;
  movilidad: number | null;
  selected: boolean;
  onClick: (pieza: number) => void;
  onSurfaceClick: (pieza: number, superficie: SuperficieDental) => void;
  readOnly: boolean;
  x: number;
  y: number;
  labelPosition: "above" | "below";
}

// ── Componente (SVG group — usar dentro de <svg>) ─────────────────────────────

export function OdontogramaPieza({
  pieza,
  estado,
  superficies,
  movilidad,
  selected,
  onClick,
  onSurfaceClick,
  readOnly,
  x,
  y,
  labelPosition,
}: OdontogramaPiezaProps) {
  const ausente = estado === "ausente" || estado === "ausente_no_erupcionado";
  const outlineColor = selected ? "#0EA5E9" : "#CBD5E1";
  const outlineWidth = selected ? 2 : 0.8;

  const fillFor = (surface: SuperficieDental): string => {
    const s = superficies[surface];
    const effective: EstadoPieza = s != null ? s : estado;
    return ESTADO_CONFIG[effective]?.fill ?? "#FFFFFF";
  };

  // Polygon points para cada superficie (relativo a x,y)
  const polyV = `${x},${y} ${x+PW},${y} ${x+PW-IX},${y+IY} ${x+IX},${y+IY}`;
  const polyL = `${x},${y+PH} ${x+PW},${y+PH} ${x+PW-IX},${y+PH-IY} ${x+IX},${y+PH-IY}`;
  const polyM = `${x},${y} ${x},${y+PH} ${x+IX},${y+PH-IY} ${x+IX},${y+IY}`;
  const polyD = `${x+PW},${y} ${x+PW},${y+PH} ${x+PW-IX},${y+PH-IY} ${x+PW-IX},${y+IY}`;

  const labelY = labelPosition === "above" ? y - 5 : y + PH + 11;

  const handleSurface = (e: React.MouseEvent, surface: SuperficieDental) => {
    if (readOnly) return;
    e.stopPropagation();
    onSurfaceClick(pieza, surface);
  };

  return (
    <g
      role="button"
      aria-label={`Pieza ${pieza}`}
      style={{ cursor: readOnly ? "default" : "pointer" }}
      onClick={() => !readOnly && onClick(pieza)}
    >
      {/* Background fill para piezas ausentes */}
      {ausente && (
        <rect x={x} y={y} width={PW} height={PH} fill={ESTADO_CONFIG[estado].fill} rx={2} />
      )}

      {/* 5 superficies (solo si no ausente) */}
      {!ausente && (
        <>
          <polygon
            points={polyV}
            fill={fillFor("V")}
            stroke="#CBD5E1"
            strokeWidth={0.5}
            onClick={(e) => handleSurface(e, "V")}
          />
          <polygon
            points={polyL}
            fill={fillFor("L")}
            stroke="#CBD5E1"
            strokeWidth={0.5}
            onClick={(e) => handleSurface(e, "L")}
          />
          <polygon
            points={polyM}
            fill={fillFor("M")}
            stroke="#CBD5E1"
            strokeWidth={0.5}
            onClick={(e) => handleSurface(e, "M")}
          />
          <polygon
            points={polyD}
            fill={fillFor("D")}
            stroke="#CBD5E1"
            strokeWidth={0.5}
            onClick={(e) => handleSurface(e, "D")}
          />
          {/* Centro O/I */}
          <rect
            x={x + IX}
            y={y + IY}
            width={PW - IX * 2}
            height={PH - IY * 2}
            fill={fillFor("O")}
            stroke="#CBD5E1"
            strokeWidth={0.5}
            onClick={(e) => handleSurface(e, "O")}
          />
        </>
      )}

      {/* Borde exterior */}
      <rect
        x={x}
        y={y}
        width={PW}
        height={PH}
        fill="none"
        stroke={outlineColor}
        strokeWidth={outlineWidth}
        rx={2}
        style={{ pointerEvents: "none" }}
      />

      {/* X para piezas ausentes */}
      {ausente && (
        <>
          <line x1={x + 5} y1={y + 5} x2={x + PW - 5} y2={y + PH - 5} stroke="#94A3B8" strokeWidth={2} />
          <line x1={x + PW - 5} y1={y + 5} x2={x + 5} y2={y + PH - 5} stroke="#94A3B8" strokeWidth={2} />
        </>
      )}

      {/* Marcador endodoncia */}
      {estado === "endodoncia" && (
        <circle cx={x + PW / 2} cy={y + PH / 2} r={4} fill="#EF4444" opacity={0.75} style={{ pointerEvents: "none" }} />
      )}

      {/* Círculo extracción indicada */}
      {estado === "extraccion_indicada" && (
        <circle cx={x + PW / 2} cy={y + PH / 2} r={PW / 2 - 2} fill="none" stroke="#B91C1C" strokeWidth={1.5} style={{ pointerEvents: "none" }} />
      )}

      {/* Movilidad (esquina sup-der) */}
      {movilidad != null && movilidad > 0 && (
        <text x={x + PW - 3} y={y + 8} fontSize={7} fill="#7C3AED" textAnchor="end" fontFamily="monospace" style={{ pointerEvents: "none" }}>
          {movilidad}
        </text>
      )}

      {/* Número de pieza */}
      <text
        x={x + PW / 2}
        y={labelY}
        textAnchor="middle"
        fontSize={8.5}
        fill="#475569"
        fontFamily="sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {pieza}
      </text>
    </g>
  );
}

export { SURFACES };
