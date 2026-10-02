import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Database,
  FileSignature,
  History,
  Link2,
  Lock,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* ─────────────────────────── Datos ─────────────────────────── */

const CONFIANZA: { icon: LucideIcon; label: string }[] = [
  { icon: Lock, label: "Alineada con la Ley 21.719" },
  { icon: Database, label: "Datos aislados por clínica" },
  { icon: History, label: "Auditoría de cada acción" },
  { icon: ShieldCheck, label: "Documentos firmados inmutables" },
];

const PILARES: { icon: LucideIcon; titulo: string; cuerpo: string }[] = [
  {
    icon: FileSignature,
    titulo: "Ficha y documentos en un solo lugar",
    cuerpo:
      "Historia clínica, consentimientos con firma electrónica, recetas, órdenes de examen, presupuestos e informes.",
  },
  {
    icon: ShieldCheck,
    titulo: "Segura y trazable",
    cuerpo:
      "Cada clínica trabaja aislada de las demás, y cada creación, edición y firma queda registrada.",
  },
  {
    icon: Link2,
    titulo: "Conectada a la suite Synapta",
    cuerpo:
      "Agenda, pagos y chatbot de pacientes se conectan a la misma ficha.",
  },
];

/* ─────────────────────────── Página ─────────────────────────── */

