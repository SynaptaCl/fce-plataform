"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const resetSchema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetFormData) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setServerError(
        "No pudimos actualizar tu contraseña. El enlace puede haber vencido — solicita uno nuevo."
      );
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=ok");
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center px-4"
      style={{ backgroundImage: "url('/imagenes/fondo_login.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm bg-surface-1 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-kp-primary px-8 py-7">
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-7 h-7 text-kp-accent-lt" />
            <span className="text-white font-bold tracking-widest text-sm uppercase">
              FCE
            </span>
          </div>
          <h1 className="text-white text-xl font-bold leading-tight">
            Nueva contraseña
          </h1>
          <p className="text-kp-accent-lt/70 text-xs mt-1">
            Elige una contraseña nueva para tu cuenta
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-8 py-7 space-y-5"
          noValidate
        >
          {serverError && (
            <div className="flex items-start gap-2.5 bg-kp-danger-lt border border-kp-danger/20 text-kp-danger rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
            >
              Contraseña nueva
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-kp-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-kp-danger">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-kp-accent hover:bg-kp-accent-md text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>

        <div className="px-8 pb-6 flex items-center justify-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success" />
          <span>Conexión segura · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}
