"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { citaPorConfirmar, type CitaAgenda } from "@/types";

interface AgendaTableProps {
  citas: CitaAgenda[];
  /** true si la fecha mostrada es hoy (activa jerarquía temporal pasada/actual). */
  esHoy?: boolean;
  /** Hora actual "HH:MM" en TZ Santiago — solo se usa cuando esHoy. */
  ahora?: string;
  /** Mostrar columna Profesional (agenda multi-profesional: admin/director). */
  mostrarProfesional?: boolean;
}

type BadgeVariant = "info" | "warning" | "default" | "danger" | "teal";

function encuentroStatusBadge(status: CitaAgenda["encuentro_status"]): { label: string; variant: BadgeVariant } {
  switch (status) {
    case "planificado":  return { label: "Planificado", variant: "info" };
    case "en_progreso":  return { label: "En curso",    variant: "warning" };
    case "finalizado":   return { label: "Finalizado",   variant: "default" };
    default:             return { label: "Sin encuentro", variant: "default" };
  }
}

/** Badge para citas que aún no están confirmadas; null si no aplica. */
function citaStatusBadge(cita: CitaAgenda): { label: string; variant: BadgeVariant } | null {
  if (cita.estado === "pendiente_pago") return { label: "Pago pendiente", variant: "danger" };
  if (citaPorConfirmar(cita.estado)) return { label: "Por confirmar", variant: "warning" };
  return null;
}

const GRID_4 = "sm:grid-cols-[0.8fr_2fr_1.5fr_1.5fr]";
const GRID_5 = "sm:grid-cols-[0.8fr_1.9fr_1.1fr_1.2fr_1.2fr]";

export function AgendaTable({
  citas,
  esHoy = false,
  ahora,
  mostrarProfesional = false,
}: AgendaTableProps) {
  const router = useRouter();
  const grid = mostrarProfesional ? GRID_5 : GRID_4;
  const columnas = mostrarProfesional
    ? ["Hora", "Paciente", "Especialidad", "Profesional", "Encuentro"]
    : ["Hora", "Paciente", "Especialidad", "Encuentro"];

  if (citas.length === 0) {
    return (
      <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-12 text-center">
        <Calendar className="w-8 h-8 text-ink-4 mx-auto mb-3" />
        <p className="text-sm font-semibold text-ink-2">Sin citas para este día</p>
        <p className="text-xs text-ink-3 mt-1">
          {esHoy
            ? "Las citas aparecen aquí cuando recepción confirma el check-in."
            : "Revisa la agenda para gestionar reservas de este día."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      <div className="max-h-[65vh] overflow-y-auto">
        {/* Header (sticky al hacer scroll en días largos) */}
        <div
          className={cn(
            "hidden sm:grid sticky top-0 z-10 gap-4 px-5 py-3 bg-surface-0 border-b border-kp-border",
            grid
          )}
        >
          {columnas.map((h) => (
            <span
              key={h}
              className="text-xs font-semibold text-ink-3 uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Filas */}
        {citas.map((cita, idx) => {
          const encuentro = encuentroStatusBadge(cita.encuentro_status);
          const citaBadge = citaStatusBadge(cita);
          const hora = cita.hora_inicio.slice(0, 5);
          const hi = cita.hora_inicio.slice(0, 5);
          const hf = cita.hora_fin.slice(0, 5);
          const enCurso = esHoy && !!ahora && hi <= ahora && ahora <= hf;
          const pasada = esHoy && !!ahora && hf < ahora;
          const paciente = [cita.paciente_nombre, cita.paciente_apellido]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={cita.id_cita}
              onClick={() => router.push(`/dashboard/pacientes/${cita.id_paciente}`)}
              title={`Ver ficha de ${paciente}`}
              className={cn(
                "w-full text-left transition-colors cursor-pointer hover:bg-kp-accent-xs focus-visible:bg-kp-accent-xs",
                "px-5 py-3.5 border-b border-kp-border last:border-0",
                "flex flex-col sm:grid sm:gap-4 sm:items-center",
                grid,
                idx % 2 === 0 ? "bg-surface-1" : "bg-surface-0/50",
                enCurso && "bg-kp-accent-xs border-l-4 border-l-kp-accent",
                pasada && "opacity-55"
              )}
            >
              {/* Hora */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono font-semibold text-ink-1">{hora}</span>
                {enCurso && (
                  <Badge variant="teal" className="px-2 py-0.5 text-[10px]">Ahora</Badge>
                )}
                <span className="sm:hidden text-xs text-ink-3">— {hf}</span>
              </div>

              {/* Paciente + estado confirmación + notas */}
              <div className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-1 truncate">{paciente}</span>
                  {citaBadge && (
                    <Badge variant={citaBadge.variant} className="px-2 py-0.5 text-[10px] shrink-0">
                      {citaBadge.label}
                    </Badge>
                  )}
                </span>
                {(cita.notas_cita || cita.servicio_nombre) && (
                  <span className="text-xs text-ink-3 block truncate">
                    {cita.notas_cita ?? cita.servicio_nombre}
                  </span>
                )}
              </div>

              {/* Especialidad + servicio */}
              <div className="min-w-0">
                <span className="text-sm text-ink-2 capitalize block truncate">
                  <span className="sm:hidden text-xs font-semibold text-ink-3 uppercase tracking-wider mr-1">Especialidad:</span>
                  {cita.profesional_especialidad ?? "—"}
                </span>
                {cita.servicio_nombre && cita.servicio_nombre !== cita.profesional_especialidad && (
                  <span className="text-xs text-ink-3 block truncate">{cita.servicio_nombre}</span>
                )}
              </div>

              {/* Profesional (solo agenda multi-profesional) */}
              {mostrarProfesional && (
                <span className="text-sm text-ink-2 block truncate">
                  <span className="sm:hidden text-xs font-semibold text-ink-3 uppercase tracking-wider mr-1">Profesional:</span>
                  {cita.profesional_nombre}
                </span>
              )}

              {/* Estado del encuentro */}
              <div>
                <span className="sm:hidden text-xs font-semibold text-ink-3 uppercase tracking-wider block mb-1">Encuentro:</span>
                <Badge variant={encuentro.variant}>{encuentro.label}</Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
