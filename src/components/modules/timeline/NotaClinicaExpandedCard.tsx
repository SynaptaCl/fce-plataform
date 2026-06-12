// src/components/modules/timeline/NotaClinicaExpandedCard.tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import { Section, EntryFooter, EncuentroLink, KeyValueList, formatDate } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";
import { DiagnosticoChip } from '@/components/clinico/DiagnosticoChip';
import type { ICDCodeSnap } from '@/lib/icd/types';

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

export function NotaClinicaExpandedCard({ entry, patientId }: Props) {
  const d = entry.data;
  const cie10 = (d.cie10_codigos ?? []) as string[];

  const url = entry.encuentroId
    ? `/dashboard/pacientes/${patientId}/encuentro/${entry.encuentroId}/clinico`
    : null;

  return (
    <div className="space-y-3">
      {d.motivo_consulta && (
        <Section label="Motivo de consulta">{String(d.motivo_consulta)}</Section>
      )}
      {d.contenido && (
        <Section label="Contenido">{String(d.contenido)}</Section>
      )}
      {d.diagnostico && !(Array.isArray(d.icd_codigos) && (d.icd_codigos as ICDCodeSnap[]).length > 0) && (
        <Section label="Diagnóstico">{String(d.diagnostico)}</Section>
      )}
      {/* ICD-11 códigos estructurados — mostrar chips si existen */}
      {Array.isArray(d.icd_codigos) && (d.icd_codigos as ICDCodeSnap[]).length > 0 && (
        <div>
          <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1.5">
            Diagnóstico ICD-11
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(d.icd_codigos as ICDCodeSnap[]).map((snap) => (
              <DiagnosticoChip key={snap.uri} code={snap} showTooltip={true} />
              // sin onRemove → readOnly
            ))}
          </div>
        </div>
      )}
      {cie10.length > 0 && (
        <div>
          <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1">
            CIE-10
          </p>
          <div className="flex flex-wrap gap-1">
            {cie10.map((code) => (
              <Badge key={code} variant="info">{code}</Badge>
            ))}
          </div>
        </div>
      )}
      {d.plan && (
        <Section label="Plan">{String(d.plan)}</Section>
      )}
      {/* Secciones estructuradas: P2 anidadas { seccion: { campo: valor } } + campos M10 planos (string) */}
      {d.secciones_estructuradas && typeof d.secciones_estructuradas === "object" &&
        Object.entries(d.secciones_estructuradas as Record<string, unknown>).map(([seccion, campos]) => {
          const label = seccion.replace(/_/g, " ");
          if (typeof campos === "string") {
            return campos.trim() ? (
              <Section key={seccion} label={label}>{campos}</Section>
            ) : null;
          }
          if (campos && typeof campos === "object" && !Array.isArray(campos)) {
            return (
              <div key={seccion}>
                <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1.5">
                  {label}
                </p>
                <KeyValueList data={campos as Record<string, unknown>} />
              </div>
            );
          }
          return null;
        })}
      {d.proxima_sesion && (
        <div className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem]">
            Próxima sesión:
          </span>
          <span>{formatDate(String(d.proxima_sesion))}</span>
        </div>
      )}
      <EntryFooter
        firmado={Boolean(d.firmado)}
        nombre={
          d.firmado_por_nombre
            ? String(d.firmado_por_nombre)
            : entry.profesional_nombre
        }
        fecha={d.firmado_at ? String(d.firmado_at) : entry.date}
      />
      {url && <EncuentroLink url={url} />}
    </div>
  );
}
