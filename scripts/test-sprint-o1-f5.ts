/**
 * test-sprint-o1-f5.ts — Sprint O1 Fase 5: self-service del director
 *
 * Verifica:
 * 1. Archivos requeridos existen
 * 2. TIPOS_REGISTRO completo
 * 3. puedeGestionarConfiguracion — recepcionista bloqueada, admin permitido
 * 4. filtrarCamposEditables — puede_prescribir NUNCA en payload
 * 5. Validaciones de numero_registro y tipo_registro
 * 6. Análisis estático de actions — patterns correctos
 * 7. DB tests (requiere env vars)
 *
 * USO: npx tsx scripts/test-sprint-o1-f5.ts
 * Sale con código 0 si OK, código 1 si hay errores.
 */

import * as fs from "fs";
import * as path from "path";

// Pure-function imports from shared (no Next.js / DB deps)
import {
  TIPOS_REGISTRO,
  puedeGestionarConfiguracion,
  filtrarCamposEditables,
  validarNumeroRegistro,
  validarTipoRegistro,
} from "../src/app/actions/configuracion/shared";

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

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {

  // ── Section 1: Archivos requeridos ─────────────────────────────────────────

  section("Archivos requeridos");

  const REQUIRED_FILES = [
    "src/app/actions/configuracion/shared.ts",
    "src/app/actions/configuracion/_shared-server.ts",
    "src/app/actions/configuracion/profesionales.ts",
    "src/app/actions/configuracion/servicios.ts",
    "src/app/dashboard/configuracion/profesionales/page.tsx",
    "src/app/dashboard/configuracion/servicios/page.tsx",
    "src/components/configuracion/ProfesionalesConfigurador.tsx",
    "src/components/configuracion/ServiciosConfigurador.tsx",
  ];

  for (const rel of REQUIRED_FILES) {
    check(fs.existsSync(path.join(ROOT, rel)), `${rel} existe`);
  }

  // ── Section 2: TIPOS_REGISTRO completo ─────────────────────────────────────

  section("TIPOS_REGISTRO completo");

  const EXPECTED_TIPOS = [
    "RNPI",
    "Colegio Kinesiólogos",
    "Colegio Médico",
    "Colegio Odontólogos",
    "Colegio Psicólogos",
    "Otro",
  ];

  check(
    typeof TIPOS_REGISTRO !== "undefined" &&
      Array.isArray(TIPOS_REGISTRO as unknown as unknown[]),
    "TIPOS_REGISTRO está definido"
  );

  for (const tipo of EXPECTED_TIPOS) {
    check(
      (TIPOS_REGISTRO as readonly string[]).includes(tipo),
      `TIPOS_REGISTRO incluye "${tipo}"`
    );
  }

  // ── Section 3: puedeGestionarConfiguracion ──────────────────────────────────

  section("puedeGestionarConfiguracion — roles autorizados y bloqueados");

  check(
    puedeGestionarConfiguracion("recepcionista") === false,
    'puedeGestionarConfiguracion("recepcionista") → false'
  );
  check(
    puedeGestionarConfiguracion("profesional") === false,
    'puedeGestionarConfiguracion("profesional") → false'
  );
  check(
    puedeGestionarConfiguracion("admin") === true,
    'puedeGestionarConfiguracion("admin") → true'
  );
  check(
    puedeGestionarConfiguracion("director") === true,
    'puedeGestionarConfiguracion("director") → true'
  );
  check(
    puedeGestionarConfiguracion("superadmin") === true,
    'puedeGestionarConfiguracion("superadmin") → true'
  );
  check(
    puedeGestionarConfiguracion(null) === false,
    "puedeGestionarConfiguracion(null) → false"
  );

  // ── Section 4: filtrarCamposEditables — CRÍTICO ─────────────────────────────

  section("filtrarCamposEditables — puede_prescribir NUNCA en payload (CRÍTICO)");

  const raw = {
    nombre: "Dr. Test",
    numero_registro: "REG-123",
    tipo_registro: "RNPI",
    activo: true,
    puede_prescribir: true,        // must be stripped
    puede_indicar_examenes: true,  // must be stripped
    especialidad: "Kinesiología",  // must be stripped
    auth_id: "some-uuid",          // must be stripped
  };

  const filtered = filtrarCamposEditables(raw);

  check(filtered.nombre === "Dr. Test", 'filtered.nombre === "Dr. Test"');
  check(
    filtered.numero_registro === "REG-123",
    'filtered.numero_registro === "REG-123"'
  );
  check(filtered.tipo_registro === "RNPI", 'filtered.tipo_registro === "RNPI"');
  check(filtered.activo === true, "filtered.activo === true");
  check(
    !("puede_prescribir" in filtered),
    '"puede_prescribir" NOT in filtered (CRÍTICO — nunca en payload)'
  );
  check(
    !("puede_indicar_examenes" in filtered),
    '"puede_indicar_examenes" NOT in filtered (CRÍTICO — nunca en payload)'
  );
  check(!("especialidad" in filtered), '"especialidad" NOT in filtered');
  check(!("auth_id" in filtered), '"auth_id" NOT in filtered');

  // ── Section 5: validarNumeroRegistro ───────────────────────────────────────

  section("validarNumeroRegistro");

  check(
    validarNumeroRegistro(null).success === true,
    "validarNumeroRegistro(null) → success: true"
  );
  check(
    validarNumeroRegistro("").success === true,
    'validarNumeroRegistro("") → success: true'
  );
  check(
    validarNumeroRegistro("RNPI-12345").success === true,
    'validarNumeroRegistro("RNPI-12345") → success: true'
  );
  check(
    validarNumeroRegistro("a".repeat(51)).success === false,
    'validarNumeroRegistro("a".repeat(51)) → success: false (> 50 chars)'
  );
  check(
    validarNumeroRegistro("abc 123").success === true,
    'validarNumeroRegistro("abc 123") → success: true (espacios permitidos)'
  );
  check(
    validarNumeroRegistro("#$%").success === false,
    'validarNumeroRegistro("#$%") → success: false (caracteres inválidos)'
  );

  // ── Section 6: validarTipoRegistro ─────────────────────────────────────────

  section("validarTipoRegistro");

  check(
    validarTipoRegistro(null).success === true,
    "validarTipoRegistro(null) → success: true"
  );
  check(
    validarTipoRegistro(undefined).success === true,
    "validarTipoRegistro(undefined) → success: true"
  );
  check(
    validarTipoRegistro("RNPI").success === true,
    'validarTipoRegistro("RNPI") → success: true'
  );
  check(
    validarTipoRegistro("Colegio Psicólogos").success === true,
    'validarTipoRegistro("Colegio Psicólogos") → success: true'
  );
  check(
    validarTipoRegistro("Registro Ficticio").success === false,
    'validarTipoRegistro("Registro Ficticio") → success: false'
  );

  // ── Section 7: Análisis estático ──────────────────────────────────────────

  section("Análisis estático — Profesionales action");

  const profPath = path.join(
    ROOT,
    "src/app/actions/configuracion/profesionales.ts"
  );
  const profContent = readFile(profPath);

  check(profContent !== null, "src/app/actions/configuracion/profesionales.ts leído");

  if (profContent) {
    check(
      profContent.includes("export async function updateProfesionalSelfService"),
      "updateProfesionalSelfService exportada"
    );
    check(
      profContent.includes("export async function toggleProfesionalActivo"),
      "toggleProfesionalActivo exportada"
    );

    // CRÍTICO: puede_prescribir NO debe aparecer en el payload de ningún .update()
    // updateProfesionalSelfService pasa `camposEditables` (ya filtrado por filtrarCamposEditables)
    // Extraer bloque de la función para análisis acotado
    const updateFnStart = profContent.indexOf(
      "export async function updateProfesionalSelfService"
    );
    const toggleFnStart = profContent.indexOf(
      "export async function toggleProfesionalActivo"
    );
    const updateFnBody =
      updateFnStart !== -1 && toggleFnStart !== -1
        ? profContent.slice(updateFnStart, toggleFnStart)
        : profContent;

    // Verificar que puede_prescribir no sea un key literal en ningún .update({ ... })
    const updatePayloadPattern = /\.update\s*\(\s*\{[^}]*puede_prescribir/;
    check(
      !updatePayloadPattern.test(updateFnBody),
      '"puede_prescribir" NO aparece en ningún .update({ ... }) payload'
    );

    check(
      profContent.includes('.eq("id_clinica", idClinica)'),
      '.eq("id_clinica", idClinica) presente en la query de profesionales'
    );
    check(
      profContent.includes("logAuditConfig") || profContent.includes("logs_auditoria"),
      "logs_auditoria INSERT presente (via logAuditConfig)"
    );
  }

  section("Análisis estático — Servicios action");

  const servPath = path.join(
    ROOT,
    "src/app/actions/configuracion/servicios.ts"
  );
  const servContent = readFile(servPath);

  check(servContent !== null, "src/app/actions/configuracion/servicios.ts leído");

  if (servContent) {
    check(
      servContent.includes("export async function asignarProfesionalServicio"),
      "asignarProfesionalServicio exportada"
    );
    check(
      servContent.includes("export async function desasignarProfesionalServicio"),
      "desasignarProfesionalServicio exportada"
    );

    // desasignar debe verificar que el servicio pertenece a la clínica
    const desasignarStart = servContent.indexOf(
      "export async function desasignarProfesionalServicio"
    );
    const desasignarBody =
      desasignarStart !== -1 ? servContent.slice(desasignarStart) : servContent;

    check(
      desasignarBody.includes('.eq("id_clinica", idClinica)'),
      'desasignar incluye .eq("id_clinica", idClinica) para verificar servicio'
    );
    check(
      servContent.includes("logAuditConfig") || servContent.includes("logs_auditoria"),
      "logs_auditoria INSERT presente en servicios (via logAuditConfig)"
    );
  }

  section("Análisis estático — Pages");

  const profPagePath = path.join(
    ROOT,
    "src/app/dashboard/configuracion/profesionales/page.tsx"
  );
  const profPageContent = readFile(profPagePath);

  check(profPageContent !== null, "profesionales/page.tsx leído");
  if (profPageContent) {
    check(
      profPageContent.includes("ROLES_QUE_CONFIGURAN"),
      "ROLES_QUE_CONFIGURAN usado en profesionales/page.tsx"
    );
  }

  const servPagePath = path.join(
    ROOT,
    "src/app/dashboard/configuracion/servicios/page.tsx"
  );
  const servPageContent = readFile(servPagePath);

  check(servPageContent !== null, "servicios/page.tsx leído");
  if (servPageContent) {
    check(
      servPageContent.includes("ROLES_QUE_CONFIGURAN"),
      "ROLES_QUE_CONFIGURAN usado en servicios/page.tsx"
    );
  }

  section("Análisis estático — Components");

  const profCompPath = path.join(
    ROOT,
    "src/components/configuracion/ProfesionalesConfigurador.tsx"
  );
  const profCompContent = readFile(profCompPath);

  check(profCompContent !== null, "ProfesionalesConfigurador.tsx leído");
  if (profCompContent) {
    check(
      profCompContent.includes(
        'from "@/app/actions/configuracion/shared"'
      ) ||
        profCompContent.includes(
          "from '../../../app/actions/configuracion/shared'"
        ),
      "ProfesionalesConfigurador.tsx importa TIPOS_REGISTRO desde shared"
    );
  }

  const servCompPath = path.join(
    ROOT,
    "src/components/configuracion/ServiciosConfigurador.tsx"
  );
  const servCompContent = readFile(servCompPath);

  check(servCompContent !== null, "ServiciosConfigurador.tsx leído");
  if (servCompContent) {
    check(
      servCompContent.includes(
        'from "@/app/actions/configuracion/servicios"'
      ) ||
        servCompContent.includes(
          "from '../../../app/actions/configuracion/servicios'"
        ),
      "ServiciosConfigurador.tsx importa desde servicios actions"
    );
  }

  // ── Section 8: DB tests ────────────────────────────────────────────────────

  section("Tests de DB (requiere NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      "  ⚠ Variables de entorno no disponibles — omitiendo tests de DB."
    );
    console.log(
      "    Para ejecutar tests de DB: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-sprint-o1-f5.ts"
    );
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // DB Test A: validaciones puras en entorno real
    console.log("  DB Test A: validaciones puras en entorno runtime");
    check(
      validarNumeroRegistro("RNPI-12345").success === true,
      "[DB-A] validarNumeroRegistro runtime → success: true"
    );
    check(
      validarTipoRegistro("Colegio Médico").success === true,
      "[DB-A] validarTipoRegistro runtime → success: true"
    );
    check(
      validarTipoRegistro("Registro Inventado").success === false,
      "[DB-A] validarTipoRegistro tipo inválido → success: false"
    );

    // DB Test B: clínica de prueba con profesional
    console.log("  DB Test B: encontrar clínica y profesional de prueba");

    const { data: clinica, error: errorClinica } = await supabase
      .from("clinicas_fce_config")
      .select("id_clinica")
      .limit(1)
      .single();

    if (errorClinica || !clinica) {
      console.log(
        "  ⚠ No se encontró ninguna clínica en clinicas_fce_config — omitiendo sub-tests B."
      );
    } else {
      check(
        !!clinica.id_clinica,
        `[DB-B] Clínica encontrada: ${clinica.id_clinica}`
      );

      const { data: prof, error: errorProf } = await supabase
        .from("profesionales")
        .select("id, nombre, numero_registro, id_clinica")
        .eq("id_clinica", clinica.id_clinica)
        .limit(1)
        .maybeSingle();

      if (errorProf || !prof) {
        console.log(
          "  ⚠ No se encontró ningún profesional en esta clínica — omitiendo sub-tests de escritura."
        );
      } else {
        check(
          !!prof.id,
          `[DB-B] Profesional encontrado: ${prof.nombre} (${prof.id})`
        );

        const originalRegistro = prof.numero_registro as string | null;
        const testRegistro = "TEST-O1F5";

        // Simular lo que haría updateProfesionalSelfService: UPDATE directo a DB
        const { error: errorUpdate } = await supabase
          .from("profesionales")
          .update({ numero_registro: testRegistro })
          .eq("id", prof.id)
          .eq("id_clinica", clinica.id_clinica);

        check(!errorUpdate, "[DB-B] UPDATE numero_registro → sin error");

        // Verificar que el valor se actualizó
        const { data: profActualizado } = await supabase
          .from("profesionales")
          .select("numero_registro")
          .eq("id", prof.id)
          .single();

        check(
          profActualizado?.numero_registro === testRegistro,
          `[DB-B] DB refleja nuevo valor: "${testRegistro}"`
        );

        // Restaurar valor original
        const { error: errorRestore } = await supabase
          .from("profesionales")
          .update({ numero_registro: originalRegistro })
          .eq("id", prof.id)
          .eq("id_clinica", clinica.id_clinica);

        check(!errorRestore, "[DB-B] Valor original restaurado correctamente");

        // Verificar que hay un audit log reciente para este profesional
        const { data: auditLog } = await supabase
          .from("logs_auditoria")
          .select("id, accion, tabla_afectada, registro_id")
          .eq("tabla_afectada", "profesionales")
          .eq("registro_id", prof.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        check(
          !!auditLog,
          `[DB-B] logs_auditoria contiene entrada con tabla_afectada="profesionales" y registro_id="${prof.id}"`
        );
      }
    }
  }

  // ── Resultado final ────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(60));
  if (errors === 0) {
    console.log("✅ Sprint O1-F5: todos los checks pasaron.\n");
    process.exit(0);
  } else {
    console.error(`❌ ${errors} check(s) fallaron — ver detalle arriba.\n`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
