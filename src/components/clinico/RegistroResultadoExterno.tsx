'use client';

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { InstrumentoSchema, RegistroExternoResultado } from "@/types/instrumento";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toExterno(valor: Record<string, number | string>): RegistroExternoResultado {
  return {
    modulo_version: valor.modulo_version as string | undefined,
    puntaje_general: valor.puntaje_general as string | undefined,
    clasificacion: valor.clasificacion as string | undefined,
    observaciones: valor.observaciones as string | undefined,
    adjunto_url: valor.adjunto_url as string | undefined,
    subescalas: valor.subescalas_json
      ? (JSON.parse(valor.subescalas_json as string) as { label: string; valor: string }[])
      : undefined,
  };
}

function fromExterno(ext: RegistroExternoResultado): Record<string, number | string> {
  const result: Record<string, number | string> = {};
  if (ext.modulo_version) result.modulo_version = ext.modulo_version;
  if (ext.puntaje_general) result.puntaje_general = ext.puntaje_general;
  if (ext.clasificacion) result.clasificacion = ext.clasificacion;
  if (ext.observaciones) result.observaciones = ext.observaciones;
  if (ext.adjunto_url) result.adjunto_url = ext.adjunto_url;
  if (ext.subescalas) result.subescalas_json = JSON.stringify(ext.subescalas);
  return result;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RegistroResultadoExternoProps {
  schema: InstrumentoSchema;
  valor: Record<string, number | string>;
  onChange: (v: Record<string, number | string>) => void;
  readOnly?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RegistroResultadoExterno({
  schema,
  valor,
  onChange,
  readOnly = false,
}: RegistroResultadoExternoProps) {
  const externo = toExterno(valor);

  function update(patch: Partial<RegistroExternoResultado>) {
    onChange(fromExterno({ ...externo, ...patch }));
  }

  function handleSubescalaChange(index: number, field: "label" | "valor", text: string) {
    const next = [...(externo.subescalas ?? [])];
    next[index] = { ...next[index], [field]: text };
    update({ subescalas: next });
  }

  function addSubescala() {
    const next = [...(externo.subescalas ?? []), { label: "", valor: "" }];
    update({ subescalas: next });
  }

  function removeSubescala(index: number) {
    const next = (externo.subescalas ?? []).filter((_, i) => i !== index);
    update({ subescalas: next.length > 0 ? next : undefined });
  }

  // ── Read-only view ─────────────────────────────────────────────────────────

  if (readOnly) {
    return (
      <div className="space-y-4">
        {schema.descripcion && (
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            {schema.descripcion}
          </p>
        )}

        <ReadField label="Módulo / Versión" value={externo.modulo_version} />
        <ReadField label="Puntaje general" value={externo.puntaje_general} />
        <ReadField label="Clasificación" value={externo.clasificacion} />

        {externo.subescalas && externo.subescalas.length > 0 && (
          <div>
            <p
              className="text-sm font-medium mb-2"
              style={{ color: "var(--color-ink-1)" }}
            >
              Subescalas
            </p>
            <ul className="space-y-1">
              {externo.subescalas.map((sub, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span style={{ color: "var(--color-ink-2)" }}>{sub.label}:</span>
                  <span style={{ color: "var(--color-ink-1)" }}>{sub.valor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ReadField label="Observaciones" value={externo.observaciones} multiline />
        <ReadField label="URL adjunto" value={externo.adjunto_url} />
      </div>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────────────────

  const subescalas = externo.subescalas ?? [];
  const canAddSubescala = subescalas.length < 20;

  return (
    <div className="space-y-5">
      {schema.descripcion && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          {schema.descripcion}
        </p>
      )}

      <Input
        label="Módulo / Versión"
        value={externo.modulo_version ?? ""}
        onChange={(e) => update({ modulo_version: e.target.value || undefined })}
        placeholder="Ej. BAYLEY-4, ASQ-3 v2.0"
      />

      <Input
        label="Puntaje general"
        value={externo.puntaje_general ?? ""}
        onChange={(e) => update({ puntaje_general: e.target.value || undefined })}
        placeholder="Ej. 85, 2.5 DS"
      />

      <Input
        label="Clasificación"
        value={externo.clasificacion ?? ""}
        onChange={(e) => update({ clasificacion: e.target.value || undefined })}
        placeholder="Ej. Riesgo alto, Dentro de rango, Retraso leve"
      />

      {/* Subescalas */}
      <div>
        <p
          className="text-sm font-medium mb-2"
          style={{ color: "var(--color-ink-1)" }}
        >
          Subescalas
        </p>

        {subescalas.length === 0 && (
          <p className="text-xs mb-2" style={{ color: "var(--color-ink-3)" }}>
            Sin subescalas registradas.
          </p>
        )}

        <div className="space-y-2">
          {subescalas.map((sub, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  aria-label={`Nombre subescala ${i + 1}`}
                  value={sub.label}
                  onChange={(e) => handleSubescalaChange(i, "label", e.target.value)}
                  placeholder="Nombre"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-kp-border)",
                    color: "var(--color-ink-1)",
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  aria-label={`Valor subescala ${i + 1}`}
                  value={sub.valor}
                  onChange={(e) => handleSubescalaChange(i, "valor", e.target.value)}
                  placeholder="Resultado"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-kp-border)",
                    color: "var(--color-ink-1)",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeSubescala(i)}
                aria-label={`Eliminar subescala ${i + 1}`}
                className="mt-0.5 text-base leading-none px-2 py-2 rounded"
                style={{ color: "var(--color-kp-danger)" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {canAddSubescala && (
          <button
            type="button"
            onClick={addSubescala}
            className="mt-2 text-xs font-medium underline"
            style={{ color: "var(--color-kp-accent)" }}
          >
            + Agregar subescala
          </button>
        )}
      </div>

      <Textarea
        label="Observaciones"
        value={externo.observaciones ?? ""}
        onChange={(e) => update({ observaciones: e.target.value || undefined })}
        placeholder="Observaciones clínicas relevantes del informe externo..."
        rows={3}
      />

      <Input
        label="URL adjunto (PDF informe)"
        value={externo.adjunto_url ?? ""}
        onChange={(e) => update({ adjunto_url: e.target.value || undefined })}
        placeholder="https://..."
        type="url"
      />
    </div>
  );
}

// ── Read-only field helper ────────────────────────────────────────────────────

function ReadField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-medium" style={{ color: "var(--color-ink-1)" }}>
        {label}
      </p>
      {multiline ? (
        <p
          className="text-sm mt-0.5 whitespace-pre-wrap"
          style={{ color: "var(--color-ink-2)" }}
        >
          {value}
        </p>
      ) : (
        <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-2)" }}>
          {value}
        </p>
      )}
    </div>
  );
}
