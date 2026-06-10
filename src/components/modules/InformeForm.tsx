"use client";

import { useState } from "react";
import { Wand2, Loader2, ChevronsDown, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  crearInforme,
  actualizarInforme,
  firmarInforme,
} from "@/app/actions/informes";
import { estructurarInforme } from "@/app/actions/informes-ia";
import type { InformeClinico, InformeFormData, TipoInforme } from "@/types/informe";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoInforme, string> = {
  isapre: "Isapre",
  colegio: "Colegio",
  laboral: "Laboral",
  judicial: "Judicial",
  otro: "Otro",
};

const TIPOS: TipoInforme[] = ["isapre", "colegio", "laboral", "judicial", "otro"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  idPaciente: string;
  idEncuentro?: string;
  informe?: InformeClinico; // edit mode if provided
  tieneCopilotoIA?: boolean;
  onSuccess?: (i: InformeClinico) => void;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InformeForm({
  idPaciente,
  idEncuentro,
  informe,
  tieneCopilotoIA,
  onSuccess,
  onCancel,
}: Props) {
  const isEditMode = !!informe;
  const isReadOnly = isEditMode && informe.firmado === true;

  const [tipo, setTipo] = useState<TipoInforme>(informe?.tipo ?? "isapre");
  const [destinatario, setDestinatario] = useState(informe?.destinatario ?? "");
  const [titulo, setTitulo] = useState(informe?.titulo ?? "");
  const [contenido, setContenido] = useState(informe?.contenido ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<string | null>(null);
  const [cargandoCopiloto, setCargandoCopiloto] = useState(false);
  const [errorCopiloto, setErrorCopiloto] = useState<string | null>(null);

  // ── Copiloto IA ───────────────────────────────────────────────────────────

  async function handleMejorarConIA() {
    if (!contenido.trim()) {
      setErrorCopiloto("Escribe contenido en el informe antes de usar el copiloto");
      return;
    }
    setCargandoCopiloto(true);
    setErrorCopiloto(null);
    setBorrador(null);
    try {
      const result = await estructurarInforme({
        idEncuentro: idEncuentro ?? null,
        tipo,
        destinatario: destinatario.trim() || null,
        contenido,
      });
      if (result.success) {
        setBorrador(result.data.contenido);
      } else {
        setErrorCopiloto(result.error);
      }
    } finally {
      setCargandoCopiloto(false);
    }
  }

  function handleInsertarBorrador(modo: "agregar" | "reemplazar") {
    if (!borrador) return;
    if (modo === "reemplazar") {
      setContenido(borrador);
    } else {
      setContenido((prev) => (prev.trim() ? `${prev}\n\n---\n\n${borrador}` : borrador));
    }
    setBorrador(null);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!titulo.trim()) return "El título es obligatorio.";
    if (!contenido.trim()) return "El contenido es obligatorio.";
    return null;
  }

  function buildFormData(): InformeFormData {
    return {
      tipo,
      destinatario: destinatario.trim() || undefined,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
    };
  }

  // ── Submit handlers ───────────────────────────────────────────────────────

  async function handleGuardarBorrador() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSubmitting(true);
    try {
      const formData = buildFormData();
      const result = isEditMode && informe
        ? await actualizarInforme(informe.id, formData)
        : await crearInforme(idPaciente, formData, idEncuentro);
      if (result.success) {
        onSuccess?.(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFirmar() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSubmitting(true);
    try {
      const formData = buildFormData();
      // Save first, then sign
      const saveResult = isEditMode && informe
        ? await actualizarInforme(informe.id, formData)
        : await crearInforme(idPaciente, formData, idEncuentro);
      if (!saveResult.success) { setError(saveResult.error); return; }

      const signResult = await firmarInforme(saveResult.data.id);
      if (signResult.success) {
        onSuccess?.(signResult.data);
      } else {
        setError(signResult.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Read-only view (firmado) ──────────────────────────────────────────────

  if (isReadOnly && informe) {
    return (
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                {informe.titulo}
              </h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "#DCFCE7", color: "#15803D" }}
              >
                Firmado
              </span>
            </div>
            {informe.destinatario && (
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                Para: {informe.destinatario}
              </p>
            )}
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "#EDE9FE", color: "#5B21B6" }}
          >
            {TIPO_LABELS[informe.tipo]}
          </span>
        </div>
        <div
          className="rounded-lg p-3 text-sm whitespace-pre-wrap"
          style={{
            background: "var(--color-surface-1)",
            color: "var(--color-ink-1)",
            border: "1px solid var(--color-kp-border)",
            lineHeight: 1.7,
          }}
        >
          {informe.contenido}
        </div>
        {onCancel && (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Edit / Create form ────────────────────────────────────────────────────

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
        {isEditMode ? "Editar informe" : "Nuevo informe clínico"}
      </h3>

      {/* Copiloto IA */}
      {tieneCopilotoIA && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              Asistente de redacción
            </span>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleMejorarConIA}
                disabled={!contenido.trim() || cargandoCopiloto}
                title="Mejorar redacción del informe con IA"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: "var(--color-kp-primary, #4f46e5)",
                  borderColor: "var(--color-kp-primary, #4f46e5)",
                  background: "transparent",
                }}
              >
                {cargandoCopiloto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                {cargandoCopiloto ? "Mejorando…" : "Mejorar con IA"}
              </button>
              {errorCopiloto && (
                <p className="text-xs text-right max-w-52" style={{ color: "#EF4444" }}>
                  {errorCopiloto}
                </p>
              )}
            </div>
          </div>

          {/* Panel borrador IA */}
          {borrador && (
            <div
              className="rounded-lg border p-4 space-y-3"
              style={{
                borderColor: "var(--color-kp-primary, #4f46e5)",
                background: "var(--color-surface-0, #F1F5F9)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2
                    className="w-4 h-4"
                    style={{ color: "var(--color-kp-primary, #4f46e5)" }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-ink-1)" }}
                  >
                    Borrador mejorado
                  </span>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ background: "var(--color-kp-primary, #4f46e5)" }}
                  >
                    IA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBorrador(null)}
                  className="transition-colors"
                  style={{ color: "var(--color-ink-3)" }}
                  aria-label="Descartar borrador"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Disclaimer */}
              <p
                className="text-xs italic pl-3 border-l-2"
                style={{
                  color: "var(--color-ink-2, #475569)",
                  borderColor: "var(--color-kp-warning, #F5A623)",
                }}
              >
                Borrador generado por IA a partir del contenido ingresado. Debe ser revisado y
                editado por el profesional responsable antes de firmar.
              </p>

              {/* Contenido del borrador */}
              <div
                className="rounded-md border p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
                style={{
                  background: "var(--color-surface-1, #FFFFFF)",
                  borderColor: "var(--color-kp-border, #E2E8F0)",
                  color: "var(--color-ink-1, #1E293B)",
                }}
              >
                {borrador}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 flex-wrap">
                {contenido.trim() ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleInsertarBorrador("agregar")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors"
                      style={{ background: "var(--color-kp-primary, #4f46e5)" }}
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                      Insertar al final
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertarBorrador("reemplazar")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                      style={{
                        borderColor: "var(--color-kp-primary, #4f46e5)",
                        color: "var(--color-kp-primary, #4f46e5)",
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reemplazar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInsertarBorrador("agregar")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors"
                    style={{ background: "var(--color-kp-primary, #4f46e5)" }}
                  >
                    Insertar en informe
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBorrador(null)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                  style={{
                    borderColor: "var(--color-kp-border, #E2E8F0)",
                    color: "var(--color-ink-2, #475569)",
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Tipo de informe <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoInforme)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
          }}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Destinatario */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Destinatario (opcional)
        </label>
        <input
          type="text"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder="Ej: Dr. Juan Pérez, Isapre Cruz Blanca..."
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
          }}
        />
      </div>

      {/* Título */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Título <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Informe de alta kinesioterapia"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
          }}
        />
      </div>

      {/* Contenido */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Contenido <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Redacte el informe clínico aquí..."
          rows={10}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-y"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
            lineHeight: 1.7,
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-medium" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={handleGuardarBorrador}
          disabled={submitting}
        >
          {submitting ? "Guardando..." : "Guardar borrador"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={handleFirmar}
          disabled={submitting}
        >
          {submitting ? "Procesando..." : "Firmar"}
        </Button>
      </div>
    </div>
  );
}
