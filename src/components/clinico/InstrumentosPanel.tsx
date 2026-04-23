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
}

export function InstrumentosPanel({
  encuentroId,
  patientId,
  especialidad,
  encuentroFinalizado,
}: InstrumentosPanelProps) {
  const [instrumentos, setInstrumentos] = useState<InstrumentoAplicado[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const result = await getInstrumentosAplicados(encuentroId);
    if (result.success) setInstrumentos(result.data);
    setLoading(false);
  }, [encuentroId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
          Instrumentos aplicados
        </h3>
        {!encuentroFinalizado && (
          <InstrumentoLauncher
            encuentroId={encuentroId}
            patientId={patientId}
            especialidad={especialidad}
            onGuardado={cargar}
          />
        )}
      </div>

      {loading ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--ink-3)" }}>Cargando...</p>
      ) : instrumentos.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--ink-3)" }}>
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
