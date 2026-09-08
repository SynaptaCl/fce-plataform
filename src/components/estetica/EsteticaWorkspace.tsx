"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { saveFichaEstetica, upsertZona, deleteZona, getFichaEstetica, signFichaEstetica } from "@/app/actions/estetica/fichas";
import { getProcedimientosEsteticosCatalogo } from "@/app/actions/estetica/procedimientos";
import { MapaFacialInteractivo } from "./MapaFacialInteractivo";
import { MapaCorporalInteractivo } from "./MapaCorporalInteractivo";
import { ZonaDetailPanel } from "./ZonaDetailPanel";
import { FotoUploader } from "./FotoUploader";
import { FotoComparador } from "./FotoComparador";
import { FirmarEsteticaButton } from "./FirmarEsteticaButton";
import type { ZonaFormPayload } from "./ZonaDetailPanel";
import type { FichaEsteticaDetalle, FichaEsteticaZona, ProcedimientoEsteticoCatalogo, TipoFicha, RegionEstetica } from "@/types/estetica";
import type { Patient } from "@/types/patient";

interface Props {
  patientId: string;
  encuentroId: string;
  paciente: Patient;
  onClose: () => void;
}

export function EsteticaWorkspace({ patientId, encuentroId, paciente, onClose }: Props) {
  const [ficha, setFicha] = useState<FichaEsteticaDetalle | null>(null);
  const [catalogo, setCatalogo] = useState<ProcedimientoEsteticoCatalogo[]>([]);
  const [tipoFicha, setTipoFicha] = useState<TipoFicha>("facial");
  const [motivo, setMotivo] = useState("");
  const [selectedZona, setSelectedZona] = useState<{ region: RegionEstetica; codigo: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const readOnly = ficha?.firmado ?? false;

  const reload = useCallback(async () => {
    const [fichaRes, catalogoRes] = await Promise.all([
      getFichaEstetica(encuentroId),
      getProcedimientosEsteticosCatalogo(),
    ]);
    if (fichaRes.success && fichaRes.data) {
      setFicha(fichaRes.data);
      setTipoFicha(fichaRes.data.tipo_ficha);
      setMotivo(fichaRes.data.motivo ?? "");
    }
    if (catalogoRes.success) setCatalogo(catalogoRes.data);
    setLoading(false);
  }, [encuentroId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function ensureFicha(): Promise<string | null> {
    if (ficha) return ficha.id;
    const res = await saveFichaEstetica({
      encuentroId,
      patientId,
      tipoFicha,
      motivo: motivo || null,
      observacionesGenerales: null,
    });
    if (!res.success) return null;
    await reload();
    return res.data.id;
  }

  async function handleZonaClick(region: RegionEstetica, codigo: string) {
    const idFicha = await ensureFicha();
    if (!idFicha) return;
    setSelectedZona({ region, codigo });
  }

  function zonaFor(region: RegionEstetica, codigo: string): FichaEsteticaZona | null {
    return ficha?.zonas.find((z) => z.region === region && z.zona_codigo === codigo) ?? null;
  }

  async function handleSaveZona(payload: ZonaFormPayload) {
    if (!ficha || !selectedZona) return;
    const existente = zonaFor(selectedZona.region, selectedZona.codigo);
    await upsertZona(ficha.id, patientId, {
      id: existente?.id,
      region: selectedZona.region,
      zonaCodigo: selectedZona.codigo,
      ...payload,
    });
    setSelectedZona(null);
    await reload();
  }

  async function handleDeleteZona() {
    if (!selectedZona) return;
    const existente = zonaFor(selectedZona.region, selectedZona.codigo);
    if (existente) await deleteZona(existente.id, patientId);
    setSelectedZona(null);
    await reload();
  }

  async function handleFirmar() {
    if (!ficha) return;
    await signFichaEstetica(ficha.id, patientId);
    await reload();
  }

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
        style={{ background: "var(--color-surface-1)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-kp-border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink-1)" }}>
              Ficha estética
            </h2>
            <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              {[paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!readOnly && <FirmarEsteticaButton disabled={!ficha} onFirmar={handleFirmar} />}
            <button type="button" onClick={onClose}>
              <X className="w-5 h-5" style={{ color: "var(--color-ink-3)" }} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
                Tipo de ficha
              </label>
              <select
                value={tipoFicha}
                onChange={(e) => setTipoFicha(e.target.value as TipoFicha)}
                disabled={readOnly}
                onBlur={ensureFicha}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
              >
                <option value="facial">Facial</option>
                <option value="corporal">Corporal</option>
                <option value="mixta">Mixta</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
                Motivo
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={readOnly}
                onBlur={ensureFicha}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
              />
            </div>
          </div>

          {(tipoFicha === "facial" || tipoFicha === "mixta") && (
            <MapaFacialInteractivo
              zonasTratadas={ficha?.zonas.filter((z) => z.region === "facial") ?? []}
              onZonaClick={(codigo) => handleZonaClick("facial", codigo)}
              readOnly={readOnly}
            />
          )}
          {(tipoFicha === "corporal" || tipoFicha === "mixta") && (
            <MapaCorporalInteractivo
              zonasTratadas={ficha?.zonas.filter((z) => z.region === "corporal") ?? []}
              onZonaClick={(codigo) => handleZonaClick("corporal", codigo)}
              readOnly={readOnly}
            />
          )}

          {selectedZona && (
            <ZonaDetailPanel
              region={selectedZona.region}
              zonaCodigo={selectedZona.codigo}
              zonaExistente={zonaFor(selectedZona.region, selectedZona.codigo)}
              catalogo={catalogo}
              readOnly={readOnly}
              onSave={handleSaveZona}
              onDelete={handleDeleteZona}
              onClose={() => setSelectedZona(null)}
            />
          )}

          {ficha && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                Fotografías
              </h3>
              <FotoUploader idFicha={ficha.id} patientId={patientId} onUploaded={reload} />
              <FotoComparador idFicha={ficha.id} />
            </div>
          )}

          {readOnly && (
            <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              Ficha firmada — solo lectura. Usa una adenda desde el timeline para correcciones.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
