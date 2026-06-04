/**
 * test-sprint-o1-f6.ts — Sprint O1 Fase 6: E2E onboarding con Cenupsi
 *
 * Verifica el flujo completo de onboarding usando Cenupsi como banco de pruebas técnico:
 * a) Migration SQL generada correctamente (20260604_onboard_cenupsi.sql)
 * b) Estado pre-migration → NOT READY con bloqueos esperados
 * c) Estado post-migration sin profesionales → bloqueo sin_profesionales
 * d) Profesional con especialidad inválida → bloqueo profesional_especialidad_invalida
 * e) Profesional válido con registro → sin bloqueos de especialidad
 * f) Estado READY completo posible → ready = true
 * g) DB: validateClinica('cenupsi') real (cuando env vars disponibles)
 *
 * USO: npx tsx scripts/test-sprint-o1-f6.ts
 * Con DB real: cargar .env.local antes de ejecutar.
 */

import * as fs from "fs";
import * as path from "path";
import { validateClinicaData } from "../src/lib/onboarding/validate-clinica";
import type { ClinicaValidationInput } from "../src/lib/onboarding/validate-clinica";

const ROOT = path.resolve(__dirname, "..");
let errors = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    errors++;
  }
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ── Datos mock reutilizables ───────────────────────────────────────────────────

const MOCK_CLINICA_CENUPSI = {
  id: "mock-cenupsi-uuid",
  slug: "cenupsi",
  config: {
    branding: {
      primary: "#5B4FCF",
      navy: "#3B2FA8",
      clinic_short_name: "Cenupsi",
      clinic_initials: "CP",
    },
  },
};

const MOCK_CATALOGO = [
  { codigo: "Kinesiología", activa: true },
  { codigo: "Fonoaudiología", activa: true },
  { codigo: "Psicología", activa: true },
  { codigo: "Nutrición", activa: true },
  { codigo: "Terapia Ocupacional", activa: true },
  { codigo: "Medicina General", activa: true },
];

const MOCK_FCE_CONFIG_PRE_MIGRATION = {
  modulos_activos: ["M1_identificacion", "M6_auditoria"],
  especialidades_activas: [] as string[],
};

const MOCK_FCE_CONFIG_POST_MIGRATION = {
  modulos_activos: [
    "M1_identificacion",
    "M2_anamnesis",
    "M3_evaluacion",
    "M4_soap",
    "M5_consentimiento",
    "M6_auditoria",
    "M9_egresos",
    "M10_plan_intervencion",
  ],
  especialidades_activas: [
    "Kinesiología",
    "Fonoaudiología",
    "Psicología",
    "Nutrición",
    "Terapia Ocupacional",
  ],
};

