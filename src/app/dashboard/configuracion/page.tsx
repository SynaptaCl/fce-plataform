import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const { config, rol } = await getClinicaConfigFromSession();

  if (!rol || !(ROLES_QUE_CONFIGURAN as string[]).includes(rol)) {
    redirect("/dashboard");
  }

  const clinicaNombre = config?.nombreDisplay ?? "tu clínica";

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
          Administra la configuración de {clinicaNombre}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Card — Estado de la clínica */}
        <Link
          href="/dashboard/configuracion/estado"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: "var(--color-surface-1, #ffffff)",
              borderRadius: 12,
              border: "1px solid var(--color-kp-border, #E2E8F0)",
              cursor: "pointer",
              transition: "box-shadow 0.15s ease",
            }}
            className="config-card"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(0,176,168,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} style={{ color: "var(--color-kp-accent, #00B0A8)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--color-ink-1, #1E293B)",
                  marginBottom: 2,
                }}
              >
                Estado de la clínica
              </div>
              <div style={{ fontSize: 12, color: "var(--color-ink-3, #94A3B8)" }}>
                Verifica si {clinicaNombre} está lista para ir a producción
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--color-ink-3, #94A3B8)", flexShrink: 0 }} />
          </div>
        </Link>
      </div>

      <style>{`
        .config-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
        }
      `}</style>
    </div>
  );
}
