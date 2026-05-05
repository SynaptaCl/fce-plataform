"use client";

import { CheckCircle2 } from "lucide-react";

export function FirmarHeaderButton() {
  function handleClick() {
    const el = document.getElementById("signature-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{
        background: "var(--color-kp-accent)",
        color: "#fff",
      }}
    >
      <CheckCircle2 className="w-4 h-4" />
      Firmar y cerrar
    </button>
  );
}
