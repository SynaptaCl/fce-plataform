import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPdfPatientData } from "@/app/actions/exportar-pdf";
import { PdfExportView } from "@/components/shared/PdfExportView";
import { PresupuestoList } from "@/components/modules/PresupuestoList";
import { InformeList } from "@/components/modules/InformeList";

export const metadata = { title: "Documentos — FCE" };

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { id: "ficha",        label: "Ficha Clínica" },
  { id: "presupuestos", label: "Presupuestos" },
  { id: "informes",     label: "Informes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | undefined): value is TabId {
  return TABS.some((t) => t.id === value);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ExportarPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const activeTab: TabId = isTabId(tab) ? tab : "ficha";

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  // Resolve patient name for breadcrumb — needed for ficha tab and breadcrumb
  // For non-ficha tabs we still need the name; fetch a lightweight query.
  let fullName = "Paciente";

  if (activeTab === "ficha") {
    const result = await getPdfPatientData(id);
    if (!result.success) notFound();

    const generatedAt = new Date().toLocaleString("es-CL", {
      timeZone: "America/Santiago",
    });

    const patient = result.data.patient;
    fullName =
      [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
        .filter(Boolean)
        .join(" ") || "Paciente";

    return (
      <div>
        <Breadcrumb id={id} fullName={fullName} />
        <TabBar id={id} activeTab={activeTab} />
        <PdfExportView data={result.data} generatedAt={generatedAt} />
      </div>
    );
  }

  // For presupuestos / informes tabs — fetch patient name only
  const { data: patientRow } = await supabase
    .from("pacientes")
    .select("nombre, apellido_paterno, apellido_materno")
    .eq("id", id)
    .single();

  if (!patientRow) notFound();

  fullName =
    [patientRow.nombre, patientRow.apellido_paterno, patientRow.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Paciente";

  return (
    <div>
      <Breadcrumb id={id} fullName={fullName} />
      <TabBar id={id} activeTab={activeTab} />

      <div className="max-w-[860px] mx-auto">
        {activeTab === "presupuestos" && <PresupuestoList idPaciente={id} />}
        {activeTab === "informes" && <InformeList idPaciente={id} />}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Breadcrumb({ id, fullName }: { id: string; fullName: string }) {
  return (
    <div className="max-w-[860px] mx-auto mb-3 flex items-center gap-1.5 text-sm"
      style={{ color: "var(--color-ink-3)" }}>
      <Link
        href={`/dashboard/pacientes/${id}`}
        className="flex items-center gap-1 transition-colors hover:opacity-80"
        style={{ color: "var(--color-ink-3)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a ficha de {fullName}
      </Link>
    </div>
  );
}

function TabBar({ id, activeTab }: { id: string; activeTab: TabId }) {
  return (
    <div
      className="max-w-[860px] mx-auto flex gap-0 mb-6 border-b"
      style={{ borderColor: "var(--color-kp-border)" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/dashboard/pacientes/${id}/exportar-pdf?tab=${tab.id}`}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={
              isActive
                ? {
                    color: "var(--color-kp-primary)",
                    borderBottom: "2px solid var(--color-kp-primary)",
                    marginBottom: "-1px",
                  }
                : { color: "var(--color-ink-2)" }
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
