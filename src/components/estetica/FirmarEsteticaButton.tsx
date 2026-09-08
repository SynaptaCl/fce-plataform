"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  disabled: boolean;
  onFirmar: () => Promise<void>;
}

export function FirmarEsteticaButton({ disabled, onFirmar }: Props) {
  const [firmando, setFirmando] = useState(false);

  async function handleClick() {
    setFirmando(true);
    await onFirmar();
    setFirmando(false);
  }

  return (
    <button
      type="button"
      disabled={disabled || firmando}
      onClick={handleClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      style={{ background: "var(--color-kp-accent)", color: "#fff" }}
    >
      {firmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      Firmar ficha
    </button>
  );
}