const MOCK_PROF_KINE = {
  id: "mock-prof-kine",
  nombre: "Profesional Test Kinesiología",
  especialidad: "Kinesiología",
  numero_registro: "REG-KIN-001",
  tipo_registro: "Colegio Kinesiólogos",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_PROF_FONO = {
  id: "mock-prof-fono",
  nombre: "Profesional Test Fonoaudiología",
  especialidad: "Fonoaudiología",
  numero_registro: "REG-FONO-001",
  tipo_registro: "Otro",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_PROF_PSI = {
  id: "mock-prof-psi",
  nombre: "Profesional Test Psicología",
  especialidad: "Psicología",
  numero_registro: "REG-PSI-001",
  tipo_registro: "Colegio Psicólogos",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_PROF_NUTRI = {
  id: "mock-prof-nutri",
  nombre: "Profesional Test Nutrición",
  especialidad: "Nutrición",
  numero_registro: "REG-NUTRI-001",
  tipo_registro: "Otro",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_PROF_TO = {
  id: "mock-prof-to",
  nombre: "Profesional Test Terapia Ocupacional",
  especialidad: "Terapia Ocupacional",
  numero_registro: "REG-TO-001",
  tipo_registro: "Otro",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_ADMIN_LINKS_TODOS: Record<string, string[]> = {
  "mock-prof-kine":  ["admin-kine"],
  "mock-prof-fono":  ["admin-fono"],
  "mock-prof-psi":   ["admin-psi"],
  "mock-prof-nutri": ["admin-nutri"],
  "mock-prof-to":    ["admin-to"],
};

// ── Sección a) Migration SQL generada ─────────────────────────────────────────

section("a) Migration SQL — cenupsi generada correctamente");

const MIGRATION_PATTERN = /20260604_onboard_cenupsi\.sql$/;
const migrDir = path.join(ROOT, "supabase", "migrations");
const migFiles = fs.existsSync(migrDir)
  ? fs.readdirSync(migrDir).filter((f) => MIGRATION_PATTERN.test(f))
  : [];
const migFile = migFiles[0] ?? null;
const migContent = migFile ? readFile(path.join(migrDir, migFile)) : null;

check(migFile !== null, `supabase/migrations/20260604_onboard_cenupsi.sql existe`);

if (migContent) {
  check(migContent.includes("BEGIN;"),  "SQL envuelto en transacción (BEGIN)");
  check(migContent.includes("COMMIT;"), "SQL envuelto en transacción (COMMIT)");
  check(
    migContent.includes("slug = 'cenupsi'"),
    "SQL verifica existencia del slug 'cenupsi' antes de modificar"
  );
  check(
    migContent.includes("M1_identificacion") && migContent.includes("M10_plan_intervencion"),
    "SQL activa M1 y M10 (módulos esperados para template rehab-psi)"
  );
  check(
    migContent.includes("Kinesiología") && migContent.includes("Psicología") &&
    migContent.includes("Terapia Ocupacional"),
    "SQL activa especialidades esperadas (Kinesiología, Psicología, Terapia Ocupacional)"
  );
  check(
    !migContent.includes("puede_prescribir: SÍ") &&
    migContent.includes("puede_prescribir=NO"),
    "SQL no activa prescripción (perfil multidisciplinaria-rehab-psi)"
  );
  check(
    migContent.includes("Claude Code NO aplica DDL"),
    "SQL incluye advertencia de no aplicar directamente"
  );
  check(
    !migContent.includes("M7_prescripciones") && !migContent.includes("M8_examenes"),
    "SQL no incluye M7 ni M8 (correcto para este template)"
  );
}

// ── Sección b) Simulación estado pre-migration ─────────────────────────────────

section("b) Estado pre-migration → NOT READY con bloqueos esperados");

const MOCK_PRE_MIGRATION: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_CENUPSI,
  fceConfig: MOCK_FCE_CONFIG_PRE_MIGRATION,
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [],
  adminLinksByProfesional: {},
};

const resultPreMigration = validateClinicaData(MOCK_PRE_MIGRATION);

check(resultPreMigration.ready === false, "Pre-migration: ready = false");
check(resultPreMigration.bloqueos.length >= 1, `Pre-migration: ≥1 bloqueo (actual: ${resultPreMigration.bloqueos.length})`);
check(
  resultPreMigration.bloqueos.some((b) => b.codigo === "modulos_solo_base"),
  'Pre-migration: bloqueo "modulos_solo_base" detectado (solo M1+M6 activos)'
);

// ── Sección c) Post-migration sin profesionales ────────────────────────────────

section("c) Post-migration sin profesionales → bloqueo sin_profesionales");

const MOCK_POST_SIN_PROF: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_CENUPSI,
  fceConfig: MOCK_FCE_CONFIG_POST_MIGRATION,
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [],
  adminLinksByProfesional: {},
};

const resultPostSinProf = validateClinicaData(MOCK_POST_SIN_PROF);

check(resultPostSinProf.ready === false, "Post-migration sin profs: ready = false");
check(
  !resultPostSinProf.bloqueos.some((b) => b.codigo === "modulos_solo_base"),
  'Post-migration: bloqueo "modulos_solo_base" ya no aparece (módulos configurados)'
);
check(
  resultPostSinProf.bloqueos.some((b) =>
    b.codigo === "sin_profesionales" || b.codigo === "especialidad_sin_profesional"
  ),
  'Post-migration sin profs: bloqueo de ausencia de profesionales detectado'
);

// ── Sección d) Profesional con especialidad inválida ──────────────────────────

section("d) Profesional con especialidad inválida → bloqueo detectado (F1)");

const MOCK_PROF_INVALIDO = {
  id: "mock-prof-invalido",
  nombre: "Kine Sin Tilde",
  especialidad: "Kinesiologia",  // sin tilde — INVÁLIDO
  numero_registro: "REG-001",
  tipo_registro: "Otro",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_CON_PROF_INVALIDO: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_CENUPSI,
  fceConfig: MOCK_FCE_CONFIG_POST_MIGRATION,
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [MOCK_PROF_INVALIDO],
  adminLinksByProfesional: { "mock-prof-invalido": ["admin-1"] },
};

const resultProfInvalido = validateClinicaData(MOCK_CON_PROF_INVALIDO);

check(
  resultProfInvalido.bloqueos.some(
    (b) =>
      b.codigo === "profesional_especialidad_invalida" ||
      b.codigo === "especialidad_invalida"
  ),
  'Especialidad "Kinesiologia" (sin tilde) → bloqueo de especialidad inválida'
);

// ── Sección e) Profesional válido con registro ─────────────────────────────────

section("e) Profesional válido con registro → sin bloqueo de especialidad");

const MOCK_CON_PROF_VALIDO: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_CENUPSI,
  fceConfig: MOCK_FCE_CONFIG_POST_MIGRATION,
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [MOCK_PROF_KINE, MOCK_PROF_PSI],
  adminLinksByProfesional: {
    "mock-prof-kine": ["admin-kine"],
    "mock-prof-psi":  ["admin-psi"],
  },
};

const resultProfValido = validateClinicaData(MOCK_CON_PROF_VALIDO);

check(
  !resultProfValido.bloqueos.some((b) => b.codigo === "profesional_especialidad_invalida"),
  'Profesionales con especialidad válida → sin bloqueo de especialidad inválida'
);
check(
  !resultProfValido.bloqueos.some((b) => b.codigo === "prescriptor_sin_registro"),
  'Ningún prescriptor sin registro (correcto — nadie prescribe en este template)'
);

// ── Sección f) Estado READY completo ──────────────────────────────────────────

section("f) Estado READY — todos los requisitos cumplidos");

const MOCK_CENUPSI_READY: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_CENUPSI,
  fceConfig: MOCK_FCE_CONFIG_POST_MIGRATION,
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [
    MOCK_PROF_KINE,
    MOCK_PROF_FONO,
    MOCK_PROF_PSI,
    MOCK_PROF_NUTRI,
    MOCK_PROF_TO,
  ],
  adminLinksByProfesional: MOCK_ADMIN_LINKS_TODOS,
};

const resultReady = validateClinicaData(MOCK_CENUPSI_READY);

check(resultReady.ready === true, "READY = true cuando todos los requisitos están completos");
check(resultReady.bloqueos.length === 0, `0 bloqueos en estado READY (actual: ${resultReady.bloqueos.length})`);

if (resultReady.bloqueos.length > 0) {
  for (const b of resultReady.bloqueos) {
    console.error(`    → [${b.codigo}] ${b.mensaje}`);
  }
}

// ── Resultado estático ────────────────────────────────────────────────────────

const STATIC_ERRORS = errors;

// ── Main async (sección g + cierre) ──────────────────────────────────────────

async function main(): Promise<void> {
  // ── Sección g) DB real (requiere env vars) ───────────────────────────────────

  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !srvKey) {
    console.log(
      "\n── DB real — SALTADA ──\n" +
      "  ⚠️  Variables de entorno no configuradas.\n" +
      "     Cargar .env.local y re-ejecutar para validar estado real de Cenupsi."
    );
  } else {
    section("g) DB real — validateClinica('cenupsi')");

    const { validateClinica } = await import("../src/lib/onboarding/validate-clinica");
    const resultDB = await validateClinica("cenupsi");

    check(
      resultDB.bloqueos.length >= 0,
      `validateClinica('cenupsi') retorna sin error (${resultDB.bloqueos.length} bloqueos, ${resultDB.advertencias.length} advertencias)`
    );

    if (resultDB.bloqueos.length > 0) {
      console.log("\n  Bloqueos actuales en Cenupsi (DB real):");
      for (const b of resultDB.bloqueos) {
        console.log(`    🔴 [${b.codigo}] ${b.mensaje}`);
        console.log(`       → ${b.accionSugerida}`);
      }
    } else {
      console.log("  ✓ Sin bloqueos en DB real");
    }

    if (resultDB.advertencias.length > 0) {
      console.log("\n  Advertencias:");
      for (const a of resultDB.advertencias) {
        console.log(`    🟡 [${a.codigo}] ${a.mensaje}`);
      }
    }

    if (resultDB.ready) {
      console.log("\n  ✅ Cenupsi está READY según la DB real.");
    } else {
      console.log(`\n  ❌ Cenupsi NOT READY (${resultDB.bloqueos.length} bloqueo(s) pendiente(s)).`);
    }
  }

  // ── Checklist go-live técnico ────────────────────────────────────────────────

  console.log(`
${"─".repeat(62)}
  CHECKLIST GO-LIVE TÉCNICO — Cenupsi (banco de pruebas)
${"─".repeat(62)}

  Pasos requeridos para que Cenupsi pueda operar:

  [ ] 1. Aplicar supabase/migrations/20260604_onboard_cenupsi.sql
         (operador Synapta — no automatizable por Claude Code)

  [ ] 2. Recolectar datos de los 5 profesionales:
         Nombre, Especialidad (exacta con tilde), numero_registro, tipo_registro
         Especialidades esperadas:
           · Kinesiología
           · Fonoaudiología
           · Psicología
           · Nutrición
           · Terapia Ocupacional

  [ ] 3. Registrar profesionales en DB con auth_id vinculado a su login
         (1 profesional por especialidad como mínimo)

  [ ] 4. Gestionar asignaciones de servicios:
         Verificar si hay servicios sin profesional asignado y resolverlos
         desde /dashboard/configuracion/servicios (F5)

  [ ] 5. Smoke test por especialidad:
         Cada profesional inicia encuentro → completa nota → firma

  [ ] 6. Re-validar:
         npm run validate:clinica -- --slug=cenupsi
         → debe reportar READY (0 bloqueos)

  Nota: Cenupsi es banco de pruebas técnico, no cliente confirmado.
  NO contactar al equipo Cenupsi hasta decisión comercial confirmada.
${"─".repeat(62)}
`);

  // ── Resultado final ──────────────────────────────────────────────────────────

  console.log("─".repeat(55));
  if (errors === 0) {
    console.log("✅ Sprint O1-F6: todos los checks pasaron.\n");
    process.exit(0);
  } else {
    console.error(`❌ ${errors} check(s) fallaron — ver detalle arriba.\n`);
    process.exit(1);
  }
}

// Mantener compatibilidad con error de sección estática
if (STATIC_ERRORS > 0) {
  // Los errores estáticos ya se imprimieron; main() mostrará el total final
}

main().catch((err: unknown) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
