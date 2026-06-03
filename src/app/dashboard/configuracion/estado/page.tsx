import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RefreshCw } from "lucide-react";
import { getClinicaConfigFromSession } from "@/lib/modules/config";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import { validateClinica } from "@/lib/onboarding/validate-clinica";
import { EstadoSaludPanel } from "@/components/configuracion/EstadoSaludPanel";

export const metadata = { title: "Estado de la clínica" };

async function revalidarEstado() {
  "use server";
  revalidatePath("/dashboard/configuracion/estado");
}

export default async function EstadoClinicaPage() {
  const { config, rol } = await getClinicaConfigFromSession();

  if (!rol || !(ROLES_QUE_CONFIGURAN as string[]).includes(rol)) {
    redirect("/dashboard");
  }

  if (!config?.slug) {
    redirect("/dashboard/configuracion");
  }

  const result = await validateClinica(config.slug);

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-ink-1, #1E293B)",
              margin: 0,
            }}
          >
            Estado de la clínica
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-3, #94A3B8)",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Verifica que {config.nombreDisplay} esté lista para go-live
          </p>
        </div>

        <form action={revalidarEstado}>
          <button
            type="submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid var(--color-kp-border, #E2E8F0)",
              background: "var(--color-surface-1, #ffffff)",
              color: "var(--color-ink-2, #475569)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            <RefreshCw size={14} />
            Re-verificar
          </button>
        </form>
      </div>

      {/* Panel de estado */}
      <EstadoSaludPanel result={result} clinicaNombre={config.nombreDisplay} />
    </div>
  );
}
