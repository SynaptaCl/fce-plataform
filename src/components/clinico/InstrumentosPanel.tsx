'use client';

import { useState, useEffect, useCallback } from "react";
import { InstrumentoLauncher } from "@/components/clinico/InstrumentoLauncher";
import { InstrumentoResultadoCard } from "@/components/clinico/InstrumentoResultadoCard";
import { getInstrumentosAplicados } from "@/app/actions/clinico/instrumentos";
import type { InstrumentoAplicado } from "@/types/instrumento";

interface InstrumentosPanelProps {
  encuentroId: string;
  patientId: string;
  especialidad: string;
  encuentroFinalizado: boolean;
  instrumentosSugeridos?: string[];
}

export function InstrumentosPanel({
  encuentroId,
  patientId,
  especialidad,
  encuentroFinalizado,
  instrumentosSugeridos = [],
}: InstrumentosPanelProps) {
  const [instrumentos, setInstrumentos] = useState<InstrumentoAplicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [launcherAbierto, setLauncherAbierto] = useState(false);
  const [codigoPre, setCodigoPre] = useState<string | undefined>(undefined);

  const cargar = useCallback(async () => {
    setLoading(true);
    const result = await getInstrumentosAplicados(encuentroId);
    if (result.success) setInstrumentos(result.data);
    setLoading(false);
  }, [encuentroId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  function abrirInstrumento(codigo?: string) {
    setCodigoPre(codigo);
    setLauncherAbierto(true);
  }

  function cerrarLauncher() {
    setLauncherAbierto(false);
    setCodigoPre(undefined);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          Instrumentos aplicados
        </h3>
        {!encuentroFinalizado && (
          <button
            type="button"
            className="text-sm font-medium px-3 py-1.5 rounded-md"
            style={{ background: "var(--color-kp-accent)", color: "#fff" }}
            onClick={() => abrirInstrumento(undefined)}
          >
            Aplicar instrumento
          </button>
        )}
      </div>

      {instrumentosSugeridos.length > 0 && (
        <div className="rounded-md p-2.5 space-y-1" style={{ background: "var(--color-kp-accent-xs)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--color-kp-primary)" }}>
            Sugeridos para este servicio
          </p>
          <div className="flex flex-wrap gap-1">
            {instrumentosSugeridos.map((codigo) =>
              encuentroFinalizado ? (
                <span
                  key={codigo}
                  className="text-xs px-2 py-0.5 rounded-full font-medium uppercase"
                  style={{ background: "var(--color-kp-primary)", color: "#fff", opacity: 0.6 }}
                >
                  {codigo}
                </span>
              ) : (
                <button
                  key={codigo}
                  type="button"
                  onClick={() => abrirInstrumento(codigo)}
                  className="text-xs px-2 py-0.5 rounded-full font-medium uppercase transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-kp-primary)", color: "#fff" }}
                  title={`Aplicar ${codigo.toUpperCase()}`}
                >
                  {codigo}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Launcher en modo controlado — el trigger vive en los botones de arriba */}
      {!encuentroFinalizado && (
        <InstrumentoLauncher
          encuentroId={encuentroId}
          patientId={patientId}
          especialidad={especialidad}
          onGuardado={cargar}
          instrumentosSugeridos={instrumentosSugeridos}
          openControlado={launcherAbierto}
          onCerrar={cerrarLauncher}
          codigoPreseleccionado={codigoPre}
        />
      )}

      {loading ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--color-ink-3)" }}>Cargando...</p>
      ) : instrumentos.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--color-ink-3)" }}>
          Sin instrumentos aplicados en este encuentro
        </p>
      ) : (
        <div className="space-y-2">
          {instrumentos.map((i) => (
            <InstrumentoResultadoCard
              key={i.id}
              instrumento={i}
              encuentroFinalizado={encuentroFinalizado}
              onEliminado={cargar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
