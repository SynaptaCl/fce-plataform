"use client";

import { CheckCircle2 } from "lucide-react";

/**
 * Botón "Firmar y cerrar" para el header del encuentro dental.
 * A diferencia de FirmarHeaderButton (rehab/clinico, una sola página sin tabs),
 * DentalWorkspace organiza el encuentro en tabs — la firma vive en la nota clínica
 * (tab "nota"). Este botón dispara un evento que DentalWorkspace escucha para
 * cambiar a esa tab y luego hacer scroll a #signature-section.
 */
export const DENTAL_FIRMAR_EVENT = "fce:dental-ir-a-firma";

export function FirmarDentalButton() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent(DENTAL_FIRMAR_EVENT));
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{ background: "var(--color-kp-accent)", color: "#fff" }}
    >
      <CheckCircle2 className="w-4 h-4" />
      Firmar y cerrar
    </button>
  );
}
