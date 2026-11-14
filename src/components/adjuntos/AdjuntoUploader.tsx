"use client";

/**
 * ADJ-1 — AdjuntoUploader
 * Flujo de subida directa (plan D3):
 *   1. prepararSubidaAdjunto (server) → valida y retorna storagePath canónico
 *   2. supabase.storage.upload con el client del browser (JWT del usuario;
 *      las policies del bucket enforcementan tenant + rol)
 *   3. registrarAdjunto (server) → valida magic bytes/tamaño real, inserta fila
 */

import { useState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepararSubidaAdjunto, registrarAdjunto, getOrdenesParaVinculo } from "@/app/actions/adjuntos";
import { CATEGORIA_ADJUNTO_LABELS, type CategoriaAdjunto } from "@/types/adjunto";

interface Props {
  patientId: string;
  onUploaded?: () => void;
}

interface OrdenOpcion {
  id: string;
  folio_display: string | null;
  created_at: string;
  estado_resultados: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function AdjuntoUploader({ patientId, onUploaded }: Props) {
  const [categoria, setCategoria] = useState<CategoriaAdjunto>("resultado_examen");
  const [descripcion, setDescripcion] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState(() =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" })
  );
  const [ordenes, setOrdenes] = useState<OrdenOpcion[]>([]);
  const [idOrden, setIdOrden] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El vínculo a orden M8 solo aplica a resultados de examen (y solo si M8 activo).
  useEffect(() => {
    if (categoria !== "resultado_examen") {
      setIdOrden("");
      return;
    }
    let vivo = true;
    getOrdenesParaVinculo(patientId).then((res) => {
      if (vivo && res.success) setOrdenes(res.data);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [categoria, patientId]);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type) {
      setError("No se pudo determinar el formato del archivo.");
      return;
    }
    setBusy(true);
    try {
      // 1. Preparar (server genera el path y valida tenancy/M8)
      const prep = await prepararSubidaAdjunto({
        patientId,
        categoria,
        descripcion: descripcion || null,
        nombreArchivoOriginal: file.name,
        mimeDeclarado: file.type,
        tamano: file.size,
        fechaDocumento,
        idOrdenExamen: idOrden || null,
        idEncuentro: null,
      });
      if (!prep.success) {
        setError(prep.error);
        return;
      }

      // 2. Upload directo con el client del usuario (RLS del bucket = gate real)
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(prep.data.bucket)
        .upload(prep.data.storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError("No se pudo subir el archivo. Intenta de nuevo.");
        return;
      }

      // 3. Registrar (server valida magic bytes + tamaño real y escribe la fila)
      const reg = await registrarAdjunto({
        patientId,
        categoria,
        descripcion: descripcion || null,
        nombreArchivoOriginal: file.name,
        mimeDeclarado: file.type,
        tamano: file.size,
        fechaDocumento,
        idOrdenExamen: idOrden || null,
        idEncuentro: null,
        storagePath: prep.data.storagePath,
      });
      if (!reg.success) {
        setError(reg.error);
        return;
      }

      setDescripcion("");
      setIdOrden("");
      onUploaded?.();
    } catch {
      setError("Ocurrió un error inesperado al subir el adjunto.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    borderColor: "var(--color-kp-border)",
    color: "var(--color-ink-1)",
  } as const;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
            Categoría
          </span>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaAdjunto)}
            disabled={busy}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={inputStyle}
          >
            {Object.entries(CATEGORIA_ADJUNTO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
            Fecha del documento
          </span>
          <input
            type="date"
            value={fechaDocumento}
            max={fechaDocumento}
            onChange={(e) => setFechaDocumento(e.target.value)}
            disabled={busy}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={inputStyle}
          />
        </label>
      </div>

      {categoria === "resultado_examen" && (
        <label className="block">
          <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
            Vincular a orden de examen {ordenes.length === 0 && "(sin órdenes — queda sin vínculo)"}
          </span>
          <select
            value={idOrden}
            onChange={(e) => setIdOrden(e.target.value)}
            disabled={busy || ordenes.length === 0}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={inputStyle}
          >
            <option value="">Sin vínculo</option>
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.folio_display ?? "Orden"} — {new Date(o.created_at).toLocaleDateString("es-CL")} ({o.estado_resultados})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
          Descripción (opcional)
        </span>
        <input
          type="text"
          value={descripcion}
          maxLength={500}
          placeholder="Ej. Hemograma completo, laboratorio ACME"
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={busy}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
          style={inputStyle}
        />
      </label>

      <div className="flex items-center gap-3 flex-wrap">
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors disabled:opacity-50"
          style={{
            color: "var(--color-kp-accent)",
            borderColor: "var(--color-kp-accent)",
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Subiendo…" : "Subir archivo"}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          JPG, PNG o WEBP (≤8MB) · PDF (≤15MB)
        </span>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--color-kp-danger)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
