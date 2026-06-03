/**
 * test-sprint-o1-f3.ts — Validación Sprint O1 Fase 3: validador pre go-live
 *
 * Verifica:
 * 1. Lógica pura de validación con mocks (sin DB):
 *    - Clínica completa → READY, 0 bloqueos
 *    - Slug inexistente → bloqueo clinica_no_existe
 *    - Solo M1+M6 → bloqueo modulos_solo_base
 *    - Especialidad sin tilde → bloqueo especialidad_invalida
 *    - M7 activo sin prescriptores → bloqueo m7_sin_prescriptores
 *    - M8 activo sin indicadores → bloqueo m8_sin_indicadores_examenes
 *    - Prescriptor sin registro → bloqueo prescriptor_sin_registro
 * 2. Cenupsi en DB real (si hay env vars): ≥3 bloqueos esperados
 * 3. Slug inexistente en DB real: bloqueo clinica_no_existe
 *
 * USO: npx tsx scripts/test-sprint-o1-f3.ts
 * Sale con código 0 si OK, código 1 si hay errores.
 */

import {
  validateClinica,
  validateClinicaData,
} from "../src/lib/onboarding/validate-clinica";
import type { ClinicaValidationInput } from "../src/lib/onboarding/validate-clinica";

let errors = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    errors++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ── Datos mock reutilizables ───────────────────────────────────────────────────

const MOCK_CLINICA_BASE = {
  id: "mock-uuid-clinic-1",
  slug: "clinica-test",
  config: {
    branding: {
      primary: "#00B0A8",
      navy: "#006B6B",
      clinic_short_name: "Test Clínica",
      clinic_initials: "TC",
    },
  },
};

const MOCK_CATALOGO = [
  { codigo: "Kinesiología", activa: true },
  { codigo: "Fonoaudiología", activa: true },
  { codigo: "Medicina General", activa: true },
  { codigo: "Psicología", activa: true },
  { codigo: "Odontología", activa: true },
];

