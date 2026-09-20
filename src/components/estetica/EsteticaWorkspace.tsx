"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { saveFichaEstetica, upsertZona, deleteZona, getFichaEstetica, signFichaEstetica } from "@/app/actions/estetica/fichas";
import { getProcedimientosEsteticosCatalogo } from "@/app/actions/estetica/procedimientos";
import { getFotosFicha } from "@/app/actions/estetica/fotos";
import { getConsentimientos } from "@/app/actions/consentimiento";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { MapaFacialInteractivo } from "./MapaFacialInteractivo";
import { MapaCorporalInteractivo } from "./MapaCorporalInteractivo";
import { ZonaDetailPanel } from "./ZonaDetailPanel";
import { FotoUploader } from "./FotoUploader";
import { FotoComparador } from "./FotoComparador";
import { FirmarEsteticaButton } from "./FirmarEsteticaButton";
import { EsteticaStepper, type EsteticaStep } from "./EsteticaStepper";
import type { ZonaFormPayload } from "./ZonaDetailPanel";
import type { FichaEsteticaDetalle, FichaEsteticaZona, ProcedimientoEsteticoCatalogo, TipoFicha, RegionEstetica } from "@/types/estetica";
import type { Patient } from "@/types/patient";

interface Props {
  patientId: string;
  encuentroId: string;
  paciente: Patient;
  onClose: () => void;
}

