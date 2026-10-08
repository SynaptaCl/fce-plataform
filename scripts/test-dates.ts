// scripts/test-dates.ts — utilidad central de fechas (src/lib/dates.ts).
// Se re-ejecuta a sí mismo bajo varias zonas horarias del proceso (UTC = servidor Vercel,
// Santiago = navegador del usuario, y extremos) para probar que el resultado NO depende de TZ.
import { execFileSync } from "node:child_process";
import {
  parseDateOnly,
  formatDateOnly,
  formatTimestamp,
  formatFechaAuto,
  edadEnAnios,
  hoyISO,
  esFechaSinHora,
} from "../src/lib/dates";
import { calculateAge } from "../src/lib/utils";
import { calcularSemanaGestacional } from "../src/lib/nutricion/atalah";

const ZONAS = ["UTC", "America/Santiago", "America/Los_Angeles", "Pacific/Kiritimati", "Asia/Tokyo"];

if (!process.env.TEST_DATES_CHILD) {
  let fallo = false;
  for (const tz of ZONAS) {
    try {
      const out = execFileSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
        env: { ...process.env, TZ: tz, TEST_DATES_CHILD: "1" },
        encoding: "utf8",
      });
      process.stdout.write(`[TZ=${tz}] ${out.trim().split("\n").pop()}\n`);
    } catch (e) {
      fallo = true;
      const err = e as { stdout?: string; stderr?: string };
      process.stdout.write(`[TZ=${tz}] FALLO\n${err.stdout ?? ""}${err.stderr ?? ""}\n`);
    }
  }
  process.exit(fallo ? 1 : 0);
}

let ok = 0;
const fallos: string[] = [];
function eq<T>(nombre: string, real: T, esperado: T) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++;
  else fallos.push(`${nombre}: esperado ${JSON.stringify(esperado)}, real ${JSON.stringify(real)}`);
}

// ── Caso del bug: fecha_inicio 2026-05-12 no debe retroceder ───────────────────
eq("bug plan inicio", formatDateOnly("2026-05-12"), "12-05-2026");
eq("bug plan revision", formatDateOnly("2026-11-12"), "12-11-2026");
eq("bug auto date", formatFechaAuto("2026-05-12"), "12-05-2026");

// ── Bordes de calendario ───────────────────────────────────────────────────────
eq("1 enero", formatDateOnly("2026-01-01"), "01-01-2026");
eq("31 diciembre", formatDateOnly("2026-12-31"), "31-12-2026");
eq("29 febrero bisiesto", formatDateOnly("2028-02-29"), "29-02-2028");
eq("29 febrero inválido", formatDateOnly("2026-02-29"), "—");
eq("larga", formatDateOnly("2026-05-12", "larga"), "12 de mayo de 2026");

// ── Cambio de horario Chile (2026: fin DST sáb 4-abr, inicio DST sáb 5-sep) ────
for (const f of ["2026-04-03", "2026-04-04", "2026-04-05", "2026-09-04", "2026-09-05", "2026-09-06"]) {
  const [y, m, d] = f.split("-");
  eq(`DST ${f}`, formatDateOnly(f), `${d}-${m}-${y}`);
  const p = parseDateOnly(f);
  eq(`DST parse ${f}`, p ? [p.getFullYear(), p.getMonth() + 1, p.getDate()] : null, [+y, +m, +d]);
}

// ── Entradas nulas / inválidas ─────────────────────────────────────────────────
eq("null", formatDateOnly(null), "—");
eq("vacío", formatDateOnly(""), "—");
eq("basura", formatDateOnly("no-es-fecha"), "—");
eq("esFechaSinHora sí", esFechaSinHora("2026-05-12"), true);
eq("esFechaSinHora no", esFechaSinHora("2026-05-12T10:00:00Z"), false);

// ── Timestamps: instante mostrado en Santiago ──────────────────────────────────
eq("ts invierno 01:00Z → día previo", formatTimestamp("2026-05-12T01:00:00Z"), "11-05-2026"); // UTC-4
eq("ts verano 02:00Z 1-ene → 31-dic", formatTimestamp("2026-01-01T02:00:00Z"), "31-12-2025"); // UTC-3
eq("ts mediodía", formatTimestamp("2026-05-12T16:00:00Z"), "12-05-2026");
eq("auto timestamp", formatFechaAuto("2026-05-12T16:00:00Z"), "12-05-2026");
eq("ts nulo", formatTimestamp(null), "—");
eq("ts inválido", formatTimestamp("xx"), "—");

// ── Edad ───────────────────────────────────────────────────────────────────────
eq("edad día del cumpleaños", edadEnAnios("1990-05-12", "2026-05-12"), 36);
eq("edad un día antes", edadEnAnios("1990-05-12", "2026-05-11"), 35);
eq("edad nacido 1 enero", edadEnAnios("2000-01-01", "2026-01-01"), 26);
eq("edad nacido 31 dic", edadEnAnios("2000-12-31", "2026-12-30"), 25);
eq("edad 29 feb en año no bisiesto (1 mar cumple)", edadEnAnios("2000-02-29", "2026-02-28"), 25);
eq("edad 29 feb → 1 mar", edadEnAnios("2000-02-29", "2026-03-01"), 26);
eq("edad nacimiento futuro", edadEnAnios("2030-01-01", "2026-01-01"), null);
eq("edad nula", edadEnAnios(null), null);
eq("edad borde DST abril", edadEnAnios("2010-04-04", "2026-04-04"), 16);
eq("edad borde DST septiembre", edadEnAnios("2010-09-05", "2026-09-04"), 15);
eq("calculateAge string", calculateAge("1990-05-12") === edadEnAnios("1990-05-12"), true);

// ── hoyISO: día en Santiago, no UTC ────────────────────────────────────────────
eq("hoyISO 23:30 Santiago (02:30Z)", hoyISO(new Date("2026-05-13T03:30:00Z")), "2026-05-12");
eq("hoyISO 1-ene Santiago", hoyISO(new Date("2026-01-01T04:00:00Z")), "2026-01-01");

// ── Semana gestacional (usa parseDateOnly) ─────────────────────────────────────
eq("semana gest. 0", calcularSemanaGestacional("2026-03-01", "2026-03-07"), 0);
eq("semana gest. 1", calcularSemanaGestacional("2026-03-01", "2026-03-08"), 1);
eq("semana gest. cruza DST abril", calcularSemanaGestacional("2026-03-30", "2026-04-13"), 2);
eq("semana gest. cruza DST sept", calcularSemanaGestacional("2026-08-29", "2026-09-12"), 2);

if (fallos.length) {
  console.log(fallos.join("\n"));
  console.log(`FALLO: ${fallos.length} checks fallidos, ${ok} ok`);
  process.exit(1);
}
console.log(`OK: ${ok} checks`);
