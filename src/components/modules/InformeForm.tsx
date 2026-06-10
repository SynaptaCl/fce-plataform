"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  crearInforme,
  actualizarInforme,
  firmarInforme,
} from "@/app/actions/informes";
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

      {/* Copiloto IA placeholder — will be wired in Task 6 */}
      {tieneCopilotoIA && (
        <div className="mb-2">{/* CopilotoInformeButton placeholder */}</div>
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
