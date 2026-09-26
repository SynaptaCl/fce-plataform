import { FilePlus } from "lucide-react";
import { PatientForm } from "@/components/shared/PatientForm";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";

export const metadata = { title: "Nueva Ficha de Paciente" };

export default function NuevoPacientePage() {
  return (
    <div className="max-w-2xl space-y-5">
      <BackLink href="/dashboard/pacientes" label="Pacientes" current="Nueva ficha" />

      <div>
        <h2 className="text-2xl font-bold text-ink-1 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-kp-accent" />
          Nueva Ficha de Paciente
        </h2>
        <p className="text-sm text-ink-3 mt-0.5">
          Módulo M1 · Identificación y Perfil Sociodemográfico (Decreto 41 MINSAL)
        </p>
      </div>

      <Card>
        <PatientForm mode="create" />
      </Card>
    </div>
  );
}
