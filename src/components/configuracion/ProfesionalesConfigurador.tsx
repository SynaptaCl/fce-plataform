"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Pencil,
  ToggleLeft,
  ToggleRight,
  X,
  Pill,
  FlaskConical,
} from "lucide-react";
import {
  toggleProfesionalActivo,
  updateProfesionalSelfService,
} from "@/app/actions/configuracion/profesionales";
import { TIPOS_REGISTRO } from "@/app/actions/configuracion/shared";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
  auth_id: string | null;
  numero_registro: string | null;
  tipo_registro: string | null;
  activo: boolean;
  puede_prescribir: boolean;
  puede_indicar_examenes: boolean;
}

interface Props {
  profesionales: Profesional[];
}

// ── Helpers de estilo ────────────────────────────────────────────────────────

const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 100,
  whiteSpace: "nowrap",
};

// ── EditModal ─────────────────────────────────────────────────────────────────

interface EditModalProps {
  profesional: Profesional;
  onClose: () => void;
}

function EditModal({ profesional, onClose }: EditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState(profesional.nombre);
  const [numeroRegistro, setNumeroRegistro] = useState(
    profesional.numero_registro ?? ""
  );
  const [tipoRegistro, setTipoRegistro] = useState<string>(
    profesional.tipo_registro ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      const result = await updateProfesionalSelfService(profesional.id, {
        nombre: nombre.trim(),
        numero_registro: numeroRegistro.trim() || null,
        tipo_registro: tipoRegistro || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface-1)",
          borderRadius: 12,
          border: "1px solid var(--color-kp-border)",
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
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
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-ink-1)",
            }}
          >
            Editar profesional
          </span>
          <button
            type="button"
            onClick={onClose}
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Especialidad — read-only */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Especialidad
              </label>
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-kp-border)",
                  background: "var(--color-surface-0)",
                  fontSize: 14,
                  color: "var(--color-ink-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>{profesional.especialidad}</span>
                <span
                  style={{ fontSize: 11, color: "var(--color-ink-3)", fontStyle: "italic" }}
                >
                  Solo Synapta puede cambiarla
                </span>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label
                htmlFor="edit-nombre"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Nombre
              </label>
              <input
                id="edit-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-kp-border)",
                  background: "var(--color-surface-1)",
                  fontSize: 14,
                  color: "var(--color-ink-1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Número de registro */}
            <div>
              <label
                htmlFor="edit-numero-registro"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Número de registro
              </label>
              <input
                id="edit-numero-registro"
                type="text"
                value={numeroRegistro}
                onChange={(e) => setNumeroRegistro(e.target.value)}
                maxLength={50}
                placeholder="Ej: 12345"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-kp-border)",
                  background: "var(--color-surface-1)",
                  fontSize: 14,
                  color: "var(--color-ink-1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Tipo de registro */}
            <div>
              <label
                htmlFor="edit-tipo-registro"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Tipo de registro
              </label>
              <select
                id="edit-tipo-registro"
                value={tipoRegistro}
                onChange={(e) => setTipoRegistro(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-kp-border)",
                  background: "var(--color-surface-1)",
                  fontSize: 14,
                  color: tipoRegistro ? "var(--color-ink-1)" : "var(--color-ink-3)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="">Sin especificar</option>
                {TIPOS_REGISTRO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  fontSize: 13,
                  color: "var(--color-kp-danger)",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "14px 20px",
              borderTop: "1px solid var(--color-kp-border)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-kp-border)",
                background: "var(--color-surface-1)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-ink-2)",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--color-kp-primary)",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ProfesionalesConfigurador ─────────────────────────────────────────────────

export function ProfesionalesConfigurador({ profesionales }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState<Profesional | null>(null);
  // Optimistic state: track activo overrides per profesional id
  const [activoOverrides, setActivoOverrides] = useState<
    Record<string, boolean>
  >({});
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set());

  function handleToggle(prof: Profesional) {
    if (pendingToggleIds.has(prof.id)) return;

    const currentActivo =
      activoOverrides[prof.id] !== undefined
        ? activoOverrides[prof.id]
        : prof.activo;

    // Optimistic update
    setActivoOverrides((prev) => ({ ...prev, [prof.id]: !currentActivo }));
    setToggleErrors((prev) => {
      const next = { ...prev };
      delete next[prof.id];
      return next;
    });
    setPendingToggleIds((prev) => new Set(prev).add(prof.id));

    startTransition(async () => {
      const result = await toggleProfesionalActivo(prof.id);
      if (!result.success) {
        // Revert optimistic
        setActivoOverrides((prev) => ({ ...prev, [prof.id]: currentActivo }));
        setToggleErrors((prev) => ({ ...prev, [prof.id]: result.error }));
      } else {
        setActivoOverrides((prev) => ({
          ...prev,
          [prof.id]: result.data.activo,
        }));
        router.refresh();
      }
      setPendingToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(prof.id);
        return next;
      });
    });
  }

  if (profesionales.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-ink-3)",
          fontSize: 14,
        }}
      >
        No hay profesionales registrados en esta clínica.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {profesionales.map((prof) => {
          const activo =
            activoOverrides[prof.id] !== undefined
              ? activoOverrides[prof.id]
              : prof.activo;
          const toggleError = toggleErrors[prof.id];

          return (
            <div
              key={prof.id}
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
                    {prof.nombre}
                  </span>

                  {/* Badge Login */}
                  {prof.auth_id !== null && (
                    <span
                      style={{
                        ...badgeBase,
                        background: "rgba(22,163,74,0.08)",
                        color: "var(--color-kp-success)",
                        border: "1px solid rgba(22,163,74,0.2)",
                      }}
                    >
                      <UserCheck size={11} />
                      Login
                    </span>
                  )}

                  {/* Badge Activo/Inactivo */}
                  <span
                    style={{
                      ...badgeBase,
                      background: activo
                        ? "rgba(22,163,74,0.08)"
                        : "rgba(239,68,68,0.07)",
                      color: activo
                        ? "var(--color-kp-success)"
                        : "var(--color-kp-danger)",
                      border: activo
                        ? "1px solid rgba(22,163,74,0.2)"
                        : "1px solid rgba(239,68,68,0.18)",
                    }}
                  >
                    {activo ? "Activo" : "Inactivo"}
                  </span>

                  {/* Badge Prescribe — read-only */}
                  {prof.puede_prescribir && (
                    <span
                      style={{
                        ...badgeBase,
                        background: "var(--color-kp-accent-xs, rgba(0,176,168,0.08))",
                        color: "var(--color-kp-accent, var(--color-kp-primary))",
                        border: "1px solid rgba(0,176,168,0.2)",
                      }}
                    >
                      <Pill size={11} />
                      Prescribe
                    </span>
                  )}

                  {/* Badge Examenes — read-only */}
                  {prof.puede_indicar_examenes && (
                    <span
                      style={{
                        ...badgeBase,
                        background: "var(--color-kp-accent-xs, rgba(0,176,168,0.08))",
                        color: "var(--color-kp-accent, var(--color-kp-primary))",
                        border: "1px solid rgba(0,176,168,0.2)",
                      }}
                    >
                      <FlaskConical size={11} />
                      Exámenes
                    </span>
                  )}
                </div>

                {/* Especialidad + registro */}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-2)",
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{prof.especialidad}</span>
                  {(prof.numero_registro || prof.tipo_registro) && (
                    <>
                      <span style={{ color: "var(--color-ink-3)" }}>·</span>
                      <span>
                        {[prof.tipo_registro, prof.numero_registro]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </>
                  )}
                </div>

                {/* Toggle error */}
                {toggleError && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--color-kp-danger)",
                    }}
                  >
                    {toggleError}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setEditando(prof)}
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
                  <Pencil size={13} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle(prof)}
                  disabled={pendingToggleIds.has(prof.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: activo
                      ? "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(22,163,74,0.3)",
                    background: activo
                      ? "rgba(239,68,68,0.06)"
                      : "rgba(22,163,74,0.06)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: activo
                      ? "var(--color-kp-danger)"
                      : "var(--color-kp-success)",
                    cursor: pendingToggleIds.has(prof.id) ? "not-allowed" : "pointer",
                    opacity: pendingToggleIds.has(prof.id) ? 0.6 : 1,
                  }}
                >
                  {activo ? (
                    <>
                      <ToggleRight size={14} />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={14} />
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editando && (
        <EditModal
          profesional={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}
