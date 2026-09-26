import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { requireModule, assertPuedeConfigurar } from "@/lib/modules/guards";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import type { Rol } from "@/lib/modules/registry";
import { getPatientById } from "@/app/actions/patients";
import { getAuditLogs } from "@/app/actions/auditoria";
import { Card } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { formatRut } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Auditoría" };
  const p = result.data;
  return { title: `Auditoría — ${p.apellido_paterno} ${p.nombre}` };
}

export default async function AuditoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { config } = await getClinicaConfigFromSession();
  requireModule(config, "M6_auditoria");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Guard: solo admin / director / superadmin pueden ver auditoría
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("rol")
    .eq("auth_id", user.id)
    .maybeSingle();

  const rolCheck = assertPuedeConfigurar(adminUser?.rol as Rol | null);
  if (!rolCheck.success) redirect(`/dashboard/pacientes/${id}`);

  const [patientResult, logsResult] = await Promise.all([
    getPatientById(id),
    getAuditLogs({ patientId: id }),
  ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const logs = logsResult.success ? logsResult.data : [];
  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink
        href={`/dashboard/pacientes/${id}`}
        label={fullName}
        current="M6 · Auditoría"
      />

      {/* Patient summary */}
      <div className="bg-surface-1 rounded-xl border border-kp-border px-5 py-4 flex items-center gap-4">
        <ShieldCheck className="w-8 h-8 text-kp-accent shrink-0" />
        <div>
          <h2 className="text-base font-bold text-ink-1">{fullName}</h2>
          <p className="text-xs text-ink-3">{formatRut(p.rut)}</p>
        </div>
      </div>

      {/* Admin notice */}
      <AlertBanner variant="info">
        Sección restringida a administradores. Los registros de auditoría son de
        solo lectura (append-only).
      </AlertBanner>

      {!logsResult.success && (
        <AlertBanner variant="danger">{logsResult.error}</AlertBanner>
      )}

      {/* Timeline */}
      <Card className="p-6">
        <AuditTimeline patientId={id} initialLogs={logs} />
      </Card>
    </div>
  );
}
