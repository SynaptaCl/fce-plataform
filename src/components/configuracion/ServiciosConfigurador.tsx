"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, X, Settings2 } from "lucide-react";
import {
  asignarProfesionalServicio,
  desasignarProfesionalServicio,
} from "@/app/actions/configuracion/servicios";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Servicio {
  id: string;
  nombre: string;
  categoria: string | null;
  activo: boolean;
}

interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
}

interface Asignacion {
  id_profesional: string;
  id_servicio: string;
  activo: boolean;
}

interface Props {
  servicios: Servicio[];
  profesionales: Profesional[];
  asignaciones: Asignacion[];
}

// ── AssignModal ───────────────────────────────────────────────────────────────

interface AssignModalProps {
  servicio: Servicio;
  profesionales: Profesional[];
  asignacionesIniciales: Set<string>; // Set of id_profesional that are currently assigned
  onClose: (hayCambios: boolean) => void;
}

function AssignModal({
  servicio,
  profesionales,
  asignacionesIniciales,
  onClose,
}: AssignModalProps) {
  // Local state: track which profesionales are assigned
  const [asignados, setAsignados] = useState<Set<string>>(
    new Set(asignacionesIniciales)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hayCambios, setHayCambios] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(idProfesional: string, currentlyAssigned: boolean) {
    // Capture current state before optimistic update
    const wasAssigned = currentlyAssigned;

    // Optimistic update
    setAsignados((prev) => {
      const next = new Set(prev);
      if (wasAssigned) {
        next.delete(idProfesional);
      } else {
        next.add(idProfesional);
      }
      return next;
    });
    // Clear any prior error for this profesional
    setErrors((prev) => {
      const next = { ...prev };
      delete next[idProfesional];
      return next;
    });

    startTransition(async () => {
      const result = wasAssigned
        ? await desasignarProfesionalServicio(idProfesional, servicio.id)
        : await asignarProfesionalServicio(idProfesional, servicio.id);

      if (!result.success) {
        // Revert optimistic update
        setAsignados((prev) => {
          const next = new Set(prev);
          if (wasAssigned) next.add(idProfesional);
          else next.delete(idProfesional);
          return next;
        });
        setErrors((prev) => ({ ...prev, [idProfesional]: result.error }));
      } else {
        setHayCambios(true);
        // Clear error for this profesional if any
        setErrors((prev) => {
          const next = { ...prev };
          delete next[idProfesional];
          return next;
        });
      }
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(hayCambios);
      }}
    >
      <div
        style={{
          background: "var(--color-surface-1)",
          borderRadius: 12,
          border: "1px solid var(--color-kp-border)",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-kp-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-ink-1)",
              }}
            >
              Profesionales para{" "}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-kp-primary)",
              }}
            >
              {servicio.nombre}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onClose(hayCambios)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-3)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Profesional list */}
        <div
          style={{
            overflowY: "auto",
            padding: "12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {profesionales.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "var(--color-ink-3)",
                fontSize: 13,
              }}
            >
              No hay profesionales activos en la clínica.
            </div>
          ) : (
            profesionales.map((prof) => {
              const assigned = asignados.has(prof.id);
              const err = errors[prof.id];

              return (
                <div
                  key={prof.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-kp-border)",
                    background: assigned
                      ? "rgba(0,176,168,0.04)"
                      : "var(--color-surface-0)",
                    cursor: isPending ? "not-allowed" : "pointer",
                    opacity: isPending ? 0.75 : 1,
                    transition: "background 0.15s",
                  }}
                  onClick={() => {
                    if (!isPending) handleToggle(prof.id, assigned);
                  }}
                >
                  {/* Checkbox visual */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: assigned
                        ? "2px solid var(--color-kp-primary)"
                        : "2px solid var(--color-ink-3)",
                      background: assigned
                        ? "var(--color-kp-primary)"
                        : "transparent",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {assigned && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="#fff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-ink-1)",
                      }}
                    >
                      {prof.nombre}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-2)",
                      }}
                    >
                      {prof.especialidad}
                    </div>
                    {err && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-kp-danger)",
                          marginTop: 2,
                        }}
                      >
                        {err}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--color-kp-border)",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => onClose(hayCambios)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--color-kp-border)",
              background: "var(--color-surface-1)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-ink-2)",
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ServiciosConfigurador ─────────────────────────────────────────────────────

