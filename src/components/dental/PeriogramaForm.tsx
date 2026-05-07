'use client';

import { useState, useTransition, useMemo, useCallback } from "react";
import { Save, ShieldCheck, AlertCircle, CheckCircle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { PeriogramaChart } from "@/components/dental/PeriogramaChart";
import { cn } from "@/lib/utils";
import {
  ARCO_SUPERIOR,
  ARCO_INFERIOR,
  MIDLINE_SUPERIOR,
  MIDLINE_INFERIOR,
  esMolar,
  calcularIndiceSangrado,
  calcularProfundidadMedia,
  calcularSitiosPatologicos,
  initDatos,
} from "@/lib/dental/periograma";
import { savePeriograma, signPeriograma } from "@/app/actions/dental/periograma";
import type { Periograma, PeriogramaPiezaDatos } from "@/types/periograma";
import { DiagnosticoSearch } from '@/components/dental/DiagnosticoSearch';
import type { ICDCodeSnap } from '@/lib/icd/types';

type Face = "vestibular" | "lingual";
type PointIdx = 0 | 1 | 2;

interface Props {
  encuentroId: string;
  patientId: string;
  periogramaExistente: Periograma | null;
  readOnly: boolean;
}

// -- Input color by probing depth severity
function sondajeClass(v: number): string {
  if (v >= 6) return "bg-red-50 text-red-700 border-red-300 font-semibold";
  if (v >= 4) return "bg-amber-50 text-amber-700 border-amber-300 font-semibold";
  if (v > 0)  return "bg-green-50 text-green-700 border-green-200";
  return "bg-surface-0 text-ink-3 border-kp-border";
}

// -- Indice summary card
function IndiceCard({
  value,
  label,
  sublabel,
  color,
}: {
  value: string;
  label: string;
  sublabel: string;
  color: "green" | "amber" | "red";
}) {
  const textColor = { green: "text-green-700", amber: "text-amber-600", red: "text-red-600" }[color];
  return (
    <div className="bg-surface-0 rounded-xl border border-kp-border p-4 text-center">
      <div className={cn("text-xl font-bold tabular-nums", textColor)}>{value}</div>
      <div className="text-xs font-medium text-ink-1 mt-0.5">{label}</div>
      <div className="text-[10px] text-ink-3 mt-0.5">{sublabel}</div>
    </div>
  );
}

export function PeriogramaForm({
  encuentroId,
  patientId,
  periogramaExistente,
  readOnly,
}: Props) {
  const TODAS = useMemo(() => [...ARCO_SUPERIOR, ...ARCO_INFERIOR], []);

  const [datos, setDatos] = useState<Record<number, PeriogramaPiezaDatos>>(
    () => initDatos(TODAS, periogramaExistente?.datos ?? []),
  );
  const [notas, setNotas]                 = useState(periogramaExistente?.notas ?? "");
  const [diagnosticoIcd, setDiagnosticoIcd] = useState<ICDCodeSnap | null>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (periogramaExistente as any)?.diagnostico_icd?.code ? (periogramaExistente as any).diagnostico_icd as ICDCodeSnap : null
  );
  const [periogramaId, setPeriogramaId]   = useState<string | null>(periogramaExistente?.id ?? null);
  const [firmado, setFirmado]             = useState(periogramaExistente?.firmado ?? false);
  const [firmadoAt, setFirmadoAt]         = useState<string | null>(periogramaExistente?.firmado_at ?? null);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [showChart, setShowChart]         = useState(false);
  const [isPending, startTransition]      = useTransition();

  const datosArr = useMemo(() => Object.values(datos), [datos]);
  const indiceSangrado    = useMemo(() => calcularIndiceSangrado(datosArr), [datosArr]);
  const profundidadMedia  = useMemo(() => calcularProfundidadMedia(datosArr), [datosArr]);
  const sitiosPatologicos = useMemo(() => calcularSitiosPatologicos(datosArr), [datosArr]);

  const setSondaje = useCallback((pieza: number, face: Face, idx: PointIdx, raw: string) => {
    const val = Math.max(0, Math.min(10, parseInt(raw) || 0));
    setDatos(prev => {
      const d = prev[pieza];
      const arr = [...d.sondaje[face]] as [number, number, number];
      arr[idx] = val;
      return { ...prev, [pieza]: { ...d, sondaje: { ...d.sondaje, [face]: arr } } };
    });
  }, []);

  const toggleSangrado = useCallback((pieza: number, face: Face, idx: PointIdx) => {
    setDatos(prev => {
      const d = prev[pieza];
      const arr = [...d.sangrado[face]] as [boolean, boolean, boolean];
      arr[idx] = !arr[idx];
      return { ...prev, [pieza]: { ...d, sangrado: { ...d.sangrado, [face]: arr } } };
    });
  }, []);

  const setMovilidad = useCallback((pieza: number, val: number) => {
    setDatos(prev => ({
      ...prev,
      [pieza]: { ...prev[pieza], movilidad: Math.max(0, Math.min(3, val)) },
    }));
  }, []);

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const result = await savePeriograma(
        encuentroId,
        patientId,
        Object.values(datos),
        notas || null,
        diagnosticoIcd ?? undefined,
      );
      if (result.success) {
        setPeriogramaId(result.data.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error);
      }
    });
  }

  function handleSign() {
    if (!periogramaId) {
      setSaveError("Guarda el periograma antes de firmar.");
      return;
    }
    setSaveError(null);
    startTransition(async () => {
      const result = await signPeriograma(periogramaId, patientId);
      if (result.success) {
        setFirmado(true);
        setFirmadoAt(result.data.firmado_at);
      } else {
        setSaveError(result.error);
      }
    });
  }

  // -- Arch table renderer
  function renderArco(
    piezas: number[],
    arcLabel: string,
    innerFaceLabel: string,
    midlinePieza: number,
  ) {
    const isMidline = (pieza: number, i: number) => pieza === midlinePieza && i === 0;

    return (
      <div>
        <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">
          {arcLabel}
        </h4>
        <div className="overflow-x-auto rounded-lg border border-kp-border">
          <table
            className="border-collapse text-xs"
            style={{ minWidth: `${piezas.length * 66 + 100}px` }}
          >
            <tbody>
              {/* ── Vestibular bleeding ── */}
              <tr className="bg-surface-1">
                <td className="w-24 min-w-[6rem] text-right pr-3 py-1 text-[10px] text-ink-3 border-r border-kp-border">
                  Sang. Vest.
                </td>
                {piezas.flatMap(pieza =>
                  ([0, 1, 2] as PointIdx[]).map(i => {
                    const bleeding = datos[pieza].sangrado.vestibular[i];
                    return (
                      <td
                        key={`vb-${pieza}-${i}`}
                        className={cn(
                          "w-[22px] text-center py-1 px-0",
                          isMidline(pieza, i) && "border-l-2 border-l-slate-500",
                        )}
                      >
                        <button
                          type="button"
                          onClick={!readOnly && !firmado ? () => toggleSangrado(pieza, "vestibular", i) : undefined}
                          disabled={readOnly || firmado}
                          title={bleeding ? "Sangrado presente — clic para quitar" : "Sin sangrado — clic para marcar"}
                          className={cn(
                            "w-3 h-3 rounded-full mx-auto block transition-colors",
                            bleeding ? "bg-red-500" : "bg-slate-200",
                            !readOnly && !firmado ? "cursor-pointer hover:ring-2 hover:ring-red-300" : "cursor-default",
                          )}
                        />
                      </td>
                    );
                  }),
                )}
              </tr>

              {/* ── Vestibular sondaje ── */}
              <tr className="bg-surface-1">
                <td className="text-right pr-3 py-0.5 text-[10px] text-ink-3 border-r border-kp-border">
                  Sond. Vest. (mm)
                </td>
                {piezas.flatMap(pieza =>
                  ([0, 1, 2] as PointIdx[]).map(i => {
                    const val = datos[pieza].sondaje.vestibular[i];
                    return (
                      <td
                        key={`vs-${pieza}-${i}`}
                        className={cn(
                          "p-0.5",
                          isMidline(pieza, i) && "border-l-2 border-l-slate-500",
                        )}
                      >
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={val === 0 ? "" : val}
                          placeholder="·"
                          onChange={e => setSondaje(pieza, "vestibular", i, e.target.value)}
                          readOnly={readOnly || firmado}
                          className={cn(
                            "w-[22px] h-6 text-center text-xs border rounded focus:outline-none focus:ring-1 focus:ring-kp-accent transition-colors",
                            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                            sondajeClass(val),
                            (readOnly || firmado) && "cursor-default",
                          )}
                        />
                      </td>
                    );
                  }),
                )}
              </tr>

              {/* ── Tooth number center row ── */}
              <tr className="bg-surface-0 border-y border-kp-border">
                <td className="border-r border-kp-border" />
                {piezas.map(pieza => (
                  <td
                    key={`tn-${pieza}`}
                    colSpan={3}
                    className={cn(
                      "text-center font-bold py-1.5 text-[11px] border-x border-kp-border",
                      pieza === midlinePieza && "border-l-2 border-l-slate-500",
                      esMolar(pieza) ? "text-kp-accent" : "text-ink-1",
                    )}
                  >
                    {pieza}
                  </td>
                ))}
              </tr>

              {/* ── Lingual/Palatine sondaje ── */}
              <tr className="bg-surface-1">
                <td className="text-right pr-3 py-0.5 text-[10px] text-ink-3 border-r border-kp-border">
                  Sond. {innerFaceLabel} (mm)
                </td>
                {piezas.flatMap(pieza =>
                  ([0, 1, 2] as PointIdx[]).map(i => {
                    const val = datos[pieza].sondaje.lingual[i];
                    return (
                      <td
                        key={`ls-${pieza}-${i}`}
                        className={cn(
                          "p-0.5",
                          isMidline(pieza, i) && "border-l-2 border-l-slate-500",
                        )}
                      >
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={val === 0 ? "" : val}
                          placeholder="·"
                          onChange={e => setSondaje(pieza, "lingual", i, e.target.value)}
                          readOnly={readOnly || firmado}
                          className={cn(
                            "w-[22px] h-6 text-center text-xs border rounded focus:outline-none focus:ring-1 focus:ring-kp-accent transition-colors",
                            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                            sondajeClass(val),
                            (readOnly || firmado) && "cursor-default",
                          )}
                        />
                      </td>
                    );
                  }),
                )}
              </tr>

              {/* ── Lingual/Palatine bleeding ── */}
              <tr className="bg-surface-1">
                <td className="text-right pr-3 py-1 text-[10px] text-ink-3 border-r border-kp-border">
                  Sang. {innerFaceLabel}
                </td>
                {piezas.flatMap(pieza =>
                  ([0, 1, 2] as PointIdx[]).map(i => {
                    const bleeding = datos[pieza].sangrado.lingual[i];
                    return (
                      <td
                        key={`lb-${pieza}-${i}`}
                        className={cn(
                          "w-[22px] text-center py-1 px-0",
                          isMidline(pieza, i) && "border-l-2 border-l-slate-500",
                        )}
                      >
                        <button
                          type="button"
                          onClick={!readOnly && !firmado ? () => toggleSangrado(pieza, "lingual", i) : undefined}
                          disabled={readOnly || firmado}
                          title={bleeding ? "Sangrado presente — clic para quitar" : "Sin sangrado — clic para marcar"}
                          className={cn(
                            "w-3 h-3 rounded-full mx-auto block transition-colors",
                            bleeding ? "bg-red-500" : "bg-slate-200",
                            !readOnly && !firmado ? "cursor-pointer hover:ring-2 hover:ring-red-300" : "cursor-default",
                          )}
                        />
                      </td>
                    );
                  }),
                )}
              </tr>

              {/* ── Movilidad ── */}
              <tr className="bg-surface-0 border-t border-kp-border">
                <td className="text-right pr-3 py-0.5 text-[10px] text-ink-3 border-r border-kp-border">
                  Movilidad
                </td>
                {piezas.map(pieza => (
                  <td
                    key={`mov-${pieza}`}
                    colSpan={3}
                    className={cn(
                      "text-center p-0.5 border-x border-kp-border",
                      pieza === midlinePieza && "border-l-2 border-l-slate-500",
                    )}
                  >
                    <select
                      value={datos[pieza].movilidad}
                      onChange={e => setMovilidad(pieza, parseInt(e.target.value))}
                      disabled={readOnly || firmado}
                      className={cn(
                        "w-full text-center text-[10px] border border-kp-border rounded bg-surface-1 h-5",
                        "focus:outline-none focus:ring-1 focus:ring-kp-accent disabled:opacity-60 disabled:cursor-default",
                        datos[pieza].movilidad > 0 && "text-amber-700 border-amber-300 bg-amber-50",
                      )}
                    >
                      {[0, 1, 2, 3].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Índices calculados ── */}
      <div className="grid grid-cols-3 gap-4">
        <IndiceCard
          value={`${indiceSangrado}%`}
          label="Índice de sangrado"
          sublabel={indiceSangrado > 25 ? "Gingivitis activa" : indiceSangrado > 10 ? "Sangrado leve" : "Sin gingivitis"}
          color={indiceSangrado > 25 ? "red" : indiceSangrado > 10 ? "amber" : "green"}
        />
        <IndiceCard
          value={`${profundidadMedia} mm`}
          label="Profundidad media"
          sublabel={profundidadMedia >= 4 ? "Bolsas presentes" : "Sin bolsas patológicas"}
          color={profundidadMedia >= 4 ? "red" : profundidadMedia >= 3 ? "amber" : "green"}
        />
        <IndiceCard
          value={`${sitiosPatologicos}`}
          label="Sitios ≥4 mm"
          sublabel={sitiosPatologicos > 8 ? "Compromiso severo" : sitiosPatologicos > 0 ? "Sitios patológicos" : "Sin sitios patológicos"}
          color={sitiosPatologicos > 8 ? "red" : sitiosPatologicos > 0 ? "amber" : "green"}
        />
      </div>

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-4 text-[10px] text-ink-3 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border border-green-200 bg-green-50 inline-block" />
          1-3mm normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border border-amber-300 bg-amber-50 inline-block" />
          4-5mm bolsa moderada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border border-red-300 bg-red-50 inline-block" />
          ≥6mm bolsa severa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Sangrado al sondaje
        </span>
        <span className="ml-auto text-ink-3">Molares resaltados en azul · Tab para avanzar entre celdas</span>
      </div>

      {/* ── Arco Superior ── */}
      {renderArco(ARCO_SUPERIOR, "Arco Superior", "Palatino", MIDLINE_SUPERIOR)}

      {/* ── Arco Inferior ── */}
      {renderArco(ARCO_INFERIOR, "Arco Inferior", "Lingual", MIDLINE_INFERIOR)}

      {/* ── Gráfico toggle ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowChart(v => !v)}
          className="flex items-center gap-2 text-xs font-medium text-kp-accent hover:text-kp-accent-md transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          {showChart ? "Ocultar gráfico" : "Ver gráfico de profundidades"}
        </button>
        {showChart && (
          <div className="mt-3">
            <PeriogramaChart datos={datos} />
          </div>
        )}
      </div>

      {/* ── Diagnóstico periodontal ICD-11 ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink-2">
          Diagnóstico periodontal ICD-11 <span className="text-ink-3 font-normal">(opcional)</span>
        </label>
        <DiagnosticoSearch
          value={diagnosticoIcd ? [diagnosticoIcd] : []}
          onChange={(codes) => setDiagnosticoIcd(codes[codes.length - 1] ?? null)}
          readOnly={readOnly || firmado}
        />
      </div>

      {/* ── Observaciones ── */}
      <div>
        <label className="text-xs font-medium text-ink-2">
          Observaciones clínicas
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          readOnly={readOnly || firmado}
          rows={3}
          placeholder="Diagnóstico periodontal, plan de tratamiento, notas del sondaje..."
          className={cn(
            "mt-1 w-full text-sm border border-kp-border rounded-lg px-3 py-2",
            "bg-surface-1 text-ink-1 placeholder:text-ink-3",
            "focus:outline-none focus:ring-2 focus:ring-kp-accent resize-none",
            (readOnly || firmado) && "bg-surface-0 cursor-default",
          )}
        />
      </div>

      {/* ── Feedback ── */}
      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Periograma guardado correctamente.
        </div>
      )}

      {/* ── Acciones ── */}
      {!readOnly && !firmado && (
        <div className="flex items-center justify-between pt-2 border-t border-kp-border">
          <p className="text-xs text-ink-3">
            {periogramaId
              ? "Periograma guardado. Puedes actualizar los datos antes de firmar."
              : "Registra el sondaje y guarda antes de firmar el documento."}
          </p>
          <Button variant="secondary" onClick={handleSave} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}

      {/* ── Firma ── */}
      {!readOnly && (
        <SignatureBlock
          isSigned={firmado}
          onSign={handleSign}
          signedAt={firmadoAt ? new Date(firmadoAt).toLocaleString("es-CL") : undefined}
          disabled={isPending || !periogramaId}
        />
      )}

      {firmado && readOnly && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          Periograma firmado y sellado.
          {firmadoAt && (
            <span className="text-ink-3 ml-1">
              · {new Date(firmadoAt).toLocaleString("es-CL")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
