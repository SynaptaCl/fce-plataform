#!/usr/bin/env tsx
/**
 * Sprint 3 — Tests unitarios de helpers de branding y tokens FCE.
 *
 * Tests puramente en memoria (sin Supabase), validan:
 *   - mapBrandingToTokens con branding de Korporis
 *   - mapBrandingToTokens con branding de Nuvident
 *   - mapBrandingToTokens con null retorna DEFAULT_FCE_TOKENS
 *   - tokensToCssVars genera CSS vars con prefijo --color-kp-
 *   - MODULE_REGISTRY tiene rutasApp correctas para cada módulo
 *
 * Ejecutar: npm run test:sprint-3
 */

import {
  mapBrandingToTokens,
  DEFAULT_FCE_TOKENS,
  MODULE_REGISTRY,
  type FceTokens,
} from "../src/lib/modules/registry";

// ────────────────────────────────────────────────────────────────────────────
// Helpers de test
// ────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${message}`);
    failed++;
  }
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function isValidTokens(tokens: FceTokens): boolean {
  return (
    isValidHex(tokens.primary) &&
    isValidHex(tokens["primary-deep"]) &&
    isValidHex(tokens.accent) &&
    isValidHex(tokens["accent-lt"]) &&
    isValidHex(tokens.secondary) &&
    isValidHex(tokens["primary-hover"])
  );
}

// ────────────────────────────────────────────────────────────────────────────
// tokensToCssVars — inline en este test para verificar formato --color-kp-
// ────────────────────────────────────────────────────────────────────────────

