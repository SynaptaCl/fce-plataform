"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Braces,
  Brain,
  ClipboardList,
  Database,
  FileDown,
  FileSignature,
  HeartPulse,
  History,
  Lock,
  Pill,
  Receipt,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/* ─────────────────────────── Datos ─────────────────────────── */

type Modulo = {
  icon: LucideIcon;
  titulo: string;
  cuerpo: string;
  span: string;
  chips?: string[];
  monoChips?: boolean;
  warm?: boolean;
};

const MODULOS: Modulo[] = [
  {
    icon: ClipboardList,
    titulo: "Ficha clínica completa",
    cuerpo:
      "Identificación, anamnesis y encuentros clínicos por especialidad, con notas de evolución estructuradas y línea de tiempo del paciente.",
    span: "md:col-span-4",
    chips: ["Odontología", "Clínica ambulatoria", "Rehabilitación"],
  },
  {
    icon: FileSignature,
    titulo: "Consentimientos con firma electrónica",
    cuerpo:
      "Se firman desde el celular del paciente, se sellan con hash SHA-256 y quedan bloqueados: solo admiten revocación con versión nueva.",
    span: "md:col-span-2",
  },
  {
    icon: Pill,
    titulo: "Recetas y órdenes de examen",
    cuerpo:
      "Folios únicos por documento, PDF con validez clínica y control de qué profesionales pueden prescribir.",
    span: "md:col-span-2",
  },
  {
    icon: Receipt,
    titulo: "Presupuestos clínicos",
    cuerpo:
      "Tarificación directa desde el catálogo de prestaciones y saldo de pagos sincronizado con la caja de Synapta.",
    span: "md:col-span-2",
  },
  {
    icon: FileDown,
    titulo: "Informes y documentos",
    cuerpo:
      "Informes clínicos exportables a PDF, con la identidad del profesional responsable en cada documento.",
    span: "md:col-span-2",
  },
  {
    icon: Braces,
    titulo: "Interoperabilidad FHIR",
    cuerpo:
      "Los datos del paciente se estructuran como recursos FHIR estándar, listos para integrarse con aseguradoras, referencias y analítica.",
    span: "md:col-span-4",
    chips: ["Patient", "Encounter", "Condition", "Observation"],
    monoChips: true,
  },
  {
    icon: Brain,
    titulo: "Plan de intervención",
    cuerpo:
      "Planes por dominios para neurodesarrollo y rehabilitación, con plantillas por especialidad y seguimiento de la evolución.",
    span: "md:col-span-3",
  },
  {
    icon: Sparkles,
    titulo: "Ficha estética",
    cuerpo:
      "Registro de zonas corporales y fotografía clínica asociada a consentimientos específicos del procedimiento.",
    span: "md:col-span-3",
    warm: true,
  },
];

const SEGURIDAD = [
  {
    icon: Database,
    titulo: "Aislamiento por clínica",
    cuerpo:
      "Row Level Security en PostgreSQL separa lógicamente cada tenant. Ninguna consulta cruza clínicas, ni por accidente.",
  },
  {
    icon: Lock,
    titulo: "Ley 21.719",
    cuerpo:
      "Tratamiento de datos de salud alineado con la ley chilena de protección de datos personales, vigente desde diciembre de 2026.",
  },
  {
    icon: History,
    titulo: "Trazabilidad completa",
    cuerpo:
      "Cada creación, edición y firma queda registrada con autor, hora y contenido en una bitácora que no se puede reescribir.",
  },
  {
    icon: ShieldCheck,
    titulo: "Firma verificable",
    cuerpo:
      "Cada consentimiento firmado incluye un sello hash verificable del contenido, el paciente y el momento de la firma.",
  },
] as const;

