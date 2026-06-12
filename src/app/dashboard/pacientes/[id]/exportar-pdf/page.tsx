import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { requirePresupuestos, requireInformes } from "@/lib/modules/guards";
import { FichaCompletaExport } from "@/components/shared/FichaCompletaExport";
import { EpicrisisPdfView } from "@/components/shared/EpicrisisPdfView";
import { PresupuestoList } from "@/components/modules/PresupuestoList";
import { InformeList } from "@/components/modules/InformeList";

export const metadata = { title: "Documentos — FCE" };

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = "ficha" | "presupuestos" | "informes" | "epicrisis";

interface TabDef {
  id: TabId;
  label: string;
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

  const { config, userId, idClinica } = await getClinicaConfigFromSession();
  if (!userId) redirect("/login");
  if (!idClinica) notFound();

  const supabase = await createClient();

  // Nombre del paciente (con guard de tenant) + último egreso firmado para tab Epicrisis
  const [pacienteRes, egresoRes] = await Promise.all([
    supabase
      .from("pacientes")
      .select("nombre, apellido_paterno, apellido_materno")
      .eq("id", id)
      .eq("id_clinica", idClinica)
      .single(),
    supabase
      .from("fce_egresos")
      .select("id")
      .eq("id_paciente", id)
      .eq("id_clinica", idClinica)
      .eq("firmado", true)
      .order("firmado_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!pacienteRes.data) notFound();

  const fullName =
    [
      pacienteRes.data.nombre,
      pacienteRes.data.apellido_paterno,
      pacienteRes.data.apellido_materno,
    ]
      .filter(Boolean)
      .join(" ") || "Paciente";

  const egresoFirmadoId: string | null = egresoRes.data?.id ?? null;

  // Tabs visibles según módulos activos de la clínica
  const tabs: TabDef[] = [
    { id: "ficha", label: "Ficha Clínica" },
    ...(requirePresupuestos(config).success
      ? [{ id: "presupuestos" as const, label: "Presupuestos" }]
      : []),
    ...(requireInformes(config).success
      ? [{ id: "informes" as const, label: "Informes" }]
      : []),
    ...(egresoFirmadoId ? [{ id: "epicrisis" as const, label: "Epicrisis" }] : []),
  ];

  const activeTab: TabId = tabs.some((t) => t.id === tab) ? (tab as TabId) : "ficha";

  return (
    <div>
      <Breadcrumb id={id} fullName={fullName} />
      <TabBar id={id} tabs={tabs} activeTab={activeTab} />

      <div className="max-w-[860px] mx-auto">
        {activeTab === "ficha" && <FichaCompletaExport patientId={id} />}
        {activeTab === "presupuestos" && <PresupuestoList idPaciente={id} />}
        {activeTab === "informes" && <InformeList idPaciente={id} />}
        {activeTab === "epicrisis" && egresoFirmadoId && (
          <EpicrisisPdfView egresoId={egresoFirmadoId} patientId={id} />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Breadcrumb({ id, fullName }: { id: string; fullName: string }) {
  return (
    <div
      className="max-w-[860px] mx-auto mb-3 flex items-center gap-1.5 text-sm"
      style={{ color: "var(--color-ink-3)" }}
    >
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

function TabBar({
  id,
  tabs,
  activeTab,
}: {
  id: string;
  tabs: TabDef[];
  activeTab: TabId;
}) {
  return (
    <div
      className="max-w-[860px] mx-auto flex gap-0 mb-6 border-b"
      style={{ borderColor: "var(--color-kp-border)" }}
    >
      {tabs.map((tab) => {
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