export default function LandingPage() {
  return (
    <div className="kl-landing bg-surface-0">
      {/* ═══════════ Header ═══════════ */}
      <header className="sticky top-0 z-40 border-b border-kp-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="Kliniva, volver al inicio"
            className="flex items-center"
          >
            <Image
              src="/imagenes/logo_kliniva_simplificado.png"
              alt="Kliniva"
              width={190}
              height={72}
              priority
              style={{ width: "auto", height: 34 }}
            />
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-kp-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-kp-primary-hover"
          >
            Iniciar sesión
            <ArrowRight className="kl-arrow h-4 w-4" aria-hidden />
          </Link>
        </div>
      </header>

      {/* ═══════════ Hero ═══════════ */}
      <section className="kl-hero text-white">
        <Image
          src="/imagenes/landing/bg-a.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={75}
          className="-z-10 object-cover object-right opacity-90"
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 md:pb-32 md:pt-24 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="kl-rise kl-rise-1 font-mono-clinical text-[11px] tracking-[0.16em] text-white/70 uppercase">
              Ficha Clínica Electrónica
            </p>

            <h1
              className="kl-on-dark kl-rise kl-rise-2 mt-5 max-w-xl text-balance text-[2.5rem] font-bold leading-[1.06] tracking-[-0.03em] text-white md:text-[3.75rem]"
              style={{ textWrap: "balance" }}
            >
              La historia clínica de tus pacientes, completa y trazable.
            </h1>

            <p
              className="kl-rise kl-rise-3 mt-6 max-w-md text-base leading-relaxed text-white/80 md:text-lg"
              style={{ textWrap: "pretty" }}
            >
              Ingresa con tu cuenta profesional y retoma tu jornada clínica
              donde la dejaste.
            </p>

            <div className="kl-rise kl-rise-4 mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-semibold text-[#013a3a] shadow-lg shadow-black/20 transition-colors hover:bg-kp-accent-lt"
              >
                Iniciar sesión
                <ArrowRight className="kl-arrow h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#que-es"
                className="inline-flex min-h-12 items-center px-2 text-sm font-semibold text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Qué es Kliniva
              </a>
            </div>
          </div>

          {/* Foto + tarjeta de producto superpuesta */}
          <div className="kl-rise kl-rise-4 relative mx-auto w-full max-w-sm lg:max-w-none lg:pl-8">
            <div className="kl-photo relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image
                src="/imagenes/landing/hero-a.png"
                alt="Profesional de la salud revisando la ficha de un paciente en una tableta"
                fill
                priority
                sizes="(min-width: 1024px) 440px, 90vw"
                quality={75}
                className="object-cover"
              />
            </div>

            <div
              className="kl-mock absolute -bottom-8 -left-4 w-[17.5rem] rounded-xl bg-white sm:-left-8 sm:w-72"
              aria-hidden
            >
              <div className="flex items-center gap-3 border-b border-kp-border px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-kp-primary), var(--color-kp-accent))",
                  }}
                >
                  MG
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-1">
                    María González H.
                  </p>
                  <p className="text-[11px] text-ink-3">Nota de evolución · Hoy</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-kp-success"
                  aria-hidden
                />
                <p className="text-xs font-medium text-kp-success">
                  Consentimiento firmado
                </p>
                <span className="font-mono-clinical ml-auto text-[10px] text-kp-success/80">
                  SHA-256 ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Franja de confianza ═══════════ */}
      <section
        aria-label="Garantías de la plataforma"
        className="border-b border-kp-border bg-white"
      >
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-6 py-6 pt-14 md:grid-cols-4 md:pt-6">
          {CONFIANZA.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 text-[13px] font-medium text-ink-2"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-kp-primary"
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* ═══════════ Qué es Kliniva ═══════════ */}
      <section id="que-es" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="kl-photo relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl lg:max-w-none">
            <Image
              src="/imagenes/landing/hero-b.png"
              alt="Profesional de la salud utilizando Kliniva en su consulta"
              fill
              sizes="(min-width: 1024px) 400px, 90vw"
              quality={75}
              className="object-cover"
            />
          </div>

          <div>
            <p className="font-mono-clinical text-[11px] tracking-[0.16em] text-kp-primary uppercase">
              Qué es Kliniva
            </p>
            <h2
              className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-ink-1 md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              La ficha clínica electrónica de Synapta HealthTech
            </h2>
            <p
              className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 md:text-lg"
              style={{ textWrap: "pretty" }}
            >
              Construida para clínicas chilenas. Reúne todo lo que necesitas
              para atender y documentar a tus pacientes.
            </p>

            <ul className="mt-10 divide-y divide-kp-border border-y border-kp-border">
              {PILARES.map(({ icon: Icon, titulo, cuerpo }) => (
                <li key={titulo} className="flex gap-4 py-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kp-accent-xs">
                    <Icon className="h-[18px] w-[18px] text-kp-primary" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink-1">
                      {titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">
                      {cuerpo}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════ Synapta ═══════════ */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="kl-hero mx-auto max-w-6xl rounded-2xl text-white">
          <Image
            src="/imagenes/landing/bg-b.png"
            alt=""
            fill
            sizes="1152px"
            quality={75}
            className="-z-10 object-cover object-right"
            aria-hidden
          />
          <div className="flex flex-col gap-8 px-8 py-12 md:flex-row md:items-center md:justify-between md:px-14 md:py-16">
            <div className="max-w-lg">
              <Image
                src="/imagenes/logo.svg"
                alt="Synapta HealthTech"
                width={168}
                height={85}
                style={{ width: "auto", height: 36 }}
              />
              <h2
                className="kl-on-dark mt-6 text-2xl font-bold tracking-tight md:text-3xl"
                style={{ textWrap: "balance" }}
              >
                Kliniva es parte de Synapta HealthTech
              </h2>
              <p
                className="mt-3 text-base leading-relaxed text-white/75"
                style={{ textWrap: "pretty" }}
              >
                ¿Quieres sumar Kliniva a tu clínica? Conoce la suite completa.
              </p>
            </div>
            <a
              href="https://synapta.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 md:self-auto"
            >
              Visitar synapta.cl
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="kl-footer">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono-clinical text-xs text-white/45">
            © 2026 Synapta HealthTech SpA
          </p>
          <p className="font-mono-clinical text-xs text-white/45">
            Kliniva · Ficha Clínica Electrónica
          </p>
        </div>
      </footer>
    </div>
  );
}
