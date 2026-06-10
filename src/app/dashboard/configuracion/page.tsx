import { redirect } from "next/navigation";
import { User, Lock, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import { CambiarClaveForm } from "./CambiarClaveForm";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica, rol, nombre, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  if (!adminRow) redirect("/dashboard");

  const [{ data: clinica }, { data: fceConfig }] = await Promise.all([
    supabase
      .from("clinicas")
      .select("nombre, slug")
      .eq("id", adminRow.id_clinica)
      .single(),
    supabase
      .from("clinicas_fce_config")
      .select("modulos_activos, especialidades_activas")
      .eq("id_clinica", adminRow.id_clinica)
      .single(),
  ]);

  const isAdmin = (ROLES_QUE_CONFIGURAN as string[]).includes(adminRow.rol as string);
  const modulosActivos = (fceConfig?.modulos_activos as string[] | null) ?? [];
  const especialidadesActivas = (fceConfig?.especialidades_activas as string[] | null) ?? [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-ink-1, #1E293B)",
            margin: 0,
          }}
        >
          Configuración
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-3, #94A3B8)",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* ── Mis datos ── */}
      <Section title="Mis datos" icon={<User size={16} />}>
        <InfoRow label="Nombre" value={adminRow.nombre ?? "—"} />
        <InfoRow label="Email" value={user.email ?? "—"} />
        <InfoRow label="Rol" value={adminRow.rol ?? "—"} />
        <InfoRow label="Clínica" value={clinica?.nombre ?? "—"} />
      </Section>

      {/* ── Cambiar contraseña ── */}
      <Section title="Cambiar contraseña" icon={<Lock size={16} />}>
        <CambiarClaveForm />
      </Section>

      {/* ── Información de la clínica (solo admin/director) ── */}
      {isAdmin && (
        <Section title="Información de la clínica" icon={<Building2 size={16} />}>
          <InfoRow label="Nombre" value={clinica?.nombre ?? "—"} />
          <InfoRow label="Slug" value={clinica?.slug ?? "—"} />
          <InfoRow
            label="Módulos activos"
            value={modulosActivos.length > 0 ? modulosActivos.join(", ") : "Sin configurar"}
          />
          <InfoRow
            label="Especialidades"
            value={
              especialidadesActivas.length > 0 ? especialidadesActivas.join(", ") : "Sin configurar"
            }
          />
        </Section>
      )}

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
        background: "var(--color-surface-1, #ffffff)",
        borderRadius: 12,
        border: "1px solid var(--color-kp-border, #E2E8F0)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-kp-border, #E2E8F0)",
          background: "var(--color-surface-0, #F1F5F9)",
        }}
      >
        <span style={{ color: "var(--color-kp-accent, #00B0A8)" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-1, #1E293B)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
      <span
        style={{ color: "var(--color-ink-3, #94A3B8)", width: 150, flexShrink: 0 }}
      >
        {label}
      </span>
      <span style={{ color: "var(--color-ink-1, #1E293B)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

