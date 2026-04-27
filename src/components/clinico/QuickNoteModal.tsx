"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { createQuickNote } from "@/app/actions/clinico/nota-rapida";

interface QuickNoteModalProps {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_CONTENIDO = 5000;
const MIN_CONTENIDO = 10;
const MAX_MOTIVO = 200;

export function QuickNoteModal({ patientId, onClose, onSaved }: QuickNoteModalProps) {
  const [motivo, setMotivo] = useState("");
  const [contenido, setContenido] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit() {
    setFieldError(null);
    setServerError(null);

    const trimmed = contenido.trim();
    if (trimmed.length < MIN_CONTENIDO) {
      setFieldError(`La nota debe tener al menos ${MIN_CONTENIDO} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      const result = await createQuickNote(
        patientId,
        motivo.trim() || null,
        trimmed
      );
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      onClose();
      onSaved();
    } catch {
      setServerError("Error inesperado. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="bg-surface-1 rounded-2xl border border-kp-border shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kp-border shrink-0">
          <h2 className="text-base font-semibold text-ink-1">
            Nota clínica rápida
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {serverError && (
            <AlertBanner variant="danger">{serverError}</AlertBanner>
          )}

          <Input
            label="Motivo"
            placeholder="Ej: Llamada telefónica, resultado de examen..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MAX_MOTIVO}
            disabled={loading}
          />

          <div className="space-y-1">
            <Textarea
              label="Nota"
              placeholder="Escriba la nota clínica..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              maxLength={MAX_CONTENIDO}
              required
              disabled={loading}
              className="min-h-[180px]"
              error={fieldError ?? undefined}
            />
            <p className="text-xs text-ink-3 text-right">
              {contenido.length} / {MAX_CONTENIDO}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-kp-border shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar y firmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
