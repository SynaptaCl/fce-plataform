"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { isRichTextHtml } from "@/lib/utils";
import type { SeccionNota, CampoNota } from "@/lib/modules/especialidad-config";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SeccionEstructuradaRendererProps {
  seccion: SeccionNota;
  valores: Record<string, string | string[]>;
  onChange: (campoId: string, valor: string | string[]) => void;
  readOnly: boolean;
}

// ── Renderer por tipo de campo ────────────────────────────────────────────────

interface CampoRendererProps {
  campo: CampoNota;
  valor: string | string[] | undefined;
  onChange: (valor: string | string[]) => void;
  readOnly: boolean;
}

function CampoRenderer({ campo, valor, onChange, readOnly }: CampoRendererProps) {
  // Campos que siempre son readOnly (calculados automáticamente)
  const esCalculado = campo.id === "imc_calculado" || campo.id === "imc_clasificacion";
  const isReadOnly = readOnly || esCalculado;

  const valorStr = typeof valor === "string" ? valor : "";
  const valorArr = Array.isArray(valor) ? valor : [];

  if (readOnly) {
    // Modo lectura — mostrar como texto estático
    if (campo.tipo === "multi_select") {
      if (valorArr.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1.5">
          {valorArr.map((v) => (
            <span
              key={v}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border"
              style={{
                borderColor: "var(--color-kp-border)",
                backgroundColor: "var(--color-surface-0)",
                color: "var(--color-ink-2)",
              }}
            >
              {v}
            </span>
          ))}
        </div>
      );
    }
    if (campo.tipo === "booleano") {
      if (!valorStr) return null;
      return (
        <p className="text-sm" style={{ color: "var(--color-ink-1)" }}>
          {valorStr === "true" ? "Sí" : "No"}
        </p>
      );
    }
    if (!valorStr) return null;
    // texto_largo puede contener HTML rich-text — renderizar como tal
    if (campo.tipo === "texto_largo" && isRichTextHtml(valorStr)) {
      return (
        <div
          className="rte-display"
          style={{ color: "var(--color-ink-1)" }}
          // Contenido sanitizado server-side en nota-clinica.ts antes de guardar
          dangerouslySetInnerHTML={{ __html: valorStr }}
        />
      );
    }
    return (
      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-ink-1)" }}>
        {valorStr}
      </p>
    );
  }

  // Modo edición
  switch (campo.tipo) {
    case "texto_largo":
      return (
        <RichTextEditor
          value={valorStr}
          onChange={(html) => onChange(html)}
          placeholder={campo.placeholder}
          readOnly={isReadOnly}
          ariaLabel={campo.label}
          minHeight={120}
        />
      );

    case "texto_corto":
      return (
        <Input
          value={valorStr}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder={campo.placeholder}
          style={isReadOnly ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
        />
      );

    case "select": {
      const opciones = campo.opciones ?? [];
      return (
        <select
          value={valorStr}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          className="w-full rounded-md border text-sm px-3 py-2 focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-kp-border)",
            backgroundColor: "var(--color-surface-1)",
            color: "var(--color-ink-1)",
            ...(isReadOnly ? { opacity: 0.7, cursor: "not-allowed" } : {}),
          }}
        >
          <option value="">Seleccionar…</option>
          {opciones.map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      );
    }

    case "multi_select": {
      const opciones = campo.opciones ?? [];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {opciones.map((op) => {
            const checked = valorArr.includes(op);
            return (
              <label
                key={op}
                className="flex items-center gap-2 cursor-pointer text-sm"
                style={{ color: "var(--color-ink-2)" }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isReadOnly}
                  onChange={() => {
                    const next = checked
                      ? valorArr.filter((v) => v !== op)
                      : [...valorArr, op];
                    onChange(next);
                  }}
                  className="rounded"
                  style={{ accentColor: "var(--color-kp-primary)" }}
                />
                {op}
              </label>
            );
          })}
        </div>
      );
    }

    case "escala": {
      const min = campo.min ?? 0;
      const max = campo.max ?? 10;
      const numVal = valorStr ? Number(valorStr) : min;
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs w-6 text-right" style={{ color: "var(--color-ink-3)" }}>{min}</span>
          <input
            type="range"
            min={min}
            max={max}
            value={numVal}
            disabled={isReadOnly}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
            style={{ accentColor: "var(--color-kp-primary)" }}
          />
          <span className="text-xs w-6" style={{ color: "var(--color-ink-3)" }}>{max}</span>
          <span
            className="text-sm font-semibold w-8 text-center px-1 py-0.5 rounded"
            style={{
              backgroundColor: "var(--color-surface-0)",
              color: "var(--color-ink-1)",
              border: "1px solid var(--color-kp-border)",
            }}
          >
            {numVal}
          </span>
        </div>
      );
    }

    case "fecha":
      return (
        <Input
          type="date"
          value={valorStr}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          style={isReadOnly ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
        />
      );

    case "booleano":
      return (
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--color-ink-2)" }}>
          <input
            type="checkbox"
            checked={valorStr === "true"}
            disabled={isReadOnly}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="rounded"
            style={{ accentColor: "var(--color-kp-primary)" }}
          />
          {campo.label}
        </label>
      );

    default:
      return null;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export function SeccionEstructuradaRenderer({
  seccion,
  valores,
  onChange,
  readOnly,
}: SeccionEstructuradaRendererProps) {
  // Si es readOnly y la sección tiene valores, forzar abierta para no ocultar info clínica
  const tieneValores = readOnly && seccion.campos.some(c => {
    const v = valores[c.id];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  const [abierta, setAbierta] = useState(seccion.defaultAbierta || tieneValores);

  // Solo procesar campos con id definido
  const camposConCampos = seccion.campos.filter((c) => c.id);

  // En readOnly: omitir toda la sección si no hay ningún valor
  if (readOnly && camposConCampos.length > 0) {
    const tieneAlgunValor = camposConCampos.some((c) => {
      const v = valores[c.id];
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    });
    if (!tieneAlgunValor) return null;
  }

  const contenido = (
    <div className="space-y-4">
      {camposConCampos.map((campo) => {
        const valor = valores[campo.id];
        // En readOnly con campo tipo booleano sin valor: omitir
        if (readOnly && campo.tipo === "booleano" && !valor) return null;

        return (
          <div key={campo.id} className="space-y-1.5">
            {/* Label — omitir para booleano en edición (el label va dentro del input) */}
            {campo.tipo !== "booleano" && (
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--color-ink-2)" }}
              >
                {campo.label}
                {campo.obligatorio && !readOnly && (
                  <span className="ml-0.5" style={{ color: "var(--color-kp-danger, #E53935)" }}> *</span>
                )}
              </label>
            )}

            <CampoRenderer
              campo={campo}
              valor={valor}
              onChange={(v) => onChange(campo.id, v)}
              readOnly={readOnly}
            />

            {/* Ayuda */}
            {campo.ayuda && !readOnly && (
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                {campo.ayuda}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!seccion.colapsable) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: "var(--color-kp-border)",
          backgroundColor: "var(--color-surface-0)",
        }}
      >
        <div className="mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {seccion.label}
          </p>
          {seccion.descripcion && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
              {seccion.descripcion}
            </p>
          )}
        </div>
        {contenido}
      </div>
    );
  }

  // Colapsable
  return (
    <div
      className="rounded-lg border"
      style={{
        borderColor: "var(--color-kp-border)",
        backgroundColor: "var(--color-surface-0)",
      }}
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {seccion.label}
          </p>
          {seccion.descripcion && !abierta && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
              {seccion.descripcion}
            </p>
          )}
        </div>
        {abierta ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-ink-3)" }} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-ink-3)" }} />
        )}
      </button>

      {abierta && (
        <div className="px-4 pb-4">
          {seccion.descripcion && (
            <p className="text-xs mb-3" style={{ color: "var(--color-ink-3)" }}>
              {seccion.descripcion}
            </p>
          )}
          {contenido}
        </div>
      )}
    </div>
  );
}
