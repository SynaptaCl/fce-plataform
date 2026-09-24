import { notFound } from "next/navigation";
import { formatRut, calculateAge } from "@/lib/utils";
import { getPatientById } from "@/app/actions/patients";
import {
  getPlanesIntervencion,
  getPlanIntervencionDetalle,
} from "@/app/actions/clinico/plan-intervencion";
import { getPlanActivo } from "@/app/actions/dental/plan-tratamiento";
import { getNotasAdministrativas } from "@/app/actions/coordinacion/notas";
import { NotasAdministrativasPanel } from "./NotasAdministrativasPanel";
import { PlanIntervencionResumenCard } from "./PlanIntervencionResumenCard";
import { PlanTratamientoResumenCard } from "./PlanTratamientoResumenCard";

interface CoordinadorPatientViewProps {
  patientId: string;
}

export async function CoordinadorPatientView({ patientId }: CoordinadorPatientViewProps) {
  const patientResult = await getPatientById(patientId);
  if (!patientResult.success) notFound();
  const paciente = patientResult.data;

  const [planesResult, planTratamientoResult, notasResult] = await Promise.all([
    getPlanesIntervencion(patientId),
    getPlanActivo(patientId),
    getNotasAdministrativas(patientId),
  ]);

  const planes = planesResult.success ? planesResult.data : [];
  const detalles = await Promise.all(planes.map((p) => getPlanIntervencionDetalle(p.id)));

  const fullName =
    [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";
  const age = calculateAge(paciente.fecha_nacimiento);
  const initials =
    `${paciente.nombre?.charAt(0) ?? ""}${paciente.apellido_paterno?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  return (
    <div className="flex flex-col gap-5 px-5 py-4 max-w-3xl">
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
      >
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 44,
            height: 44,
            background: "var(--color-kp-accent-xs)",
            color: "var(--color-kp-primary)",
            fontWeight: 600,
            fontSize: 15,
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-base font-semibold truncate" style={{ color: "var(--color-ink-1)" }}>
            {fullName}
          </span>
          <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            {formatRut(paciente.rut)}
            {age !== null ? ` · ${age} años` : ""}
            {paciente.telefono ? ` · ${paciente.telefono}` : ""}
          </span>
        </div>
      </div>

      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{ color: "var(--color-ink-3)", background: "var(--color-surface-0)" }}
      >
        Vista de acceso administrativo — sin historial clínico. Consulta con el profesional
        tratante para información clínica detallada.
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          Plan de intervención
        </h2>
        {detalles.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Este paciente no tiene plan de intervención registrado.
          </p>
        ) : (
          detalles.map((d) =>
            d.success ? (
              <PlanIntervencionResumenCard key={d.data.id} detalle={d.data} patientId={patientId} />
            ) : null
          )
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          Plan de tratamiento dental
        </h2>
        {planTratamientoResult.success && planTratamientoResult.data ? (
          <PlanTratamientoResumenCard plan={planTratamientoResult.data} />
        ) : (
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Este paciente no tiene plan de tratamiento dental activo.
          </p>
        )}
      </div>

      <NotasAdministrativasPanel
        patientId={patientId}
        notasIniciales={notasResult.success ? notasResult.data : []}
      />
    </div>
  );
}
