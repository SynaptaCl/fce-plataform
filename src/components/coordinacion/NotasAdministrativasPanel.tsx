"use client";

import { useState } from "react";
import { crearNotaAdministrativa } from "@/app/actions/coordinacion/notas";
import { Button } from "@/components/ui/Button";
import type { NotaAdministrativa } from "@/types/nota-administrativa";

interface NotasAdministrativasPanelProps {
  patientId: string;
  notasIniciales: NotaAdministrativa[];
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

export function NotasAdministrativasPanel({
  patientId,
  notasIniciales,
}: NotasAdministrativasPanelProps) {
  const [notas, setNotas] = useState(notasIniciales);
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!contenido.trim()) return;
    setEnviando(true);
    setError(null);
    const result = await crearNotaAdministrativa(patientId, contenido);
    setEnviando(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNotas((prev) => [result.data, ...prev]);
    setContenido("");
  }

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
        Registro administrativo
      </h3>
      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
        Anotaciones de gestión (llamadas, reagendas, entregas) — no es documentación clínica.
      </p>

      <div className="flex flex-col gap-2">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Ej: Llamó el apoderado, pidió reagendar para la próxima semana."
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={enviando || !contenido.trim()}
          >
            {enviando ? "Guardando…" : "Agregar registro"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {notas.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Sin registros administrativos.
          </p>
        ) : (
          notas.map((nota) => (
            <div
              key={nota.id}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--color-surface-0)" }}
            >
              <p style={{ color: "var(--color-ink-1)" }}>{nota.contenido}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                {nota.autor?.nombre ?? "—"} · {formatFechaHora(nota.created_at)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
