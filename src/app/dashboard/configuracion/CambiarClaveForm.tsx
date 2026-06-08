"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CambiarClaveForm() {
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setStatus("idle");

    if (nuevaClave.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaClave !== confirmarClave) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setNuevaClave("");
      setConfirmarClave("");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--color-kp-border, #E2E8F0)",
    fontSize: 13,
    outline: "none",
    background: "var(--color-surface-0, #F1F5F9)",
    color: "var(--color-ink-1, #1E293B)",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-ink-3, #94A3B8)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Nueva contraseña</label>
        <input
          type="password"
          value={nuevaClave}
          onChange={(e) => setNuevaClave(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Confirmar contraseña</label>
        <input
          type="password"
          value={confirmarClave}
          onChange={(e) => setConfirmarClave(e.target.value)}
          placeholder="Repite la nueva contraseña"
          required
          style={inputStyle}
        />
      </div>

      {errorMsg && (
        <p style={{ fontSize: 12, color: "var(--color-kp-danger, #E53935)", margin: 0 }}>
          {errorMsg}
        </p>
      )}
      {status === "success" && (
        <p style={{ fontSize: 12, color: "var(--color-kp-success, #43A047)", margin: 0 }}>
          Contraseña actualizada correctamente.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            background:
              status === "loading"
                ? "var(--color-ink-3, #94A3B8)"
                : "var(--color-kp-primary, #00B0A8)",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {status === "loading" ? "Guardando..." : "Actualizar contraseña"}
        </button>
      </div>
    </form>
  );
}
