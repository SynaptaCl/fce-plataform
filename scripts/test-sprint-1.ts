#!/usr/bin/env tsx
/**
 * Sprint 1 — Integration test contra Supabase Synapta Product.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local para bypass de RLS.
 * Si no está, las queries a clinicas_fce_config fallarán silenciosamente (RLS).
 *
 * Ejecutar: npm run test:sprint-1
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cargar .env.local
try {
  const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
} catch {
  // sin .env.local
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL no encontrado en .env.local");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error(
    "❌ SUPABASE_SERVICE_ROLE_KEY no encontrado en .env.local\n" +
      "   Agrega la clave service_role del proyecto Supabase para bypass de RLS."
  );
  process.exit(1);
}

const supabase = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

import {
  getClinicaConfig,
  isModuleEnabled,
  isEspecialidadEnabled,
} from "../src/lib/modules/config";
import {
  mapBrandingToTokens,
  DEFAULT_FCE_TOKENS,
  validateConfig,
  getDependentes,
  type BrandingConfig,
} from "../src/lib/modules/registry";

// ============================================================================
// Helpers de test
// ============================================================================

const KORPORIS_UUID = "572be8d9-f764-4a07-8045-13808679c7e9";
const NUVIDENT_UUID = "861ee507-9555-44d3-8836-b21ff039ceab";
const NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? `\n     ${detail}` : ""}`);
    failed++;
  }
}

function header(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("\n🧪 Sprint 1 — Test de integración contra Synapta Product");
  console.log(`   URL: ${SUPABASE_URL}`);

  // ── Test 1 ────────────────────────────────────────────────────────────────
  header("Test 1: getClinicaConfig(korporis) — config completa");
  const korporisConfig = await getClinicaConfig(KORPORIS_UUID, supabase);

  assert(korporisConfig !== null, "config !== null");
  if (korporisConfig) {
    assert(korporisConfig.modulosActivos.length === 6, "6 módulos activos", `got ${korporisConfig.modulosActivos.length}`);
    const modulos6 = ["M1_identificacion", "M2_anamnesis", "M3_evaluacion", "M4_soap", "M5_consentimiento", "M6_auditoria"];
    for (const m of modulos6) {
      assert(korporisConfig.modulosActivos.includes(m as never), `modulosActivos incluye ${m}`);
    }
    assert(
      JSON.stringify([...korporisConfig.especialidadesActivas].sort()) ===
        JSON.stringify(["Fonoaudiología", "Kinesiología", "Masoterapia"].sort()),
      "especialidadesActivas === ['Kinesiología','Fonoaudiología','Masoterapia']",
      `got ${JSON.stringify(korporisConfig.especialidadesActivas)}`
    );
    assert(korporisConfig.nombreDisplay === "Korporis Centro de Salud", `nombreDisplay === 'Korporis Centro de Salud'`, `got '${korporisConfig.nombreDisplay}'`);
    assert(korporisConfig.slug === "korporis", `slug === 'korporis'`, `got '${korporisConfig.slug}'`);
    assert(korporisConfig.tokensColor.primary === "#006B6B", `tokensColor.primary === '#006B6B' (navy)`, `got '${korporisConfig.tokensColor.primary}'`);
    assert(korporisConfig.tokensColor.secondary === "#F5A623", `tokensColor.secondary === '#F5A623' (accent)`, `got '${korporisConfig.tokensColor.secondary}'`);
  }

  // ── Test 2 ────────────────────────────────────────────────────────────────
  header("Test 2: getClinicaConfig(nuvident) — config mínima");
  const nuvidentConfig = await getClinicaConfig(NUVIDENT_UUID, supabase);

  assert(nuvidentConfig !== null, "config !== null");
  if (nuvidentConfig) {
    assert(
      JSON.stringify([...nuvidentConfig.modulosActivos].sort()) ===
        JSON.stringify(["M1_identificacion", "M6_auditoria"].sort()),
      "modulosActivos === ['M1_identificacion','M6_auditoria']",
      `got ${JSON.stringify(nuvidentConfig.modulosActivos)}`
    );
    assert(nuvidentConfig.especialidadesActivas.length === 0, "especialidadesActivas.length === 0", `got ${nuvidentConfig.especialidadesActivas.length}`);
    assert(nuvidentConfig.nombreDisplay === "Nuvident Clínica Dental", `nombreDisplay === 'Nuvident Clínica Dental'`, `got '${nuvidentConfig.nombreDisplay}'`);
    assert(nuvidentConfig.slug === "nuvident", `slug === 'nuvident'`, `got '${nuvidentConfig.slug}'`);
    assert(nuvidentConfig.tokensColor.primary === "#1B3A5C", `tokensColor.primary === '#1B3A5C' (navy de Nuvident)`, `got '${nuvidentConfig.tokensColor.primary}'`);
  }

  // ── Test 3 ────────────────────────────────────────────────────────────────
  header("Test 3: getClinicaConfig con UUID inexistente retorna null");
  const noConfig = await getClinicaConfig(NONEXISTENT_UUID, supabase);
  assert(noConfig === null, "getClinicaConfig(non-existent) === null", `got ${JSON.stringify(noConfig)}`);

  // ── Test 4 ────────────────────────────────────────────────────────────────
  header("Test 4: isModuleEnabled helpers puros");
  if (korporisConfig && nuvidentConfig) {
    assert(isModuleEnabled(korporisConfig, "M2_anamnesis") === true, "korporis: isModuleEnabled(M2_anamnesis) === true");
    assert(isModuleEnabled(korporisConfig, "M4_soap") === true, "korporis: isModuleEnabled(M4_soap) === true");
    assert(isModuleEnabled(nuvidentConfig, "M2_anamnesis") === false, "nuvident: isModuleEnabled(M2_anamnesis) === false");
    assert(isModuleEnabled(nuvidentConfig, "M6_auditoria") === true, "nuvident: isModuleEnabled(M6_auditoria) === true");
  } else {
    console.error("  ⚠️  SKIP — configs no cargadas (Tests 1/2 fallaron)");
    failed += 4;
  }

  // ── Test 5 ────────────────────────────────────────────────────────────────
  header("Test 5: isEspecialidadEnabled helpers");
  if (korporisConfig && nuvidentConfig) {
    assert(isEspecialidadEnabled(korporisConfig, "Kinesiología") === true, "korporis: isEspecialidadEnabled(Kinesiología) === true");
    assert(isEspecialidadEnabled(korporisConfig, "Odontología") === false, "korporis: isEspecialidadEnabled(Odontología) === false");
    assert(isEspecialidadEnabled(nuvidentConfig, "Kinesiología") === false, "nuvident: isEspecialidadEnabled(Kinesiología) === false");
  } else {
    console.error("  ⚠️  SKIP — configs no cargadas");
    failed += 3;
  }

  // ── Test 6 ────────────────────────────────────────────────────────────────
  header("Test 6: mapBrandingToTokens con branding real");

  // Caso A: branding null → DEFAULT_FCE_TOKENS
  const tokensNull = mapBrandingToTokens(null);
  assert(
    JSON.stringify(tokensNull) === JSON.stringify(DEFAULT_FCE_TOKENS),
    "branding null → DEFAULT_FCE_TOKENS intacto"
  );

  // Caso B: branding Korporis
  const brandingKorporis: BrandingConfig = {
    navy: "#006B6B",
    navy_deep: "#004545",
    primary: "#00B0A8",
    primary_hover: "#009990",
    light_bg: "#E6FAF9",
    accent: "#F5A623",
  };
  const tokensKorporis = mapBrandingToTokens(brandingKorporis);
  assert(tokensKorporis.primary === "#006B6B", "Korporis: navy→primary === '#006B6B'", `got '${tokensKorporis.primary}'`);
  assert(tokensKorporis["primary-deep"] === "#004545", "Korporis: navy_deep→primary-deep === '#004545'", `got '${tokensKorporis["primary-deep"]}'`);
  assert(tokensKorporis.secondary === "#F5A623", "Korporis: accent→secondary === '#F5A623'", `got '${tokensKorporis.secondary}'`);
  assert(tokensKorporis.accent === "#00B0A8", "Korporis: primary→accent === '#00B0A8'", `got '${tokensKorporis.accent}'`);
  assert(tokensKorporis["accent-lt"] === "#E6FAF9", "Korporis: light_bg→accent-lt === '#E6FAF9'", `got '${tokensKorporis["accent-lt"]}'`);
  assert(tokensKorporis["primary-hover"] === "#009990", "Korporis: primary_hover→primary-hover === '#009990'", `got '${tokensKorporis["primary-hover"]}'`);

  // Caso C: branding Nuvident
  const brandingNuvident: BrandingConfig = {
    navy: "#1B3A5C",
    navy_deep: "#0F2440",
    primary: "#2563EB",
    primary_hover: "#1D4ED8",
    light_bg: "#EFF6FF",
    accent: "#0891B2",
  };
  const tokensNuvident = mapBrandingToTokens(brandingNuvident);
  assert(tokensNuvident.primary === "#1B3A5C", "Nuvident: navy→primary === '#1B3A5C'", `got '${tokensNuvident.primary}'`);
  assert(tokensNuvident.secondary === "#0891B2", "Nuvident: accent→secondary === '#0891B2'", `got '${tokensNuvident.secondary}'`);

  // ── Test 7 ────────────────────────────────────────────────────────────────
  header("Test 7: validateConfig detecta violaciones");

  const r1 = validateConfig(["M3_evaluacion"], []);
  assert(r1.ok === false, "validateConfig(['M3_evaluacion'], []).ok === false (falta M1 obligatorio + deps)", `errores: ${JSON.stringify(r1.errores)}`);

  const r2 = validateConfig(["M1_identificacion", "M6_auditoria", "M3_evaluacion"], []);
  assert(r2.ok === false, "validateConfig([M1,M6,M3], []).ok === false (M3 requiere M2)", `errores: ${JSON.stringify(r2.errores)}`);

  const r3 = validateConfig(["M1_identificacion", "M6_auditoria", "M2_anamnesis", "M3_evaluacion"], []);
  assert(r3.ok === false, "validateConfig([M1,M6,M2,M3], []).ok === false (M3 sin especialidades)", `errores: ${JSON.stringify(r3.errores)}`);

  const r4 = validateConfig(
    ["M1_identificacion", "M6_auditoria", "M2_anamnesis", "M3_evaluacion"],
    ["Kinesiología"]
  );
  assert(r4.ok === true, "validateConfig([M1,M6,M2,M3], ['Kinesiología']).ok === true", `errores: ${JSON.stringify(r4.errores)}`);

  // ── Test 8 ────────────────────────────────────────────────────────────────
  header("Test 8: getDependentes retorna cadena correcta");

  const depsM2 = getDependentes("M2_anamnesis");
  assert(depsM2.includes("M3_evaluacion"), "getDependentes(M2_anamnesis) incluye M3_evaluacion", `got ${JSON.stringify(depsM2)}`);

  const depsM3 = getDependentes("M3_evaluacion");
  assert(depsM3.includes("M4_soap"), "getDependentes(M3_evaluacion) incluye M4_soap", `got ${JSON.stringify(depsM3)}`);

  const depsM1 = getDependentes("M1_identificacion");
  assert(depsM1.includes("M2_anamnesis"), "getDependentes(M1) incluye M2_anamnesis", `got ${JSON.stringify(depsM1)}`);
  assert(depsM1.includes("M5_consentimiento"), "getDependentes(M1) incluye M5_consentimiento", `got ${JSON.stringify(depsM1)}`);
  assert(depsM1.includes("M6_auditoria"), "getDependentes(M1) incluye M6_auditoria", `got ${JSON.stringify(depsM1)}`);

  // ── Resultado final ────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`\n✅ TODOS LOS TESTS PASARON: ${passed}/${total}\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} test(s) fallaron de ${total}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
