"use client";

/**
 * ADJ-1 — AdjuntosPanel: panel de adjuntos clínicos del paciente.
 * Se embebe en la ficha (bajo el timeline). Permisos:
 *   - subir:    ROLES_QUE_SUBEN_ADJUNTOS (profesional/recepcionista/director)
 *   - validar:  solo profesional
 *   - anular:   solo profesional (soft — adjunto validado nunca se borra)
 *   - eliminar: pendientes únicamente; el server exige uploader o profesional
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Camera,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Trash2,
  Ban,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getAdjuntosPaciente, anularAdjunto, eliminarAdjunto, auditarDescargaAdjunto } from "@/app/actions/adjuntos";
import { ROLES_QUE_SUBEN_ADJUNTOS, type Rol } from "@/lib/modules/registry";
import { AdjuntoUploader } from "./AdjuntoUploader";
import { AdjuntoViewer } from "./AdjuntoViewer";
import { ValidarAdjuntoButton } from "./ValidarAdjuntoButton";
import { CATEGORIA_ADJUNTO_LABELS, type Adjunto, type AdjuntoConUrl, type CategoriaAdjunto } from "@/types/adjunto";

interface Props {
  patientId: string;
  rol: string;
  defaultAbierta?: boolean;
}

export function AdjuntosPanel({ patientId, rol, defaultAbierta = false }: Props) {
  const [abierta, setAbierta] = useState(defaultAbierta);
  const [items, setItems] = useState<AdjuntoConUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filtro, setFiltro] = useState<CategoriaAdjunto | "todas">("todas");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [subirOpen, setSubirOpen] = useState(false);
  const [viewer, setViewer] = useState<AdjuntoConUrl | null>(null);
  const [anulando, setAnulando] = useState<Adjunto | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const puedeSubir = ROLES_QUE_SUBEN_ADJUNTOS.includes(rol as Rol);
  const esProfesional = rol === "profesional";

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const res = await getAdjuntosPaciente(patientId);
    if (res.success) setItems(res.data);
    else setFailed(true);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (abierta) void load();
  }, [abierta, load]);

  const pendientes = useMemo(() => items.filter((a) => a.estado_validacion === "pendiente" && !a.anulado).length, [items]);
  const visibles = useMemo(
    () =>
      items.filter(
        (a) =>
          (filtro === "todas" || a.categoria === filtro) &&
          (!soloPendientes || (a.estado_validacion === "pendiente" && !a.anulado))
      ),
    [items, filtro, soloPendientes]
  );

  function abrirAdjunto(a: AdjuntoConUrl) {
    if (!a.signedUrl) return;
    if (a.mime_type === "application/pdf") {
      auditarDescargaAdjunto(a.id).catch(() => {});
      window.open(a.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      setViewer(a);
    }
  }

  async function confirmarAnular() {
    if (!anulando) return;
    setBusyId(anulando.id);
    const res = await anularAdjunto(anulando.id, motivo);
    setBusyId(null);
    if (res.success) {
      setAnulando(null);
      setMotivo("");
      void load();
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este adjunto pendiente? Esta acción no se puede deshacer.")) return;
    setBusyId(id);
    const res = await eliminarAdjunto(id);
    setBusyId(null);
    if (res.success) void load();
    else window.alert(res.error);
  }

  return (
    <section
      className="rounded-xl border"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-kp-border)" }}
    >
      <button
        type="button"
        onClick={() => setAbierta((p) => !p)}
        aria-expanded={abierta}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2">
          {abierta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <Paperclip className="size-4" style={{ color: "var(--color-kp-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--color-ink-1)" }}>
            Adjuntos clínicos
          </span>
          {pendientes > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--color-kp-warning-lt, #fef3c7)", color: "#92400e" }}
            >
              {pendientes} pendiente{pendientes === 1 ? "" : "s"} de validación
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          {items.length} archivo{items.length === 1 ? "" : "s"}
        </span>
      </button>

      {abierta && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3" style={{ borderColor: "var(--color-kp-border)" }}>
          {/* Filtros + acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as CategoriaAdjunto | "todas")}
              className="px-2 py-1.5 text-xs rounded-lg border outline-none"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
            >
              <option value="todas">Todas las categorías</option>
              {Object.entries(CATEGORIA_ADJUNTO_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-2)" }}>
              <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
              Solo pendientes
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                aria-label="Refrescar"
                className="p-1.5 rounded-lg border"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              </button>
              {puedeSubir && (
                <button
                  type="button"
                  onClick={() => setSubirOpen((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white"
                  style={{ background: "var(--color-kp-accent)" }}
                >
                  <Camera className="size-3.5" />
                  Subir adjunto
                </button>
              )}
            </div>
          </div>

          {subirOpen && puedeSubir && (
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
            >
              <AdjuntoUploader patientId={patientId} onUploaded={() => { setSubirOpen(false); void load(); }} />
            </div>
          )}

          {failed && (
            <p className="text-sm" style={{ color: "var(--color-kp-danger)" }}>
              No se pudo cargar los adjuntos. Refresca e intenta de nuevo.
            </p>
          )}

          {!failed && !loading && visibles.length === 0 && (
            <p className="text-sm py-2" style={{ color: "var(--color-ink-3)" }}>
              Sin adjuntos {filtro !== "todas" ? "en esta categoría " : ""}todavía.
            </p>
          )}

          {/* Grid de adjuntos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibles.map((a) => (
              <AdjuntoCard
                key={a.id}
                adjunto={a}
                busy={busyId === a.id}
                esProfesional={esProfesional}
                onVer={() => abrirAdjunto(a)}
                onValidado={() => void load()}
                onAnular={() => setAnulando(a)}
                onEliminar={() => void eliminar(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {viewer && <AdjuntoViewer adjunto={viewer} onClose={() => setViewer(null)} />}

      {anulando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Anular adjunto"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.6)" }}
          onClick={() => setAnulando(null)}
        >
          <div
            className="w-full max-w-md rounded-xl p-5 space-y-4"
            style={{ background: "var(--color-surface-1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold" style={{ color: "var(--color-ink-1)" }}>
              Anular adjunto
            </h3>
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              El adjunto queda oculto del timeline y del PDF de ficha, pero se conserva en el
              registro con su motivo (integridad clínica).
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (obligatorio, mínimo 5 caracteres)"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAnulando(null)}
                className="px-3 py-1.5 text-sm rounded-lg border font-medium"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAnular}
                disabled={motivo.trim().length < 5 || busyId === anulando.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-semibold text-white"
                style={{ background: "var(--color-kp-danger)" }}
              >
                {busyId === anulando.id && <Loader2 className="size-4 animate-spin" />}
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Card individual ─────────────────────────────────────────────────────────

function AdjuntoCard({
  adjunto,
  busy,
  esProfesional,
  onVer,
  onValidado,
  onAnular,
  onEliminar,
}: {
  adjunto: AdjuntoConUrl;
  busy: boolean;
  esProfesional: boolean;
  onVer: () => void;
  onValidado: () => void;
  onAnular: () => void;
  onEliminar: () => void;
}) {
  const esImagen = adjunto.mime_type !== "application/pdf";
  const pendiente = adjunto.estado_validacion === "pendiente" && !adjunto.anulado;
  const eliminable = pendiente; // el server exige uploader o profesional

  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col"
      style={{
        borderColor: "var(--color-kp-border)",
        background: "var(--color-surface-1)",
        opacity: adjunto.anulado ? 0.55 : 1,
      }}
    >
      {/* Thumbnail — unoptimized: las signed URLs expiran, el optimizer de
          next/image cachearía una URL muerta (regla 20 respetada con next/image) */}
      <button
        type="button"
        onClick={onVer}
        disabled={!adjunto.signedUrl || adjunto.anulado}
        className="w-full flex items-center justify-center"
        style={{ background: "var(--color-surface-0)", height: 120, cursor: adjunto.signedUrl && !adjunto.anulado ? "pointer" : "default" }}
        aria-label={`Ver ${adjunto.descripcion ?? adjunto.nombre_archivo_original}`}
      >
        {esImagen && adjunto.signedUrl ? (
          <Image
            src={adjunto.signedUrl}
            alt={adjunto.descripcion ?? adjunto.nombre_archivo_original}
            width={240}
            height={120}
            style={{ width: "100%", height: 120, objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <FileText className="size-10" style={{ color: adjunto.anulado ? "var(--color-ink-3)" : "var(--color-kp-accent)" }} />
        )}
      </button>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium truncate" style={{ color: "var(--color-ink-1)" }} title={adjunto.nombre_archivo_original}>
            {adjunto.descripcion || adjunto.nombre_archivo_original}
          </p>
          {adjunto.anulado ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--color-kp-danger-lt, #fee2e2)", color: "#991b1b" }}>
              ANULADO
            </span>
          ) : pendiente ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "var(--color-kp-warning-lt, #fef3c7)", color: "#92400e" }}>
              PENDIENTE
            </span>
          ) : null}
        </div>

        <p className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
          {CATEGORIA_ADJUNTO_LABELS[adjunto.categoria]} · {adjunto.fecha_documento}
          {adjunto.id_orden_examen ? " · orden vinculada" : ""}
          {` · ${Math.max(1, Math.round(adjunto.tamano_bytes / 1024))} KB`}
        </p>

        <div className="mt-auto flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onVer}
            disabled={!adjunto.signedUrl || adjunto.anulado}
            className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-40"
            style={{ color: "var(--color-kp-accent)" }}
          >
            <Eye className="size-3.5" />
            Ver
          </button>
          {esProfesional && pendiente && <ValidarAdjuntoButton adjunto={adjunto} onValidado={onValidado} />}
          {esProfesional && !adjunto.anulado && (
            <button
              type="button"
              onClick={onAnular}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--color-kp-danger)" }}
            >
              <Ban className="size-3.5" />
              Anular
            </button>
          )}
          {eliminable && (
            <button
              type="button"
              onClick={onEliminar}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-medium ml-auto disabled:opacity-40"
              style={{ color: "var(--color-ink-3)" }}
              aria-label="Eliminar adjunto pendiente"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
