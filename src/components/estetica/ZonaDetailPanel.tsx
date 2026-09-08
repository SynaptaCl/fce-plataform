"use client";

import { useState } from "react";
import { getLabelZona } from "@/lib/estetica/zonas";
import { ProcedimientoPicker } from "./ProcedimientoPicker";
import type { FichaEsteticaZona, ProcedimientoEsteticoCatalogo, RegionEstetica } from "@/types/estetica";

/** Subset de UpsertZonaInput que este panel produce — id/region/zonaCodigo las
 *  conoce el padre (EsteticaWorkspace), no este panel, así que no son parte
 *  del payload de este callback. El padre las fusiona antes de llamar la
 *  server action upsertZona. */
export interface ZonaFormPayload {
  idProcedimiento: string | null;
  productoComercial: string | null;
  lote: string | null;
  dosis: number | null;
  unidadDosis: string | null;
  tecnica: string | null;
  observaciones: string | null;
}

interface Props {
  region: RegionEstetica;
  zonaCodigo: string;
  zonaExistente: FichaEsteticaZona | null;
  catalogo: ProcedimientoEsteticoCatalogo[];
  readOnly: boolean;
  onSave: (zona: ZonaFormPayload) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ZonaDetailPanel({
  region,
  zonaCodigo,
  zonaExistente,
  catalogo,
  readOnly,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [idProcedimiento, setIdProcedimiento] = useState(zonaExistente?.id_procedimiento ?? null);
  const [productoComercial, setProductoComercial] = useState(zonaExistente?.producto_comercial ?? "");
  const [lote, setLote] = useState(zonaExistente?.lote ?? "");
  const [dosis, setDosis] = useState(zonaExistente?.dosis?.toString() ?? "");
  const [unidadDosis, setUnidadDosis] = useState(zonaExistente?.unidad_dosis ?? "");
  const [tecnica, setTecnica] = useState(zonaExistente?.tecnica ?? "");
  const [observaciones, setObservaciones] = useState(zonaExistente?.observaciones ?? "");

  const procedimientoSeleccionado = catalogo.find((p) => p.id === idProcedimiento) ?? null;

  function handleSave() {
    onSave({
      idProcedimiento,
      productoComercial: productoComercial.trim() || null,
      lote: lote.trim() || null,
      dosis: dosis.trim() ? Number(dosis) : null,
      unidadDosis: unidadDosis.trim() || null,
      tecnica: tecnica.trim() || null,
      observaciones: observaciones.trim() || null,
    });
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          {getLabelZona(region, zonaCodigo)}
        </h3>
        <button type="button" onClick={onClose} className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Cerrar
        </button>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Procedimiento
        </label>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-1 w-full text-left text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          >
            {procedimientoSeleccionado?.nombre ?? "Seleccionar procedimiento..."}
          </button>
        ) : (
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-1)" }}>
            {procedimientoSeleccionado?.nombre ?? "—"}
          </p>
        )}
        {pickerOpen && (
          <div className="mt-2">
            <ProcedimientoPicker
              catalogo={catalogo}
              onSelect={(p) => setIdProcedimiento(p.id)}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
            Producto comercial
          </label>
          <input
            type="text"
            value={productoComercial}
            onChange={(e) => setProductoComercial(e.target.value)}
            disabled={readOnly}
            className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
            Lote
          </label>
          <input
            type="text"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            disabled={readOnly}
            className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
            Dosis
          </label>
          <input
            type="number"
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
            disabled={readOnly}
            className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
            Unidad
          </label>
          <input
            type="text"
            value={unidadDosis}
            onChange={(e) => setUnidadDosis(e.target.value)}
            placeholder="UI, ml, sesiones..."
            disabled={readOnly}
            className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Técnica
        </label>
        <input
          type="text"
          value={tecnica}
          onChange={(e) => setTecnica(e.target.value)}
          disabled={readOnly}
          className="mt-1 w-full text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
        />
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Observaciones
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={readOnly}
          rows={2}
          className="mt-1 w-full text-sm px-3 py-2 rounded-lg border resize-none"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between pt-1">
          {zonaExistente && (
            <button type="button" onClick={onDelete} className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
              Quitar zona
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--color-kp-accent)", color: "#fff" }}
          >
            Guardar zona
          </button>
        </div>
      )}
    </div>
  );
}
