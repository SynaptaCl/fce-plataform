"use client";

import { useRef, useEffect, useState } from "react";
import { Eraser } from "lucide-react";

interface Props {
  modoFirma: "impresa" | "canvas";
  onModoChange: (modo: "impresa" | "canvas") => void;
  onFirmaChange: (dataUrl: string | null) => void;
}

/**
 * Panel de firma para prescripciones.
 *
 * Modo "impresa": el PDF se entrega al profesional para firma manual.
 * Modo "canvas":  el profesional dibuja su firma directamente en pantalla.
 *
 * Nota: SignatureBlock existente usa un flujo de firma electrónica avanzada (isSigned/onSign)
 * que no es compatible con la captura de trazo canvas requerida aquí.
 * Se implementa el canvas directamente.
 */
export function PrescripcionFirmaPanel({ modoFirma, onModoChange, onFirmaChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasFirma, setHasFirma] = useState(false);

  useEffect(() => {
    // Reset canvas and firma state when switching to canvas mode
    if (modoFirma === "canvas") {
      clearCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoFirma]);

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return { canvas, ctx };
  }

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const r = getCtx();
    if (!r) return;
    const { ctx } = r;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    const r = getCtx();
    if (!r) return;
    const { ctx } = r;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasFirma(true);
    onFirmaChange(canvas.toDataURL("image/png"));
  }

  function clearCanvas() {
    const r = getCtx();
    if (!r) return;
    r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);
    setHasFirma(false);
    onFirmaChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["impresa", "canvas"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { onModoChange(m); onFirmaChange(null); }}
            className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
            style={modoFirma === m ? {
              background: "var(--color-kp-primary)",
              color: "#fff",
              borderColor: "var(--color-kp-primary)",
            } : {
              background: "transparent",
              color: "var(--color-ink-2)",
              borderColor: "var(--color-kp-border)",
            }}
          >
            {m === "impresa" ? "Firma impresa" : "Firma digital"}
          </button>
        ))}
      </div>

      {modoFirma === "canvas" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
              Dibuje su firma
            </p>
            {hasFirma && (
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-3)" }}
              >
                <Eraser className="size-3" />
                Borrar
              </button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={560}
            height={120}
            className="w-full rounded-lg border touch-none"
            style={{ borderColor: "var(--color-kp-border)", background: "#fff", cursor: "crosshair" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasFirma && (
            <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              Trace su firma en el recuadro superior.
            </p>
          )}
        </div>
      )}

      {modoFirma === "impresa" && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Se generará un PDF que el profesional firmará a mano antes de entregar al paciente.
        </p>
      )}
    </div>
  );
}
