"use client";

/**
 * ADJ-1 — AdjuntoViewer: lightbox para imágenes.
 * Los PDF se abren en pestaña nueva vía signed URL (nunca inline en nuestro
 * origen — mitigación de PDF con JS embebido, plan §Riesgos).
 */

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { auditarDescargaAdjunto } from "@/app/actions/adjuntos";
import type { AdjuntoConUrl } from "@/types/adjunto";

interface Props {
  adjunto: AdjuntoConUrl;
  onClose: () => void;
}

export function AdjuntoViewer({ adjunto, onClose }: Props) {
  useEffect(() => {
    auditarDescargaAdjunto(adjunto.id).catch(() => {});
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [adjunto.id, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={adjunto.descripcion ?? adjunto.nombre_archivo_original}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface-1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink-1)" }}>
            {adjunto.descripcion ?? adjunto.nombre_archivo_original}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 rounded"
            style={{ color: "var(--color-ink-2)" }}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex items-center justify-center" style={{ background: "var(--color-surface-0)" }}>
          {adjunto.signedUrl ? (
            <Image
              src={adjunto.signedUrl}
              alt={adjunto.descripcion ?? adjunto.nombre_archivo_original}
              width={1024}
              height={768}
              style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }}
              quality={85}
              unoptimized
            />
          ) : (
            <p className="py-10 text-sm" style={{ color: "var(--color-ink-3)" }}>
              No se pudo generar el enlace firmado. Refresca e intenta de nuevo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
