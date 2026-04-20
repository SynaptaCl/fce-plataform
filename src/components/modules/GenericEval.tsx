"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { upsertEvaluacion } from "@/app/actions/evaluacion";
import type { Evaluation } from "@/types";

interface GenericEvalProps {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
  especialidad: string;
}

export function GenericEval({
  patientId,
  evaluaciones,
  readOnly = false,
  especialidad,
}: GenericEvalProps) {
  const existing = evaluaciones.find((e) => e.sub_area === "general");
  const [notas, setNotas] = useState<string>(
    ((existing?.data as Record<string, string> | null)?.notas) ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = async () => {
    setStatus("saving");
    const result = await upsertEvaluacion(patientId, especialidad, "general", { notas });
    setStatus(result.success ? "saved" : "error");
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        {notas ? (
          <p className="text-sm text-ink-2 whitespace-pre-wrap">{notas}</p>
        ) : (
          <p className="text-sm text-ink-3 italic">Sin evaluaciones registradas.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Textarea
        label="Notas de evaluación"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={6}
        placeholder="Registre los hallazgos clínicos de la evaluación..."
      />
      {status === "error" && (
        <AlertBanner variant="danger">Error al guardar la evaluación. Intente nuevamente.</AlertBanner>
      )}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-kp-border">
        {status === "saved" && (
          <span className="text-sm text-kp-success font-medium">✓ Guardado</span>
        )}
        <Button onClick={handleSave} disabled={status === "saving"} size="sm">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {status === "saving" ? "Guardando..." : "Guardar evaluación"}
        </Button>
      </div>
    </div>
  );
}