const STEP_ORDER: EsteticaStep[] = ["datos", "zonas", "fotos", "firma"];

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
  const [fotosCount, setFotosCount] = useState(0);
  const [tieneConsentimiento, setTieneConsentimiento] = useState(false);
  const [step, setStep] = useState<EsteticaStep>("datos");

  // C5 (parte B) — guard en memoria contra el race de crear la ficha dos
  // veces: ensureFicha se dispara desde varios handlers (onBlur en tipo de
  // ficha / motivo / observaciones, más handleZonaClick). Sin esto, dos
  // llamadas casi simultáneas podían disparar dos INSERT antes de que
  // cualquiera resolviera. Las llamadas concurrentes esperan la misma
  // promesa en vez de iniciar un nuevo guardado.
  const creatingRef = useRef<Promise<string | null> | null>(null);

  const readOnly = ficha?.firmado ?? false;

  const reload = useCallback(async () => {
    const [fichaRes, catalogoRes, consentRes] = await Promise.all([
      getFichaEstetica(encuentroId),
      getProcedimientosEsteticosCatalogo(),
      getConsentimientos(patientId),
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
    if (consentRes.success) {
      setTieneConsentimiento(
        consentRes.data.some((c) => c.tipo === "procedimiento_estetico" && c.firmado),
      );
    }
    setLoading(false);
  }, [encuentroId, patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  useEffect(() => {
    if (!ficha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFotosCount(0);
      return;
    }
    getFotosFicha(ficha.id).then((res) => {
      if (res.success) setFotosCount(res.data.length);
    });
  }, [ficha, fotosRefreshKey]);

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

  const nombreCompleto = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
    .filter(Boolean)
    .join(" ");

  const zonasCount = ficha?.zonas.length ?? 0;
  const stepIndex = STEP_ORDER.indexOf(step);

  const completed: Partial<Record<EsteticaStep, boolean>> = {
    datos: Boolean(ficha),
    zonas: zonasCount > 0,
    fotos: fotosCount > 0,
    firma: readOnly,
  };

  function goTo(delta: 1 | -1) {
    const next = STEP_ORDER[stepIndex + delta];
    if (next) setStep(next);
  }

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-xl"
        style={{ background: "var(--color-surface-1)" }}
      >
        <div className="shrink-0 border-b" style={{ borderColor: "var(--color-kp-border)" }}>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold" style={{ color: "var(--color-ink-1)" }}>
                  Ficha estética
                </h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: readOnly ? "var(--color-kp-success-lt)" : "var(--color-kp-warning-lt)",
                    color: readOnly ? "var(--color-kp-success)" : "var(--color-kp-warning)",
                  }}
                >
                  {readOnly ? "Firmada" : "Borrador"}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
                {nombreCompleto}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!readOnly && (
                <FirmarEsteticaButton
                  disabled={!ficha || zonasCount === 0}
                  onFirmar={handleFirmar}
                  resumen={{ zonasCount, fotosCount, tieneConsentimiento }}
                />
              )}
              <button type="button" onClick={onClose}>
                <X className="w-5 h-5" style={{ color: "var(--color-ink-3)" }} />
              </button>
            </div>
          </div>
          <div className="px-6 pb-3">
            <EsteticaStepper current={step} onChange={setStep} completed={completed} />
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <AlertBanner variant="danger" title="No se pudo completar la acción">
              {error}
            </AlertBanner>
          )}

          {step === "datos" && (
            <div className="space-y-4">
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
                    Motivo de consulta
                  </label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    disabled={readOnly}
                    onBlur={ensureFicha}
                    placeholder="Ej: Rejuvenecimiento facial, reducción de volumen..."
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
                  rows={4}
                  placeholder="Antecedentes relevantes, expectativas del paciente, plan general..."
                  className="mt-1 w-full text-sm px-3 py-2 rounded-lg border resize-none"
                  style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
                />
              </div>
            </div>
          )}

          {step === "zonas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                  Mapa de zonas
                </h3>
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {zonasCount} {zonasCount === 1 ? "zona registrada" : "zonas registradas"}
                </span>
              </div>

              <div className={selectedZona ? "grid gap-4 md:grid-cols-2 items-start" : "flex justify-center"}>
                <div className={tipoFicha === "mixta" ? "grid gap-4 sm:grid-cols-2 place-items-center" : "flex justify-center"}>
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
              </div>

              {!selectedZona && zonasCount === 0 && (
                <p className="text-xs text-center" style={{ color: "var(--color-ink-3)" }}>
                  Haz clic en un punto del mapa para registrar el procedimiento aplicado en esa zona.
                </p>
              )}
            </div>
          )}

          {step === "fotos" && (
            ficha ? (
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
            ) : (
              <p className="text-xs text-center" style={{ color: "var(--color-ink-3)" }}>
                Completa el paso &ldquo;Datos&rdquo; antes de subir fotografías.
              </p>
            )
          )}

          {step === "firma" && (
            <div className="space-y-4">
              <div
                className="rounded-xl border p-4 space-y-2"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                  Resumen
                </h3>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt style={{ color: "var(--color-ink-3)" }}>Tipo de ficha</dt>
                  <dd style={{ color: "var(--color-ink-1)" }}>{tipoFicha}</dd>
                  <dt style={{ color: "var(--color-ink-3)" }}>Zonas tratadas</dt>
                  <dd style={{ color: "var(--color-ink-1)" }}>{zonasCount}</dd>
                  <dt style={{ color: "var(--color-ink-3)" }}>Fotografías</dt>
                  <dd style={{ color: "var(--color-ink-1)" }}>{fotosCount}</dd>
                  <dt style={{ color: "var(--color-ink-3)" }}>Consentimiento estético</dt>
                  <dd style={{ color: tieneConsentimiento ? "var(--color-kp-success)" : "var(--color-kp-warning)" }}>
                    {tieneConsentimiento ? "Firmado" : "No registrado"}
                  </dd>
                </dl>
              </div>

              {readOnly ? (
                <AlertBanner variant="success" title="Ficha firmada">
                  Esta ficha estética quedó inmutable. Para corregir o complementar información, usa una adenda desde
                  el timeline del paciente.
                </AlertBanner>
              ) : zonasCount === 0 ? (
                <AlertBanner variant="warning" title="Falta registrar zonas">
                  Debes registrar al menos una zona tratada en el paso &ldquo;Zonas&rdquo; antes de poder firmar.
                </AlertBanner>
              ) : (
                <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  Revisa el resumen y usa el botón &ldquo;Firmar ficha&rdquo; en la parte superior cuando esté todo
                  correcto.
                </p>
              )}
            </div>
          )}
        </div>

        <div
          className="shrink-0 flex items-center justify-between px-6 py-3 border-t"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          <button
            type="button"
            onClick={() => goTo(-1)}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-xs font-medium disabled:opacity-30"
            style={{ color: "var(--color-ink-2)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            disabled={stepIndex === STEP_ORDER.length - 1}
            className="flex items-center gap-1 text-xs font-medium disabled:opacity-30"
            style={{ color: "var(--color-ink-2)" }}
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
