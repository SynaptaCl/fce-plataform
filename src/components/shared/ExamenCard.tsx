"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ExamenIndicado } from "@/types/orden-examen";

interface Props {
  examen: ExamenIndicado;
  onUpdate: (updated: ExamenIndicado) => void;
  onRemove: () => void;
}

function categoriaBadgeVariant(
  categoria: string
): "info" | "teal" | "success" | "default" {
  if (categoria === "laboratorio") return "info";
  if (categoria === "imagenologia") return "teal";
  if (categoria === "procedimiento") return "success";
  return "default";
}

function categoriaLabel(categoria: string): string {
  const map: Record<string, string> = {
    laboratorio: "Laboratorio",
    imagenologia: "Imagenología",
    procedimiento: "Procedimiento",
    otro: "Otro",
  };
  return map[categoria] ?? categoria;
}

export function ExamenCard({ examen, onUpdate, onRemove }: Props) {
  return (
    <div
      className="relative rounded-xl border p-4 space-y-3"
      style={{ borderColor: "var(--kp-border)", background: "var(--surface-1)" }}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar examen"
        className="absolute top-3 right-3 rounded-full p-1 transition-colors"
        style={{ color: "var(--ink-3)" }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <span className="font-semibold text-sm" style={{ color: "var(--ink-1)" }}>
          {examen.nombre}
        </span>
        <Badge variant={categoriaBadgeVariant(examen.categoria)}>
          {categoriaLabel(examen.categoria)}
        </Badge>
        {examen.urgente && (
          <Badge variant="danger">Urgente</Badge>
        )}
        {examen.preparacion_paciente !== null && (
          <Badge variant="warning">⚠ Preparación</Badge>
        )}
      </div>

      {/* Indicación clínica */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--ink-2)" }}
        >
          Indicación clínica <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={examen.indicacion_clinica}
          onChange={(e) =>
            onUpdate({ ...examen, indicacion_clinica: e.target.value })
          }
          placeholder="¿Por qué se solicita?"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
          style={{
            borderColor:
              examen.indicacion_clinica.trim() === ""
                ? "#ef4444"
                : "var(--kp-border)",
            background: "var(--surface-0)",
            color: "var(--ink-1)",
          }}
        />
        {examen.indicacion_clinica.trim() === "" && (
          <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
            La indicación clínica es requerida.
          </p>
        )}
      </div>

      {/* Urgente toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ ...examen, urgente: !examen.urgente })}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            examen.urgente
              ? {
                  background: "#fef2f2",
                  color: "#991b1b",
                  borderColor: "#fca5a5",
                }
              : {
                  background: "transparent",
                  color: "var(--ink-2)",
                  borderColor: "var(--kp-border)",
                }
          }
        >
          {examen.urgente ? "★ Urgente — quitar" : "Marcar como urgente"}
        </button>
      </div>

      {/* Instrucciones adicionales */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--ink-2)" }}
        >
          Instrucciones adicionales{" "}
          <span style={{ color: "var(--ink-3)" }}>(opcional)</span>
        </label>
        <textarea
          rows={2}
          value={examen.instrucciones ?? ""}
          onChange={(e) =>
            onUpdate({
              ...examen,
              instrucciones: e.target.value === "" ? null : e.target.value,
            })
          }
          placeholder="Ej: Ayuno de 8 horas, traer exámenes anteriores…"
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none transition-colors"
          style={{
            borderColor: "var(--kp-border)",
            background: "var(--surface-0)",
            color: "var(--ink-1)",
          }}
        />
      </div>
    </div>
  );
}
