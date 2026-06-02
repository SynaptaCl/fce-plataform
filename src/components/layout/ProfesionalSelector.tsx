"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User } from "lucide-react";
import { setPerfilActivo } from "@/app/actions/perfil-selector";
import type { ProfesionalPerfil } from "@/lib/fce/profesional";

interface ProfesionalSelectorProps {
  perfiles: ProfesionalPerfil[];
  perfilActivoId: string;
}

export function ProfesionalSelector({
  perfiles,
  perfilActivoId,
}: ProfesionalSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const perfilActivo =
    perfiles.find((p) => p.id === perfilActivoId) ?? perfiles[0];

  function handleSelect(id: string) {
    if (id === perfilActivoId) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      await setPerfilActivo(id);
      router.refresh();
    });
  }

  // Badge siempre visible aunque N=1
  return (
    <div className="relative">
      {perfiles.length > 1 ? (
        // Dropdown si N > 1
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity disabled:opacity-50"
            style={{
              background: "var(--color-kp-accent-xs)",
              color: "var(--color-kp-primary)",
            }}
          >
            <User size={12} />
            <span>{perfilActivo?.especialidad ?? "Sin especialidad"}</span>
            <ChevronDown
              size={12}
              className={
                open
                  ? "rotate-180 transition-transform"
                  : "transition-transform"
              }
            />
          </button>

          {open && (
            <div
              className="absolute right-0 top-8 z-50 w-52 rounded-lg shadow-lg border overflow-hidden"
              style={{
                background: "var(--color-surface-1)",
                borderColor: "var(--color-kp-border)",
              }}
            >
              {perfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{
                    color:
                      p.id === perfilActivoId
                        ? "var(--color-kp-primary)"
                        : "var(--color-ink-1)",
                    fontWeight: p.id === perfilActivoId ? 600 : 400,
                  }}
                >
                  <User size={14} />
                  {p.especialidad}
                </button>
              ))}
            </div>
          )}

          {/* Cerrar al hacer click fuera */}
          {open && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
          )}
        </>
      ) : (
        // Solo badge si N = 1
        <span
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            background: "var(--color-kp-accent-xs)",
            color: "var(--color-kp-primary)",
          }}
        >
          <User size={12} />
          {perfilActivo?.especialidad ?? "Sin especialidad"}
        </span>
      )}
    </div>
  );
}
