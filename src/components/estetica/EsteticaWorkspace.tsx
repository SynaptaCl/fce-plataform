"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { saveFichaEstetica, upsertZona, deleteZona, getFichaEstetica, signFichaEstetica } from "@/app/actions/estetica/fichas";
import { getProcedimientosEsteticosCatalogo } from "@/app/actions/estetica/procedimientos";
import { AlertBanner } from "@/components/ui/AlertBanner";
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
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [selectedZona, setSelectedZona] = useState<{ region: RegionEstetica; codigo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  // I1 — cada action que puede fallar debe reflejarse acá. Antes los
  // ActionResult de handleSaveZona/handleDeleteZona/handleFirmar/reload se
  // descartaban sin chequear `success`, así que un rechazo del guard de C3/C4
  // (módulo inactivo, sin permiso, ficha firmada, tenancy) fallaba en
  // silencio y la UI seguía como si nada.
  const [error, setError] = useState<string | null>(null);
  // I2 — bump tras cada upload exitoso para forzar el refetch de FotoComparador.
  const [fotosRefreshKey, setFotosRefreshKey] = useState(0);

  // C5 (parte B) — guard en memoria contra el race de crear la ficha dos
  // veces: ensureFicha se dispara desde varios handlers (onBlur en tipo de
  // ficha / motivo / observaciones, más handleZonaClick). Sin esto, dos
  // llamadas casi simultáneas podían disparar dos INSERT antes de que
  // cualquiera resolviera. Las llamadas concurrentes esperan la misma
  // promesa en vez de iniciar un nuevo guardado.
  const creatingRef = useRef<Promise<string | null> | null>(null);

  const readOnly = ficha?.firmado ?? false;

  const reload = useCallback(async () => {
    const [fichaRes, catalogoRes] = await Promise.all([
      getFichaEstetica(encuentroId),
      getProcedimientosEsteticosCatalogo(),
    ]);
    if (fichaRes.success) {
      if (fichaRes.data) {
        setFicha(fichaRes.data);
        setTipoFicha(fichaRes.data.tipo_ficha);
        setMotivo(fichaRes.data.motivo ?? "");
        setObservacionesGenerales(fichaRes.data.observaciones_generales ?? "");
      }
    } else {
      setError(fichaRes.error);
    }
    if (catalogoRes.success) {
      setCatalogo(catalogoRes.data);
    } else {
      setError(catalogoRes.error);
    }
    setLoading(false);
  }, [encuentroId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function ensureFicha(): Promise<string | null> {
    // Ya hay un guardado en curso (p.ej. blur casi simultáneo en dos campos,
    // o un click de zona mientras el blur anterior no resolvió) — esperar su
    // resultado en vez de disparar un segundo INSERT/UPDATE concurrente.
    if (creatingRef.current) return creatingRef.current;

    const promise = (async () => {
      // C2 — antes: `if (ficha) return ficha.id;` hacía que esta función
      // solo creara la ficha una vez y luego se auto-anulara en cada llamada
      // subsiguiente. tipo_ficha/motivo/observaciones quedaban wireados a
      // onBlur pero cualquier edición posterior al primer guardado se perdía
      // sin ningún error. Ahora siempre persiste el estado actual — el server
      // action ya soporta create-or-update.
      const res = await saveFichaEstetica({
        encuentroId,
        patientId,
        tipoFicha,
        motivo: motivo || null,
        observacionesGenerales: observacionesGenerales || null,
      });
      if (!res.success) {
        setError(res.error);
        return null;
      }
      setError(null);
      await reload();
      return res.data.id;
    })();

    creatingRef.current = promise;
    try {
      return await promise;
    } finally {
      creatingRef.current = null;
    }
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
    const res = await upsertZona(ficha.id, patientId, {
      id: existente?.id,
      region: selectedZona.region,
      zonaCodigo: selectedZona.codigo,
      ...payload,
    });
    if (!res.success) {
      setError(res.error);
      return;
    }
    setError(null);
    setSelectedZona(null);
    await reload();
  }

  async function handleDeleteZona() {
    if (!selectedZona) return;
    const existente = zonaFor(selectedZona.region, selectedZona.codigo);
    if (existente) {
      const res = await deleteZona(existente.id, patientId);
      if (!res.success) {
        setError(res.error);
        return;
      }
    }
    setError(null);
    setSelectedZona(null);
    await reload();
  }

  async function handleFirmar() {
    if (!ficha) return;
    const res = await signFichaEstetica(ficha.id, patientId);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setError(null);
    await reload();
  }

  function handleFotoUploaded() {
    setFotosRefreshKey((k) => k + 1);
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
          {error && (
            <AlertBanner variant="danger" title="No se pudo completar la acción">
              {error}
            </AlertBanner>
          )}

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

          <div>
            <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
              Observaciones generales
            </label>
            <textarea
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              disabled={readOnly}
              onBlur={ensureFicha}
              rows={3}
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg border resize-none"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
            />
          </div>

          <div className={tipoFicha === "mixta" ? "grid gap-4 md:grid-cols-2 place-items-center" : "flex justify-center"}>
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
          </div>

          {selectedZona && (
            <ZonaDetailPanel
              // C1 — sin key, React reutiliza la instancia de ZonaDetailPanel
              // al cambiar de zona seleccionada y sus useState (seedeados
              // desde zonaExistente) no se re-inicializan: el form de la
              // zona B mostraba/guardaba silenciosamente los valores de la
              // zona A. La key fuerza un remount por cada zona distinta.
              key={`${selectedZona.region}-${selectedZona.codigo}`}
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
              {/* I3 — el uploader solo se renderiza si la ficha no está firmada
                  (antes solo se gateaba en `ficha` existiendo, no en readOnly). */}
              {!readOnly && (
                <FotoUploader idFicha={ficha.id} patientId={patientId} onUploaded={handleFotoUploaded} />
              )}
              <FotoComparador idFicha={ficha.id} refreshKey={fotosRefreshKey} />
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