export function ServiciosConfigurador({
  servicios,
  profesionales,
  asignaciones,
}: Props) {
  const router = useRouter();
  const [modalServicio, setModalServicio] = useState<Servicio | null>(null);

  // Build a lookup: id_servicio → Set<id_profesional> (only active)
  const asignacionesPorServicio = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of asignaciones) {
      if (!a.activo) continue;
      if (!map.has(a.id_servicio)) map.set(a.id_servicio, new Set());
      map.get(a.id_servicio)!.add(a.id_profesional);
    }
    return map;
  }, [asignaciones]);

  // Build profesional name lookup
  const profPorId = useMemo(() => {
    const map = new Map<string, Profesional>();
    for (const p of profesionales) map.set(p.id, p);
    return map;
  }, [profesionales]);

  function handleModalClose(hayCambios: boolean) {
    setModalServicio(null);
    if (hayCambios) {
      router.refresh();
    }
  }

  if (servicios.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-ink-3)",
          fontSize: 14,
        }}
      >
        No hay servicios registrados en esta clínica.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {servicios.map((servicio) => {
          const asignadosSet =
            asignacionesPorServicio.get(servicio.id) ?? new Set<string>();

          return (
            <div
              key={servicio.id}
              style={{
                background: "var(--color-surface-1)",
                borderRadius: 10,
                border: "1px solid var(--color-kp-border)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Nombre + badges */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--color-ink-1)",
                    }}
                  >
                    {servicio.nombre}
                  </span>

                  {/* Categoría badge */}
                  {servicio.categoria && (
                    <span
                      style={{
                        display: "inline-flex",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: "var(--color-surface-0)",
                        color: "var(--color-ink-2)",
                        border: "1px solid var(--color-kp-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {servicio.categoria}
                    </span>
                  )}

                  {/* Activo/Inactivo badge */}
                  <span
                    style={{
                      display: "inline-flex",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: servicio.activo
                        ? "rgba(22,163,74,0.08)"
                        : "rgba(239,68,68,0.07)",
                      color: servicio.activo
                        ? "var(--color-kp-success)"
                        : "var(--color-kp-danger)",
                      border: servicio.activo
                        ? "1px solid rgba(22,163,74,0.2)"
                        : "1px solid rgba(239,68,68,0.18)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {servicio.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {/* Profesionales asignados */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Users
                    size={12}
                    style={{ color: "var(--color-ink-3)", flexShrink: 0 }}
                  />
                  {asignadosSet.size === 0 ? (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-ink-3)",
                        fontStyle: "italic",
                      }}
                    >
                      Sin profesionales asignados
                    </span>
                  ) : (
                    Array.from(asignadosSet).map((pid) => {
                      const nombre = profPorId.get(pid)?.nombre;
                      if (!nombre) return null;
                      return (
                        <span
                          key={pid}
                          style={{
                            fontSize: 12,
                            color: "var(--color-ink-2)",
                            background: "var(--color-surface-0)",
                            border: "1px solid var(--color-kp-border)",
                            borderRadius: 6,
                            padding: "1px 7px",
                          }}
                        >
                          {nombre}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action */}
              <div style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setModalServicio(servicio)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "1px solid var(--color-kp-border)",
                    background: "var(--color-surface-1)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-ink-2)",
                    cursor: "pointer",
                  }}
                >
                  <Settings2 size={13} />
                  Gestionar asignaciones
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Modal */}
      {modalServicio && (
        <AssignModal
          servicio={modalServicio}
          profesionales={profesionales}
          asignacionesIniciales={
            asignacionesPorServicio.get(modalServicio.id) ?? new Set<string>()
          }
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
