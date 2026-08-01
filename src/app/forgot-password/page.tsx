"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const forgotSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit(data: ForgotFormData) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    // No revelar si el email existe o no (enumeration) — mensaje genérico siempre.
    if (error) {
      setServerError(
        "No pudimos procesar la solicitud en este momento. Intenta de nuevo más tarde."
      );
      return;
    }

    setSent(true);
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
            Recuperar contraseña
          </h1>
          <p className="text-kp-accent-lt/70 text-xs mt-1">
            Te enviaremos un enlace para restablecerla
          </p>
        </div>

        {sent ? (
          <div className="px-8 py-7 space-y-5">
            <div className="flex items-start gap-2.5 bg-kp-success-lt border border-kp-success/20 text-kp-success rounded-lg px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Si el email está registrado, recibirás un enlace para
                restablecer tu contraseña en unos minutos. Revisa también tu
                carpeta de spam.
              </span>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-kp-accent hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
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
                htmlFor="email"
                className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@clinica.cl"
                  {...register("email")}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-kp-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-kp-accent hover:bg-kp-accent-md text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-ink-2 hover:text-kp-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a iniciar sesión
            </Link>
          </form>
        )}

        <div className="px-8 pb-6 flex items-center justify-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success" />
          <span>Conexión segura · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}
