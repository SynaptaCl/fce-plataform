"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadFotoFicha } from "@/app/actions/estetica/fotos";
import type { TipoFoto } from "@/types/estetica";

interface Props {
  idFicha: string;
  patientId: string;
  onUploaded: () => void;
}

export function FotoUploader({ idFicha, patientId, onUploaded }: Props) {
  const [tipo, setTipo] = useState<TipoFoto>("antes");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const res = await uploadFotoFicha({
      idFicha,
      patientId,
      tipo,
      region: null,
      zonaCodigo: null,
      file,
    });
    setUploading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onUploaded();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoFoto)}
        className="text-sm px-2 py-1.5 rounded-lg border"
        style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
      >
        <option value="antes">Antes</option>
        <option value="despues">Después</option>
        <option value="evolucion">Evolución</option>
      </select>

      <label
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-colors"
        style={{ color: "var(--color-kp-accent)", borderColor: "var(--color-kp-accent)" }}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        Subir foto
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {error && (
        <span className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
