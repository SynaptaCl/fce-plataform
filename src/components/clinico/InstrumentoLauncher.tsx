'use client';

import { useState, useEffect, type ComponentType } from "react";
import { EscalaSimpleRenderer } from "@/components/clinico/EscalaSimpleRenderer";
import { getCustomComponentLoader } from "@/lib/instrumentos/registry-custom";
import { getCatalogoInstrumentos, aplicarInstrumento } from "@/app/actions/clinico/instrumentos";
import type { InstrumentoSchema, InstrumentoCustomProps } from "@/types/instrumento";

interface InstrumentoLauncherProps {
  encuentroId: string;
  patientId: string;
  especialidad: string;
  onGuardado?: () => void;
  trigger?: React.ReactNode;
}

export function InstrumentoLauncher({
  encuentroId,
  patientId,
  especialidad,
  onGuardado,
  trigger,
}: InstrumentoLauncherProps) {
  const [open, setOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<InstrumentoSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<InstrumentoSchema | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [notas, setNotas] = useState("");
  const [mostrarEnTimeline, setMostrarEnTimeline] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [CustomComp, setCustomComp] = useState<ComponentType<InstrumentoCustomProps> | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCatalogoInstrumentos(especialidad).then((result) => {
      if (result.success) setCatalogo(result.data);
      setLoading(false);
    });
  }, [open, especialidad]);

  useEffect(() => {
    if (
      !instrumentoSeleccionado ||
      instrumentoSeleccionado.tipo_renderer !== "componente_custom"
    ) {
      setCustomComp(null);
      return;
    }
    const loader = getCustomComponentLoader(instrumentoSeleccionado.componente_id ?? "");
    if (!loader) return;
    loader().then((mod) => setCustomComp(() => mod.default));
  }, [instrumentoSeleccionado]);

  const catalogoFiltrado = catalogo.filter(
    (i) =>
      i.nombre.toLowerCase().includes(query.toLowerCase()) ||
      i.codigo.toLowerCase().includes(query.toLowerCase()),
  );

  function seleccionar(instrumento: InstrumentoSchema) {
    setInstrumentoSeleccionado(instrumento);
    setRespuestas({});
    setNotas("");
    setMostrarEnTimeline(true);
    setError(null);
  }

  async function handleGuardar() {
    if (!instrumentoSeleccionado) return;
    setGuardando(true);
    setError(null);
    const result = await aplicarInstrumento({
      encuentroId,
      patientId,
      instrumentoId: instrumentoSeleccionado.id,
      respuestas,
      notas: notas || undefined,
      mostrarEnTimeline,
    });
    setGuardando(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onGuardado?.();
    handleClose();
  }

  function handleClose() {
    setOpen(false);
    setInstrumentoSeleccionado(null);
    setRespuestas({});
    setNotas("");
    setQuery("");
    setError(null);
    setCustomComp(null);
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            className="text-sm font-medium px-3 py-1.5 rounded-md"
            style={{ background: "var(--kp-accent)", color: "#fff" }}
          >
            Aplicar instrumento
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl"
            style={{ background: "var(--surface-1)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "var(--kp-border)" }}
            >
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                {instrumentoSeleccionado
                  ? instrumentoSeleccionado.nombre
                  : "Seleccionar instrumento"}
              </h2>
              <button
                onClick={handleClose}
                className="text-lg leading-none"
                style={{ color: "var(--ink-3)" }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Lista de catálogo (si no hay instrumento seleccionado) */}
              {!instrumentoSeleccionado && (
                <>
                  <input
                    type="text"
                    placeholder="Buscar instrumento..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      borderColor: "var(--kp-border)",
                      color: "var(--ink-1)",
                    }}
                  />
                  {loading ? (
                    <p
                      className="text-sm text-center py-4"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Cargando...
                    </p>
                  ) : catalogoFiltrado.length === 0 ? (
                    <p
                      className="text-sm text-center py-4"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Sin resultados
                    </p>
                  ) : (
                    <ul
                      className="divide-y"
                      style={{ borderColor: "var(--kp-border)" }}
                    >
                      {catalogoFiltrado.map((instrumento) => (
                        <li key={instrumento.id}>
                          <button
                            onClick={() => seleccionar(instrumento)}
                            className="w-full text-left px-2 py-3 hover:bg-gray-50 rounded"
                          >
                            <p
                              className="text-sm font-medium"
                              style={{ color: "var(--ink-1)" }}
                            >
                              {instrumento.nombre}
                            </p>
                            {instrumento.descripcion && (
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--ink-3)" }}
                              >
                                {instrumento.descripcion}
                              </p>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* Renderer del instrumento seleccionado */}
              {instrumentoSeleccionado && (
                <>
                  <button
                    onClick={() => {
                      setInstrumentoSeleccionado(null);
                      setRespuestas({});
                    }}
                    className="text-xs underline"
                    style={{ color: "var(--ink-3)" }}
                  >
                    ← Volver al catálogo
                  </button>

                  {instrumentoSeleccionado.tipo_renderer === "escala_simple" ? (
                    <EscalaSimpleRenderer
                      schema={instrumentoSeleccionado}
                      valor={respuestas}
                      onChange={setRespuestas}
                    />
                  ) : CustomComp ? (
                    <CustomComp
                      schema={instrumentoSeleccionado}
                      valor={respuestas}
                      onChange={setRespuestas}
                    />
                  ) : (
                    <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                      Cargando componente...
                    </p>
                  )}

                  {/* Notas */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "var(--ink-1)" }}
                    >
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        borderColor: "var(--kp-border)",
                        color: "var(--ink-1)",
                      }}
                    />
                  </div>

                  {/* Toggle mostrar en timeline */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mostrarEnTimeline}
                      onChange={(e) => setMostrarEnTimeline(e.target.checked)}
                      className="accent-[var(--kp-accent)]"
                    />
                    <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                      Mostrar en Timeline
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  {/* Botones de acción */}
                  <div
                    className="flex justify-end gap-2 pt-2 border-t"
                    style={{ borderColor: "var(--kp-border)" }}
                  >
                    <button
                      onClick={handleClose}
                      className="text-sm px-4 py-2 rounded-md border"
                      style={{
                        borderColor: "var(--kp-border)",
                        color: "var(--ink-2)",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardar}
                      disabled={guardando}
                      className="text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50"
                      style={{ background: "var(--kp-accent)", color: "#fff" }}
                    >
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
