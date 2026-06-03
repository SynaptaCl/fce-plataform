/**
 * validate-clinica.ts — CLI de validación pre go-live
 *
 * Verifica que una clínica esté lista para producción: módulos, especialidades,
 * profesionales y permisos. Solo lectura. No modifica datos.
 *
 * USO:
 *   npm run validate:clinica -- --slug=cenupsi
 *   npm run validate:clinica -- --slug=cenupsi --json
 *
 * REQUIERE (en el entorno o .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { validateClinica } from "../src/lib/onboarding/validate-clinica";
import type { ValidationIssue } from "../src/lib/onboarding/validate-clinica";

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
const isJson = args.includes("--json");

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const R = "\x1b[31m";
const Y = "\x1b[33m";
const G = "\x1b[32m";
const B = "\x1b[1m";
const X = "\x1b[0m";

function red(s: string): string   { return `${R}${s}${X}`; }
function yellow(s: string): string { return `${Y}${s}${X}`; }
function green(s: string): string  { return `${G}${s}${X}`; }
function bold(s: string): string   { return `${B}${s}${X}`; }

// ── Formatters ────────────────────────────────────────────────────────────────

function printIssue(issue: ValidationIssue, tipo: "bloqueo" | "advertencia"): void {
  const prefix = tipo === "bloqueo"
    ? `${R}${B}🔴 BLOQUEO${X}`
    : `${Y}${B}🟡 ADVERTENCIA${X}`;

  console.log(`\n  ${prefix} ${bold(`[${issue.codigo}]`)}`);
  console.log(`     ${issue.mensaje}`);
  console.log(`     ${yellow("→")} ${issue.accionSugerida}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!slugArg) {
    console.error(
      "❌ Falta --slug=<slug>\n\n" +
      "   Uso: npm run validate:clinica -- --slug=cenupsi\n" +
      "        npm run validate:clinica -- --slug=cenupsi --json"
    );
    process.exit(1);
  }

  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !srvKey) {
    console.error(
      "❌ Variables de entorno requeridas:\n" +
      "   NEXT_PUBLIC_SUPABASE_URL\n" +
      "   SUPABASE_SERVICE_ROLE_KEY\n\n" +
      "   Cargar con: source .env.local o usar dotenv"
    );
    process.exit(1);
  }

  let result: Awaited<ReturnType<typeof validateClinica>>;

  try {
    result = await validateClinica(slugArg);
  } catch (err) {
    console.error("❌ Error al conectar con Supabase:", err);
    process.exit(1);
  }

  // ── Salida JSON ───────────────────────────────────────────────────────────

  if (isJson) {
    console.log(JSON.stringify({ slug: slugArg, ...result }, null, 2));
    process.exit(result.ready ? 0 : 1);
  }

  // ── Salida humana ─────────────────────────────────────────────────────────

  const LINE = "═".repeat(62);

  console.log("\n" + LINE);
  console.log(`  ${bold(`Validación pre go-live — ${slugArg}`)}`);
  console.log(LINE);

  if (result.bloqueos.length > 0) {
    console.log(
      `\n${red(bold(`BLOQUEOS (${result.bloqueos.length})`))}`  +
      `  — impiden que la clínica opere correctamente`
    );
    for (const issue of result.bloqueos) {
      printIssue(issue, "bloqueo");
    }
  } else {
    console.log(`\n  ${green("✓ Sin bloqueos")}`);
  }

  if (result.advertencias.length > 0) {
    console.log(
      `\n${yellow(bold(`ADVERTENCIAS (${result.advertencias.length})`))}`  +
      `  — recomendado resolver antes de producción`
    );
    for (const issue of result.advertencias) {
      printIssue(issue, "advertencia");
    }
  } else {
    console.log(`  ${green("✓ Sin advertencias")}`);
  }

  console.log("\n" + LINE);

  if (result.ready) {
    console.log(`  ${green(bold("✅  READY"))} — la clínica puede operar`);
  } else {
    console.log(
      `  ${red(bold("❌  NOT READY"))} — resolver bloqueos antes de ir a producción`
    );
  }

  console.log(LINE + "\n");

  process.exit(result.ready ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