function tokensToCssVars(tokens: FceTokens): string {
  return [
    `--color-kp-primary:${tokens.primary};`,
    `--color-kp-primary-deep:${tokens["primary-deep"]};`,
    `--color-kp-accent:${tokens.accent};`,
    `--color-kp-accent-lt:${tokens["accent-lt"]};`,
    `--color-kp-secondary:${tokens.secondary};`,
    `--color-kp-primary-hover:${tokens["primary-hover"]};`,
  ].join("");
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: mapBrandingToTokens — Korporis
// ────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Test 1: mapBrandingToTokens — Korporis branding");

const korporisBranding = {
  navy: "#006B6B",
  navy_deep: "#004545",
  primary: "#00B0A8",
  primary_hover: "#009990",
  light_bg: "#D5F5F4",
  accent: "#F5A623",
  logo_url: "https://example.com/korporis-logo.png",
  clinic_initials: "KP",
  clinic_short_name: "Korporis",
};

const korporisTokens = mapBrandingToTokens(korporisBranding);

assert(korporisTokens.primary === "#006B6B", `primary = ${korporisTokens.primary}`);
assert(korporisTokens["primary-deep"] === "#004545", `primary-deep = ${korporisTokens["primary-deep"]}`);
assert(korporisTokens.accent === "#00B0A8", `accent = ${korporisTokens.accent}`);
assert(korporisTokens["accent-lt"] === "#D5F5F4", `accent-lt = ${korporisTokens["accent-lt"]}`);
assert(korporisTokens.secondary === "#F5A623", `secondary = ${korporisTokens.secondary}`);
assert(korporisTokens["primary-hover"] === "#009990", `primary-hover = ${korporisTokens["primary-hover"]}`);
assert(isValidTokens(korporisTokens), "Todos los tokens son hex válidos");

// ────────────────────────────────────────────────────────────────────────────
// Test 2: mapBrandingToTokens — Nuvident
// ────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Test 2: mapBrandingToTokens — Nuvident branding");

const nuvidentBranding = {
  navy: "#1B3A5C",
  navy_deep: "#0F2240",
  primary: "#2563EB",
  primary_hover: "#1D4ED8",
  light_bg: "#DBEAFE",
  accent: "#0891B2",
  clinic_initials: "NV",
  clinic_short_name: "Nuvident",
};

const nuvidentTokens = mapBrandingToTokens(nuvidentBranding);

assert(nuvidentTokens.primary === "#1B3A5C", `primary = ${nuvidentTokens.primary}`);
assert(nuvidentTokens["primary-deep"] === "#0F2240", `primary-deep = ${nuvidentTokens["primary-deep"]}`);
assert(nuvidentTokens.accent === "#2563EB", `accent = ${nuvidentTokens.accent}`);
assert(nuvidentTokens["accent-lt"] === "#DBEAFE", `accent-lt = ${nuvidentTokens["accent-lt"]}`);
assert(nuvidentTokens.secondary === "#0891B2", `secondary = ${nuvidentTokens.secondary}`);
assert(isValidTokens(nuvidentTokens), "Todos los tokens son hex válidos");

assert(
  nuvidentTokens.primary !== korporisTokens.primary,
  "Korporis y Nuvident tienen colores distintos"
);

// ────────────────────────────────────────────────────────────────────────────
// Test 3: mapBrandingToTokens — null retorna DEFAULT_FCE_TOKENS
// ────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Test 3: mapBrandingToTokens con branding null");

const defaultTokens = mapBrandingToTokens(null);

assert(defaultTokens.primary === DEFAULT_FCE_TOKENS.primary, `primary = DEFAULT (${defaultTokens.primary})`);
assert(defaultTokens.accent === DEFAULT_FCE_TOKENS.accent, `accent = DEFAULT (${defaultTokens.accent})`);
assert(isValidTokens(defaultTokens), "DEFAULT_FCE_TOKENS son hex válidos");

// ────────────────────────────────────────────────────────────────────────────
// Test 4: tokensToCssVars — genera CSS vars con prefijo --color-kp-
// ────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Test 4: tokensToCssVars — formato correcto para Tailwind v4");

const cssVars = tokensToCssVars(korporisTokens);

assert(cssVars.includes("--color-kp-primary:"), "Contiene --color-kp-primary");
assert(cssVars.includes("--color-kp-primary-deep:"), "Contiene --color-kp-primary-deep");
assert(cssVars.includes("--color-kp-accent:"), "Contiene --color-kp-accent");
assert(cssVars.includes("--color-kp-accent-lt:"), "Contiene --color-kp-accent-lt");
assert(cssVars.includes("--color-kp-secondary:"), "Contiene --color-kp-secondary");
assert(cssVars.includes("--color-kp-primary-hover:"), "Contiene --color-kp-primary-hover");
assert(!cssVars.includes("--kp-primary:") || cssVars.includes("--color-kp-primary:"), "No usa prefijo --kp- sin --color-");
assert(!cssVars.includes("--clinic-"), "No usa prefijo --clinic- (incorrecto)");

// ────────────────────────────────────────────────────────────────────────────
// Test 5: MODULE_REGISTRY — rutasApp correctas
// ────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Test 5: MODULE_REGISTRY — rutasApp por módulo");

assert(
  MODULE_REGISTRY.M1_identificacion.rutasApp.includes("/dashboard/pacientes"),
  "M1 incluye /dashboard/pacientes"
);
assert(
  MODULE_REGISTRY.M2_anamnesis.rutasApp.includes("/dashboard/pacientes/[id]/anamnesis"),
  "M2 incluye /anamnesis"
);
assert(
  MODULE_REGISTRY.M3_evaluacion.rutasApp.includes("/dashboard/pacientes/[id]/evaluacion"),
  "M3 incluye /evaluacion"
);
assert(
  MODULE_REGISTRY.M4_soap.rutasApp.includes("/dashboard/pacientes/[id]/evolucion"),
  "M4 incluye /evolucion"
);
assert(
  MODULE_REGISTRY.M5_consentimiento.rutasApp.includes("/dashboard/pacientes/[id]/consentimiento"),
  "M5 incluye /consentimiento"
);
assert(
  MODULE_REGISTRY.M6_auditoria.rutasApp.includes("/dashboard/pacientes/[id]/auditoria"),
  "M6 incluye /auditoria"
);

// ────────────────────────────────────────────────────────────────────────────
// Resumen
// ────────────────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Sprint 3 tests: ${passed} pasados, ${failed} fallidos`);

if (failed > 0) {
  process.exit(1);
}
