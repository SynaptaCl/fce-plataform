import Link from "next/link";
import { ArrowRight, Calendar, CalendarClock, CheckCircle2 } from "lucide-react";
import { formatDate, formatDateShort, fechaCL, horaCL, esFechaISOValida, cn } from "@/lib/utils";
import { getAgendaDiaria } from "@/app/actions/patients";
import { AgendaTable } from "@/components/shared/AgendaTable";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { citaPorConfirmar, type CitaAgenda } from "@/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Valida el ?fecha= del deep-link: "YYYY-MM-DD" dentro de ±7 días, si no → hoy. */
function resolverFecha(raw: string | string[] | undefined): string {
  const hoy = fechaCL();
  if (typeof raw !== "string" || !esFechaISOValida(raw)) return hoy;
  const base = new Date(`${hoy}T12:00:00Z`).getTime();
  const t = new Date(`${raw}T12:00:00Z`).getTime();
  if (Number.isNaN(t) || Math.abs(t - base) > 7 * 86_400_000) return hoy;
  return raw;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fecha = resolverFecha(sp.fecha);
  return { title: `Agenda · ${formatDateShort(fecha)}` };
}

/** Métricas del día a partir de la lista de citas activas. */
function resumen(citas: CitaAgenda[]) {
  const total = citas.length;
  const confirmadas = citas.filter((c) => !citaPorConfirmar(c.estado)).length;
  return {
    total,
    confirmadas,
    porConfirmar: total - confirmadas,
    completadas: citas.filter((c) => c.estado === "completada").length,
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const hoy = fechaCL();
  const manana = fechaCL(1);
  const ahora = horaCL();
  const fechaActiva = resolverFecha(sp.fecha);
  const esHoy = fechaActiva === hoy;

  const [agendaHoyR, agendaMananaR] = await Promise.all([
    getAgendaDiaria(hoy),
    getAgendaDiaria(manana),
  ]);
  const agendaHoy = agendaHoyR.success ? agendaHoyR.data : [];
  const agendaManana = agendaMananaR.success ? agendaMananaR.data : [];

  const resultadoVista = esHoy ? agendaHoyR : agendaMananaR;
  const citas = esHoy ? agendaHoy : agendaManana;
  const otrasCitas = esHoy ? agendaManana : agendaHoy;

  const vista = resumen(citas);
  const otraVista = resumen(otrasCitas);

  // Próxima cita desde AHORA: primera confirmada de hoy que aún no parte;
  // si no queda nada hoy → la primera de mañana (confirmada si existe).
  const proximaHoy = agendaHoy.find(
    (c) => c.estado === "confirmada" && c.hora_inicio.slice(0, 5) >= ahora
  );
  const proxima = proximaHoy
    ?? agendaManana.find((c) => c.estado === "confirmada")
    ?? agendaManana[0];
  const proximaDeManana = !proximaHoy && !!proxima;
  const proximaPaciente = proxima
    ? [proxima.paciente_nombre, proxima.paciente_apellido].filter(Boolean).join(" ")
    : "";

  // Columna "Profesional" solo si la agenda visible involucra a más de uno.
  const idsProfesionales = new Set(
    [...agendaHoy, ...agendaManana].map((c) => c.id_profesional)
  );
  const mostrarProfesional = idsProfesionales.size > 1;

  const titulo = esHoy ? "Agenda de hoy" : fechaActiva === manana ? "Agenda de mañana" : "Agenda diaria";
  const otroDiaISO = esHoy ? manana : hoy;
  const otroDiaLabel = esHoy ? "mañana" : "hoy";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-ink-1">{titulo}</h2>
        <p className="text-sm text-ink-3 mt-0.5 capitalize">{formatDate(fechaActiva)}</p>
      </div>

      {/* Error cargando agenda */}
      {!resultadoVista.success && (
        <AlertBanner variant="danger" title="Error al cargar la agenda">
          {resultadoVista.error}
        </AlertBanner>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Calendar className="w-5 h-5 text-kp-accent" />}
          label={esHoy ? "Citas hoy" : "Citas mañana"}
          value={String(vista.total)}
          sub={
            vista.porConfirmar > 0
              ? `${vista.confirmadas} confirmadas · ${vista.porConfirmar} por confirmar`
              : vista.total > 0
                ? "Todas confirmadas"
                : "Sin citas agendadas"
          }
          bg="bg-kp-accent-xs"
        />

        {esHoy ? (
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-kp-success" />}
            label="Atendidos hoy"
            value={`${vista.completadas}/${vista.total}`}
            sub="turnos completados"
            bg="bg-surface-0"
          >
            <ProgressRing pct={vista.total ? (vista.completadas / vista.total) * 100 : 0} color="bg-kp-success" />
          </SummaryCard>
        ) : (
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-kp-accent" />}
            label="Confirmadas mañana"
            value={`${vista.confirmadas}/${vista.total}`}
            sub={
              vista.porConfirmar > 0
                ? `${vista.porConfirmar} por confirmar`
                : "todas confirmadas"
            }
            bg="bg-surface-0"
          >
            <ProgressRing pct={vista.total ? (vista.confirmadas / vista.total) * 100 : 0} color="bg-kp-accent" />
          </SummaryCard>
        )}

        <SummaryCard
          icon={<CalendarClock className="w-5 h-5 text-kp-secondary" />}
          label="Próxima cita"
          value={proxima ? proxima.hora_inicio.slice(0, 5) : "—"}
          sub={
            proxima
              ? `${proximaPaciente}${proximaDeManana ? " · mañana" : ""}${citaPorConfirmar(proxima.estado) ? " · por confirmar" : ""}`
              : "sin próximas citas"
          }
          bg="bg-kp-secondary-lt"
          href={proxima ? `/dashboard/pacientes/${proxima.id_paciente}` : undefined}
        />

        <SummaryCard
          icon={<Calendar className="w-5 h-5 text-ink-3" />}
          label={`Citas ${otroDiaLabel}`}
          value={String(otraVista.total)}
          sub={
            otraVista.total > 0
              ? `${otraVista.confirmadas} confirmadas${otraVista.porConfirmar > 0 ? ` · ${otraVista.porConfirmar} por confirmar` : ""}`
              : "sin citas"
          }
          bg="bg-surface-0"
          href={`/dashboard?fecha=${otroDiaISO}`}
          hint={<ArrowRight className="w-4 h-4 text-ink-3" />}
        />
      </div>

      {/* Tabs Hoy / Mañana */}
      <div className="flex gap-1 bg-surface-0 border border-kp-border rounded-xl p-1 w-fit">
        <TabLink href="/dashboard" active={esHoy}>
          Hoy {agendaHoy.length > 0 && <span className="text-ink-3">({agendaHoy.length})</span>}
        </TabLink>
        <TabLink href={`/dashboard?fecha=${manana}`} active={!esHoy}>
          Mañana {agendaManana.length > 0 && <span className="text-ink-3">({agendaManana.length})</span>}
        </TabLink>
      </div>

      {/* Aviso de citas sin confirmar para el día visible */}
      {vista.porConfirmar > 0 && (
        <AlertBanner
          variant="warning"
          title={`${vista.porConfirmar} ${vista.porConfirmar === 1 ? "cita sin confirmar" : "citas sin confirmar"} ${esHoy ? "para hoy" : "para mañana"}`}
        >
          Coordinar la confirmación con recepción antes del inicio de la jornada.
        </AlertBanner>
      )}

      {/* Agenda */}
      <AgendaTable
        citas={citas}
        esHoy={esHoy}
        ahora={esHoy ? ahora : undefined}
        mostrarProfesional={mostrarProfesional}
      />

      <p className="text-xs text-ink-3">Ficha Clínica Electrónica</p>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-surface-1 text-ink-1 shadow-sm border border-kp-border"
          : "text-ink-3 hover:text-ink-1"
      )}
    >
      {children}
    </Link>
  );
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-kp-border/60 overflow-hidden" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-[width]", color)}
        style={{ width: `${Math.min(100, Math.round(pct))}%` }}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  bg,
  href,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bg: string;
  href?: string;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="p-2 bg-surface-1 rounded-lg shadow-sm">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-3 font-medium">{label}</p>
        <p className="text-2xl font-bold text-ink-1">{value}</p>
        {sub && <p className="text-xs text-ink-3 truncate" title={sub}>{sub}</p>}
        {children}
      </div>
      {hint && <div className="self-center">{hint}</div>}
    </>
  );

  const classes = cn(
    `${bg} rounded-xl border border-kp-border px-5 py-4 flex items-center gap-4`,
    href && "transition-colors hover:border-kp-accent focus-visible:border-kp-accent"
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return <div className={classes}>{inner}</div>;
}