const ESPECIALIDADES = [
  "Odontología",
  "Kinesiología",
  "Psicología",
  "Neurodesarrollo",
  "Estética",
  "Medicina clínica",
] as const;

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

          <nav
            aria-label="Secciones"
            className="hidden items-center gap-8 md:flex"
          >
            <a
              href="#modulos"
              className="kl-navlink cursor-pointer text-sm font-medium text-ink-2 transition-colors hover:text-ink-1"
            >
              Módulos
            </a>
            <a
              href="#seguridad"
              className="kl-navlink cursor-pointer text-sm font-medium text-ink-2 transition-colors hover:text-ink-1"
            >
              Seguridad
            </a>
            <a
              href="#especialidades"
              className="kl-navlink cursor-pointer text-sm font-medium text-ink-2 transition-colors hover:text-ink-1"
            >
              Especialidades
            </a>
          </nav>

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
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 md:pb-32 md:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <div>
            <p className="kl-rise kl-rise-1 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5">
              <span
                className="kl-pulse-dot h-2 w-2 rounded-full"
                style={{ background: "var(--color-kp-accent)" }}
                aria-hidden
              />
              <span className="font-mono-clinical text-[11px] tracking-[0.12em] text-white/85 uppercase">
                Ficha Clínica Electrónica
              </span>
              <span className="text-white/35" aria-hidden>
                ·
              </span>
              <span className="text-[11px] font-medium text-white/85">
                Synapta HealthTech
              </span>
            </p>

            <h1
              className="kl-rise kl-rise-2 mt-6 max-w-xl text-balance text-[2.4rem] font-bold leading-[1.08] tracking-[-0.025em] text-white md:text-6xl"
              style={{ textWrap: "balance" }}
            >
              La historia clínica de tus pacientes, completa y trazable.
            </h1>

            <p
              className="kl-rise kl-rise-3 mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg"
              style={{ textWrap: "pretty" }}
            >
              Kliniva reúne ficha clínica, consentimientos con firma
              electrónica, recetas, órdenes de examen, presupuestos e informes
              en una sola plataforma para clínicas chilenas. Interoperable con
              FHIR.
            </p>

            <div className="kl-rise kl-rise-4 mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#013a3a] transition-colors hover:bg-kp-accent-lt"
              >
                Iniciar sesión
                <ArrowRight className="kl-arrow h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#modulos"
                className="inline-flex min-h-12 items-center rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white/90 transition-colors hover:border-white/50 hover:text-white"
              >
                Explorar la plataforma
              </a>
            </div>

            <ul className="kl-rise kl-rise-5 mt-10 flex flex-wrap gap-x-6 gap-y-2.5">
              {[
                { icon: ShieldCheck, label: "TLS 1.3" },
                { icon: History, label: "Auditoría inmutable" },
                { icon: Lock, label: "Ley 21.719" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 font-mono-clinical text-xs tracking-wide text-white/70"
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--color-kp-accent)" }}
                    aria-hidden
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock de producto */}
          <div
            className="kl-rise kl-rise-4 relative mx-auto w-full max-w-md lg:max-w-none"
            aria-hidden
          >
            <div className="kl-mock relative rounded-xl bg-white">
              {/* Cabecera paciente */}
              <div className="flex items-center gap-3.5 border-b border-kp-border px-6 py-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-kp-primary), var(--color-kp-accent))",
                  }}
                >
                  MG
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-1">
                    María González Herrera
                  </p>
                  <p className="font-mono-clinical truncate text-xs text-ink-3">
                    RUT 16.234.567-8
                  </p>
                </div>
                <span className="rounded-full bg-kp-accent-xs px-3 py-1 text-[11px] font-semibold text-kp-primary">
                  Odontología
                </span>
              </div>

              {/* Nota de evolución */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: "var(--color-kp-accent)" }}
                  />
                  <div className="flex-1 border-t border-dashed border-kp-border-md" />
                  <span className="font-mono-clinical text-[11px] text-ink-3">
                    Hoy · 09:40
                  </span>
                </div>
                <p className="mt-3.5 text-sm font-semibold text-ink-1">
                  Nota de evolución · Control
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                  Paciente asintomática. Refiere mejora en higiene
                  interproximal. Se indica control en 6 meses.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-surface-0 px-2.5 py-1 font-mono-clinical text-[11px] text-ink-2">
                    PA 118/76
                  </span>
                  <span className="rounded-md bg-surface-0 px-2.5 py-1 font-mono-clinical text-[11px] text-ink-2">
                    FC 72 lpm
                  </span>
                  <span className="rounded-md bg-surface-0 px-2.5 py-1 font-mono-clinical text-[11px] text-ink-2">
                    SpO₂ 98%
                  </span>
                </div>
              </div>

              {/* Consentimiento */}
              <div className="mx-6 mb-5 flex items-center gap-3 rounded-lg border border-kp-success/25 bg-kp-success-lt px-4 py-3">
                <ShieldCheck
                  className="h-4.5 w-4.5 shrink-0 text-kp-success"
                  aria-hidden
                />
                <p className="text-xs font-medium text-kp-success">
                  Consentimiento informado firmado
                </p>
                <span className="font-mono-clinical ml-auto text-[10px] text-kp-success/80">
                  SHA-256 ✓
                </span>
              </div>
            </div>

            {/* Chips flotantes */}
            <div
              className="kl-chip-float kl-float absolute -left-5 top-16 hidden items-center gap-2.5 rounded-lg border border-kp-border bg-white px-4 py-3 sm:flex"
              aria-hidden
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kp-accent-xs">
                <Pill className="h-4 w-4 text-kp-primary" />
              </span>
              <div>
                <p className="font-mono-clinical text-[11px] font-medium text-ink-1">
                  Receta R-000342
                </p>
                <p className="text-[10px] text-ink-3">Emitida · folio único</p>
              </div>
            </div>

            <div
              className="kl-chip-float kl-float-slow absolute -right-4 bottom-14 hidden items-center gap-2.5 rounded-lg border border-kp-border bg-white px-4 py-3 sm:flex"
              aria-hidden
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kp-accent-xs">
                <FileDown className="h-4 w-4 text-kp-primary" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-ink-1">
                  Informe clínico
                </p>
                <p className="text-[10px] text-ink-3">Exportado a PDF</p>
              </div>
            </div>
          </div>
        </div>

        {/* Línea ECG */}
        <div className="border-t border-white/10">
          <svg
            className="kl-ecg block h-16 w-full"
            viewBox="0 0 1440 80"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 44 H220 l14 -14 8 26 10 -40 10 46 8 -18 H440 l14 -14 8 26 10 -40 10 46 8 -18 H660 l14 -14 8 26 10 -40 10 46 8 -18 H880 l14 -14 8 26 10 -40 10 46 8 -18 H1100 l14 -14 8 26 10 -40 10 46 8 -18 H1320 l14 -14 8 26 10 -40 10 46 8 -18 H1440"
              stroke="var(--color-kp-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>
        </div>
      </section>

      {/* ═══════════ Módulos ═══════════ */}
      <section id="modulos" className="scroll-mt-20 bg-surface-0 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-bold tracking-tight text-ink-1 md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              Una plataforma, todos los módulos clínicos
            </h2>
            <p
              className="mt-4 text-base leading-relaxed text-ink-2"
              style={{ textWrap: "pretty" }}
            >
              Cada módulo se activa según el plan de tu clínica y crece con
              ella, desde la primera consulta hasta el informe final.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
            {MODULOS.map(
              ({
                icon: Icon,
                titulo,
                cuerpo,
                span,
                chips,
                monoChips,
                warm,
              }) => (
                <article
                  key={titulo}
                  className={`kl-tile rounded-xl border border-kp-border bg-white p-6 ${span}`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                      warm ? "bg-kp-secondary-lt" : "bg-kp-accent-xs"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${warm ? "text-kp-secondary" : "text-kp-primary"}`}
                      aria-hidden
                    />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink-1">
                    {titulo}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {cuerpo}
                  </p>
                  {chips && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <li
                          key={chip}
                          className={`rounded-md border border-kp-border px-2.5 py-1 text-[11px] ${
                            monoChips
                              ? "font-mono-clinical text-ink-2"
                              : "font-medium text-ink-2"
                          }`}
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ Seguridad ═══════════ */}
      <section id="seguridad" className="kl-secure-band scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              Diseñada para datos de salud
            </h2>
            <p
              className="mt-4 text-base leading-relaxed text-white/75"
              style={{ textWrap: "pretty" }}
            >
              Cada decisión de arquitectura responde a una sola pregunta:
              cómo proteger la información clínica de tus pacientes.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {SEGURIDAD.map(({ icon: Icon, titulo, cuerpo }) => (
              <div key={titulo}>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                  <Icon
                    className="h-5 w-5"
                    style={{ color: "var(--color-kp-accent)" }}
                    aria-hidden
                  />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">
                  {titulo}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  {cuerpo}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 flex items-center gap-2.5 font-mono-clinical text-xs tracking-wide text-white/55">
            <HeartPulse
              className="h-4 w-4"
              style={{ color: "var(--color-kp-accent)" }}
              aria-hidden
            />
            Cifrado en tránsito y en reposo · Respaldo continuo · Control de
            acceso por rol
          </p>
        </div>
      </section>

      {/* ═══════════ Especialidades ═══════════ */}
      <section
        id="especialidades"
        className="scroll-mt-20 border-b border-kp-border bg-white py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md">
              <h2
                className="text-3xl font-bold tracking-tight text-ink-1"
                style={{ textWrap: "balance" }}
              >
                Plantillas por especialidad
              </h2>
              <p
                className="mt-4 text-base leading-relaxed text-ink-2"
                style={{ textWrap: "pretty" }}
              >
                El encuentro clínico se adapta a tu práctica: campos, escalas y
                documentos propios de cada disciplina.
              </p>
            </div>
            <ul className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-3 lg:justify-end">
              {ESPECIALIDADES.map((esp, i) => (
                <li key={esp} className="flex items-center gap-3">
                  <span className="text-[15px] font-semibold text-kp-primary">
                    {esp}
                  </span>
                  {i < ESPECIALIDADES.length - 1 && (
                    <span className="h-1 w-1 rounded-full bg-kp-accent" aria-hidden />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex items-center gap-3 text-ink-3">
            <Activity
              className="h-4 w-4 shrink-0"
              style={{ color: "var(--color-kp-accent)" }}
              aria-hidden
            />
            <p className="text-sm">
              Agenda, pagos y chatbot de pacientes operan en la suite Synapta y
              se conectan a la misma ficha.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA final ═══════════ */}
      <section className="bg-surface-0 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl bg-kp-accent-lt px-6 py-14 text-center md:px-16">
            <h2
              className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-[#014040] md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              ¿Tu clínica ya trabaja con Kliniva?
            </h2>
            <p
              className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#145c58]"
              style={{ textWrap: "pretty" }}
            >
              Ingresa con tu cuenta profesional y retoma tu jornada clínica
              donde la dejaste.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-kp-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-kp-primary-hover"
              >
                Iniciar sesión
                <ArrowRight className="kl-arrow h-4 w-4" aria-hidden />
              </Link>
              <a
                href="https://synapta.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center text-sm font-semibold text-kp-primary underline-offset-4 hover:underline"
              >
                Implementación nueva: conversemos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="kl-footer">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <Image
                src="/imagenes/logo.svg"
                alt="Synapta HealthTech"
                width={168}
                height={85}
                style={{ width: "auto", height: 34 }}
              />
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Kliniva es la ficha clínica electrónica multi-tenant de Synapta
                HealthTech, construida para clínicas chilenas.
              </p>
            </div>

            <nav
              aria-label="Enlaces de la plataforma"
              className="flex flex-col gap-3"
            >
              <span className="font-mono-clinical text-[11px] tracking-[0.12em] text-white/40 uppercase">
                Plataforma
              </span>
              <a
                href="#modulos"
                className="cursor-pointer text-sm text-white/70 transition-colors hover:text-white"
              >
                Módulos
              </a>
              <a
                href="#seguridad"
                className="cursor-pointer text-sm text-white/70 transition-colors hover:text-white"
              >
                Seguridad
              </a>
              <a
                href="#especialidades"
                className="cursor-pointer text-sm text-white/70 transition-colors hover:text-white"
              >
                Especialidades
              </a>
              <Link
                href="/login"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Iniciar sesión
              </Link>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono-clinical text-xs text-white/45">
              © 2026 Synapta HealthTech SpA
            </p>
            <p className="font-mono-clinical text-xs text-white/45">
              Kliniva · Ficha Clínica Electrónica
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
