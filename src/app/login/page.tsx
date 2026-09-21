"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const resetOk = searchParams.get("reset") === "ok";
  const recoveryError = searchParams.get("error") === "recovery_link_invalido";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : "Error al iniciar sesión. Intenta de nuevo."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: "url('/imagenes/fondo_login.jpg')",
      }}
    >
      {/* Filtro tenue: Oscurece el fondo y aplica un desenfoque suave (glassmorphism effect) */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      {/* Card - Se añade 'relative z-10' para que el login quede por encima del filtro */}
      <div className="relative z-10 w-full max-w-sm bg-surface-1 rounded-xl shadow-2xl overflow-hidden">
        {/* Logo — el logo ya incluye el wordmark "Kliniva", no se repite como texto */}
        <div className="flex justify-center pt-7 pb-4 px-8">
          <Image
            src="/imagenes/logo_kliniva_simplificado.png"
            alt="Kliniva"
            width={180}
            height={72}
            priority
            quality={90}
            style={{ width: "auto", height: 40 }}
          />
        </div>

        {/* Header */}
        <div className="bg-kp-primary px-8 py-4">
          <p className="text-kp-accent-lt/80 text-xs text-center">
            Ficha Clínica Electrónica — Acceso profesional
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-8 py-7 space-y-5"
          noValidate
        >
          {/* Aviso: contraseña restablecida con éxito */}
          {resetOk && (
            <div className="flex items-start gap-2.5 bg-kp-success-lt border border-kp-success/20 text-kp-success rounded-lg px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Contraseña actualizada. Ya puedes iniciar sesión.</span>
            </div>
          )}

          {/* Aviso: link de recuperación vencido/inválido */}
          {recoveryError && (
            <div className="flex items-start gap-2.5 bg-kp-warning-lt border border-kp-warning/20 text-kp-warning rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                El enlace de recuperación venció o ya fue usado. Solicita uno
                nuevo.
              </span>
            </div>
          )}

          {/* Error de servidor */}
          {serverError && (
            <div className="flex items-start gap-2.5 bg-kp-danger-lt border border-kp-danger/20 text-kp-danger rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Email */}
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
              <p className="text-xs text-kp-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-kp-accent hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-kp-border rounded-lg bg-surface-0 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-kp-accent focus:border-transparent transition-colors"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-kp-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-kp-accent hover:bg-kp-accent-md text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success" />
          <span>Conexión segura · TLS 1.3</span>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-white/50">
        Acceso restringido a personal autorizado de {"Kliniva"}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