const MOCK_PROF_KINE = {
  id: "prof-1",
  nombre: "Juan Pérez",
  especialidad: "Kinesiología",
  numero_registro: "SIS-12345",
  tipo_registro: "SIS",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_PROF_FONO = {
  id: "prof-2",
  nombre: "Ana García",
  especialidad: "Fonoaudiología",
  numero_registro: "COL-67890",
  tipo_registro: "Colegio Fonoaudiólogos",
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const MOCK_ADMIN_LINKS: Record<string, string[]> = {
  "prof-1": ["admin-1"],
  "prof-2": ["admin-2"],
};

const MOCK_COMPLETA: ClinicaValidationInput = {
  clinica: MOCK_CLINICA_BASE,
  fceConfig: {
    modulos_activos: [
      "M1_identificacion",
      "M2_anamnesis",
      "M3_evaluacion",
      "M4_soap",
      "M5_consentimiento",
      "M6_auditoria",
    ],
    especialidades_activas: ["Kinesiología", "Fonoaudiología"],
  },
  especialidadesCatalogo: MOCK_CATALOGO,
  profesionales: [MOCK_PROF_KINE, MOCK_PROF_FONO],
  adminLinksByProfesional: MOCK_ADMIN_LINKS,
};

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {

  // ── Test 2: Mock clínica completa → READY ────────────────────────────────────

  section("Test: Mock clínica completa → READY, 0 bloqueos");

  const resultCompleta = validateClinicaData(MOCK_COMPLETA);

  check(resultCompleta.ready === true, "ready = true");
  check(resultCompleta.bloqueos.length === 0, `bloqueos.length = 0 (actual: ${resultCompleta.bloqueos.length})`);

  if (resultCompleta.bloqueos.length > 0) {
    for (const b of resultCompleta.bloqueos) console.error(`    → [${b.codigo}] ${b.mensaje}`);
  }

  // ── Test 3: Slug inexistente (mock) ───────────────────────────────────────────

  section("Test: clinica=null → bloqueo clinica_no_existe");

  const MOCK_NULL: ClinicaValidationInput = {
    clinica: null,
    fceConfig: null,
    especialidadesCatalogo: [],
    profesionales: [],
    adminLinksByProfesional: {},
  };

  const resultNull = validateClinicaData(MOCK_NULL);

  check(resultNull.ready === false, "ready = false");
  check(resultNull.bloqueos.length >= 1, `≥1 bloqueo (actual: ${resultNull.bloqueos.length})`);
  check(
    resultNull.bloqueos.some((b) => b.codigo === "clinica_no_existe"),
    'bloqueo "clinica_no_existe" presente'
  );

  // ── Test: Solo M1+M6 ─────────────────────────────────────────────────────────

  section("Test: Solo M1+M6 → bloqueo modulos_solo_base");

  const resultBase = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: {
      modulos_activos: ["M1_identificacion", "M6_auditoria"],
      especialidades_activas: ["Kinesiología"],
    },
  });

  check(
    resultBase.bloqueos.some((b) => b.codigo === "modulos_solo_base"),
    'bloqueo "modulos_solo_base" presente con solo M1+M6'
  );

  // ── Test: Especialidad sin tilde ──────────────────────────────────────────────

  section('Test: Especialidad "Kinesiologia" (sin tilde) → bloqueo especialidad_invalida');

  const resultTilde = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: {
      modulos_activos: ["M1_identificacion", "M4_soap", "M6_auditoria"],
      especialidades_activas: ["Kinesiologia"], // sin tilde
    },
  });

  check(
    resultTilde.bloqueos.some((b) => b.codigo === "especialidad_invalida"),
    'bloqueo "especialidad_invalida" cuando especialidad sin tilde'
  );

  // ── Test: M7 activo sin prescriptores ─────────────────────────────────────────

  section("Test: M7 activo sin prescriptores → bloqueo m7_sin_prescriptores");

  const resultM7 = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: {
      modulos_activos: ["M1_identificacion", "M4_soap", "M6_auditoria", "M7_prescripciones"],
      especialidades_activas: ["Kinesiología"],
    },
  });

  check(
    resultM7.bloqueos.some((b) => b.codigo === "m7_sin_prescriptores"),
    'bloqueo "m7_sin_prescriptores" cuando M7 activo y nadie prescribe'
  );

  // ── Test: M8 activo sin indicadores ──────────────────────────────────────────

  section("Test: M8 activo sin indicadores_examenes → bloqueo m8_sin_indicadores_examenes");

  const resultM8 = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: {
      modulos_activos: ["M1_identificacion", "M4_soap", "M6_auditoria", "M8_examenes"],
      especialidades_activas: ["Kinesiología"],
    },
  });

  check(
    resultM8.bloqueos.some((b) => b.codigo === "m8_sin_indicadores_examenes"),
    'bloqueo "m8_sin_indicadores_examenes" cuando M8 activo y nadie indica examenes'
  );

  // ── Test: Prescriptor sin registro ───────────────────────────────────────────

  section("Test: Prescriptor con puede_prescribir pero sin numero_registro → bloqueo");

  const resultPrescrSinReg = validateClinicaData({
    ...MOCK_COMPLETA,
    profesionales: [
      {
        ...MOCK_PROF_KINE,
        puede_prescribir: true,
        numero_registro: null,
        tipo_registro: null,
      },
    ],
  });

  check(
    resultPrescrSinReg.bloqueos.some((b) => b.codigo === "prescriptor_sin_registro"),
    'bloqueo "prescriptor_sin_registro" cuando prescriptor sin número'
  );

  // ── Test: Especialidad activa sin profesional asignado ────────────────────────

  section("Test: Especialidad activa sin profesional asignado → advertencia");

  const resultEspSinProf = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: {
      modulos_activos: ["M1_identificacion", "M4_soap", "M6_auditoria"],
      especialidades_activas: ["Kinesiología", "Psicología"], // Psicología sin profesional
    },
    profesionales: [MOCK_PROF_KINE], // solo Kinesiología
  });

  check(
    resultEspSinProf.advertencias.some((a) => a.codigo === "especialidad_sin_profesional"),
    'advertencia "especialidad_sin_profesional" cuando especialidad sin profesional asignado'
  );

  // ── Test: Profesional sin admin_user link → advertencia ──────────────────────

  section("Test: Profesional sin admin_user link → advertencia profesional_sin_admin_user");

  const resultSinAdmin = validateClinicaData({
    ...MOCK_COMPLETA,
    adminLinksByProfesional: {}, // nadie vinculado
  });

  check(
    resultSinAdmin.advertencias.some((a) => a.codigo === "profesional_sin_admin_user"),
    'advertencia "profesional_sin_admin_user" cuando profesional sin link'
  );

  // ── Test: Sin branding → advertencia ─────────────────────────────────────────

  section("Test: Sin branding → advertencia sin_branding");

  const resultSinBranding = validateClinicaData({
    ...MOCK_COMPLETA,
    clinica: { ...MOCK_CLINICA_BASE, config: {} }, // branding vacío
  });

  check(
    resultSinBranding.advertencias.some((a) => a.codigo === "sin_branding"),
    'advertencia "sin_branding" cuando config.branding vacío'
  );

  // ── Test: Config FCE no existe → bloqueo ─────────────────────────────────────

  section("Test: fceConfig=null → bloqueo config_fce_no_existe");

  const resultSinConfig = validateClinicaData({
    ...MOCK_COMPLETA,
    fceConfig: null,
  });

  check(
    resultSinConfig.bloqueos.some((b) => b.codigo === "config_fce_no_existe"),
    'bloqueo "config_fce_no_existe" cuando no hay fila en clinicas_fce_config'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests con DB real (requieren env vars)
  // ─────────────────────────────────────────────────────────────────────────────

  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !srvKey) {
    console.log(
      "\n── Tests DB real — SALTADOS ──\n" +
      "  ⚠️  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas.\n" +
      "     Cargar .env.local y re-ejecutar para validar Cenupsi en DB real."
    );
  } else {

    // ── Test 1: Cenupsi (estado actual: M1+M6, sin especialidades) ───────────────

    section("Test 1 (DB): Cenupsi → NOT READY con ≥3 bloqueos");

    const resultCenupsi = await validateClinica("cenupsi");

    check(
      resultCenupsi.ready === false,
      "Cenupsi: ready = false (estado esperado: en construcción)"
    );
    check(
      resultCenupsi.bloqueos.length >= 3,
      `Cenupsi: ≥3 bloqueos (actual: ${resultCenupsi.bloqueos.length})`
    );

    if (resultCenupsi.bloqueos.length > 0) {
      console.log("\n  Bloqueos encontrados en Cenupsi:");
      for (const b of resultCenupsi.bloqueos) {
        console.log(`    → [${b.codigo}] ${b.mensaje}`);
      }
    }
    if (resultCenupsi.advertencias.length > 0) {
      console.log("\n  Advertencias:");
      for (const a of resultCenupsi.advertencias) {
        console.log(`    → [${a.codigo}] ${a.mensaje}`);
      }
    }

    // ── Test 3 (DB): Slug inexistente ────────────────────────────────────────────

    section("Test 3 (DB): Slug inexistente → bloqueo clinica_no_existe");

    const resultInexistente = await validateClinica("slug-que-jamas-existira-xyz999");

    check(
      resultInexistente.ready === false,
      "Slug inexistente: ready = false"
    );
    check(
      resultInexistente.bloqueos.some((b) => b.codigo === "clinica_no_existe"),
      'Slug inexistente: bloqueo "clinica_no_existe" presente'
    );
  }

  // ── Resultado final ────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(55));
  if (errors === 0) {
    console.log("✅ Sprint O1-F3: todos los checks pasaron.\n");
    process.exit(0);
  } else {
    console.error(`❌ ${errors} check(s) fallaron — ver detalle arriba.\n`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
