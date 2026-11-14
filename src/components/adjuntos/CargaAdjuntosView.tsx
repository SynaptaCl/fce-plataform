"use client";

/**
 * ADJ-1 — CargaAdjuntosView: vista de carga de exámenes para recepcionista
 * (y atajo director). Ruta /dashboard/adjuntos — única ruta del dashboard
 * accesible para recepcionista (excepción del layout, plan D6).
 * La recepcionista ve metadatos de SUS envíos pendientes, no los archivos
 * (minimización PHI — hasta validación profesional).
 */

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Search, Trash2, Upload } from "lucide-react";
import {
  buscarPacientesParaAdjuntos,
  getMisAdjuntosPendientes,
  eliminarAdjunto,
  type PacienteBusquedaAdjuntos,
} from "@/app/actions/adjuntos";
import { AdjuntoUploader } from "./AdjuntoUploader";
import { CATEGORIA_ADJUNTO_LABELS } from "@/types/adjunto";
import type { Adjunto } from "@/types/adjunto";

export function CargaAdjuntosView() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<PacienteBusquedaAdjuntos[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<PacienteBusquedaAdjuntos | null>(null);
  const [pendientes, setPendientes] = useState<Adjunto[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPendientes = useCallback(async () => {
    const res = await getMisAdjuntosPendientes();
    if (res.success) setPendientes(res.data);
  }, []);

  useEffect(() => {
    void loadPendientes();
  }, [loadPendientes]);

  async function buscar() {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const res = await buscarPacientesParaAdjuntos(query);
    setBuscando(false);
    if (res.success) setResultados(res.data);
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este envío pendiente? Podrás subirlo de nuevo.")) return;
    setBusyId(id);
    const res = await eliminarAdjunto(id);
    setBusyId(null);
    if (res.success) void loadPendientes();
    else window.alert(res.error);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-1 inline-flex items-center gap-2">
          <Upload className="size-6" style={{ color: "var(--color-kp-accent)" }} />
          Carga de exámenes e imágenes
        </h2>
        <p className="text-sm text-ink-3 mt-0.5">
          Sube exámenes o imágenes traídos por el paciente. Quedan pendientes hasta que un
          profesional los valide.
        </p>
      </div>

      {/* Búsqueda de paciente */}
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-kp-border)" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void buscar();
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente por nombre o RUT…"
            className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg text-white"
            style={{ background: "var(--color-kp-accent)" }}
          >
            {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </button>
        </form>

        {resultados.length > 0 && (
          <ul className="divide-y" style={{ borderColor: "var(--color-kp-border)" }}>
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSeleccionado(p);
                    setResultados([]);
                    setQuery("");
                  }}
                  className="w-full text-left px-2 py-2 text-sm hover:bg-surface-0 rounded"
                  style={{ color: "var(--color-ink-1)" }}
                >
                  {p.nombre_completo} {p.rut && <span style={{ color: "var(--color-ink-3)" }}>· {p.rut}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upload al paciente seleccionado */}
      {seleccionado && (
        <section
          className="rounded-xl border p-4 space-y-4"
          style={{ background: "var(--color-surface-1)", borderColor: "var(--color-kp-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold" style={{ color: "var(--color-ink-1)" }}>
              {seleccionado.nombre_completo}
              {seleccionado.rut && (
                <span className="font-normal" style={{ color: "var(--color-ink-3)" }}> · {seleccionado.rut}</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              className="text-xs font-medium underline"
              style={{ color: "var(--color-kp-accent)" }}
            >
              Cambiar paciente
            </button>
          </div>
          <AdjuntoUploader patientId={seleccionado.id} onUploaded={() => void loadPendientes()} />
        </section>
      )}

      {/* Mis envíos pendientes */}
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-kp-border)" }}
      >
        <h3 className="text-sm font-bold inline-flex items-center gap-2" style={{ color: "var(--color-ink-1)" }}>
          <Clock className="size-4" style={{ color: "var(--color-kp-warning)" }} />
          Mis envíos pendientes de validación ({pendientes.length})
        </h3>
        {pendientes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
            No tienes envíos pendientes.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendientes.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--color-kp-border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--color-ink-1)" }}>
                    {a.descripcion || a.nombre_archivo_original}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    {CATEGORIA_ADJUNTO_LABELS[a.categoria]} · {a.fecha_documento} · enviado{" "}
                    {new Date(a.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void eliminar(a.id)}
                  disabled={busyId === a.id}
                  className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-40"
                  style={{ color: "var(--color-kp-danger)" }}
                >
                  {busyId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
