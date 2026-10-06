"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setFormatoNotaPreferido } from "@/app/actions/formato-nota";
import type { FormatoNota } from "@/lib/modules/formato-nota";

interface FormatoNotaToggleProps {
  formato: FormatoNota;
  /** Ya existe nota guardada o encuentro cerrado: no se puede cambiar */
  bloqueado: boolean;
}

const OPCIONES: { valor: FormatoNota; label: string }[] = [
  { valor: "soap", label: "SOAP" },
  { valor: "nota_clinica", label: "Nota clínica" },
];

export function FormatoNotaToggle({ formato, bloqueado }: FormatoNotaToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function elegir(valor: FormatoNota) {
    if (bloqueado || valor === formato) return;
    startTransition(async () => {
      await setFormatoNotaPreferido(valor);
      router.replace(`${pathname}?formato=${valor}`);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Formato de nota"
        className="inline-flex rounded-lg border border-kp-border p-0.5 bg-surface-0"
        title={bloqueado ? "El formato no se puede cambiar: ya hay una nota guardada en este encuentro." : undefined}
      >
        {OPCIONES.map((o) => {
          const activo = o.valor === formato;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={bloqueado || pending}
              onClick={() => elegir(o.valor)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:cursor-not-allowed"
              style={{
                background: activo ? "var(--color-kp-primary)" : "transparent",
                color: activo ? "#fff" : "var(--color-ink-2)",
                opacity: bloqueado && !activo ? 0.5 : 1,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!bloqueado && (
        <span className="text-xs text-ink-3">
          {formato === "soap"
            ? "Estructura S-O-A-P con análisis CIF."
            : "Registro simple; complementa con escalas e instrumentos."}
        </span>
      )}
    </div>
  );
}
