"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { createEncuentro, type EncuentroEnProgreso } from "@/app/actions/encuentros";
import { getRutaEncuentro } from "@/lib/modules/modelos";

interface Props {
  patientId: string;
  label: string;
  /** Especialidad del profesional activo; null = usuario sin permiso de atención. */
  especialidad: string | null;
  enProgreso: EncuentroEnProgreso | null;
}

/**
 * Los diagnósticos/indicaciones viven dentro de documentos de una atención (nota/SOAP),
 * por lo que "agregar" abre la atención en progreso o, si no hay, inicia una
 * (createEncuentro es idempotente). Sin permiso de escritura: texto sin enlace.
 */
export function AgregarEnAtencionLink({ patientId, label, especialidad, enProgreso }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const style = { fontSize: 11, color: "var(--color-ink-3, #94A3B8)" } as const;

  if (!especialidad) return <span style={style}>Sin registros</span>;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      if (enProgreso) {
        router.push(getRutaEncuentro(enProgreso.modelo, patientId, enProgreso.id));
        return;
      }
      const res = await createEncuentro(patientId, especialidad as string);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(getRutaEncuentro(res.data.modelo, patientId, res.data.encuentroId));
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={{ ...style, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        className="hover:text-kp-accent transition-colors disabled:opacity-50"
      >
        <PlusCircle className="w-3 h-3" />
        {isPending ? "Abriendo atención…" : label}
      </button>
      {error && <p style={{ fontSize: 11, color: "var(--color-kp-danger, #DC2626)" }}>{error}</p>}
    </div>
  );
}
