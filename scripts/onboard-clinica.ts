/**
 * onboard-clinica.ts — CLI de onboarding para nuevas clínicas FCE
 *
 * Genera el SQL necesario para configurar clinicas_fce_config.
 * NUNCA aplica DDL — solo genera el archivo .sql para revisión humana.
 *
 * USO:
 *   npm run onboard:clinica -- --slug=cenupsi --template=multidisciplinaria-rehab-psi
 *   npm run onboard:clinica -- --slug=foo --template=medica-general --dry-run
 *   npm run onboard:clinica -- --slug=foo --template=dental --force
 *
 * FLAGS:
 *   --slug=<slug>         Slug de la clínica (debe existir en tabla clinicas)
 *   --template=<nombre>   Nombre del template a usar
 *   --dry-run             Imprime SQL a stdout sin crear archivo ni validar DB
 *   --force               Permite generar SQL aunque ya exista un onboarding previo
 *
 * SIN --dry-run:
 *   1. Valida que el slug exista en DB (requiere env vars Supabase)
 *   2. Genera el archivo supabase/migrations/{fecha}_onboard_{slug}.sql
 *   3. Imprime SQL a stdout
 */

import * as fs from "fs";
import * as path from "path";
import { TEMPLATES, TEMPLATE_NAMES } from "./onboarding-templates/index";
import { ESPECIALIDADES_REGISTRY } from "../src/lib/modules/registry";
import type { ClinicaTemplate } from "./onboarding-templates/index";

// ── Arg parsing ───────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const found = rawArgs.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(`--${name}=`.length) : undefined;
}

const isDryRun = rawArgs.includes("--dry-run");
const isForce  = rawArgs.includes("--force");
const slug     = getArg("slug");
const templateName = getArg("template");

// ── SQL generation ────────────────────────────────────────────────────────────

function toSqlArray(items: string[]): string {
  return "ARRAY[\n" + items.map((s) => `    '${s}'`).join(",\n") + "\n  ]";
}

function toSqlPermisosComment(template: ClinicaTemplate): string {
  const lines: string[] = ["-- Permisos por especialidad (aplican a tabla profesionales, NO a clinicas_fce_config):"];
  for (const [esp, permisos] of Object.entries(template.permisosPorEspecialidad)) {
    const presc = permisos.puede_prescribir ? "SÍ" : "NO";
    const exam  = permisos.puede_indicar_examenes ? "SÍ" : "NO";
    lines.push(`--   ${esp}: puede_prescribir=${presc}, puede_indicar_examenes=${exam}`);
  }
  return lines.join("\n");
}

export function generarSQL(slug: string, template: ClinicaTemplate, fechaStr: string): string {
  const notasSQL = template.notas.map((n) => `-- ${n}`).join("\n");
  const permisosComentario = toSqlPermisosComment(template);

  return `-- ============================================================================
-- Onboarding: ${slug}
-- Template:   ${template.nombre}
-- Generado:   ${fechaStr}
-- ============================================================================
-- ${template.descripcion}
--
-- ⚠️  IMPORTANTE: Revisar antes de ejecutar.
--     Claude Code NO aplica DDL. Aplique con coordinación del equipo Synapta.
--
-- Notas del template:
${notasSQL}
--
${permisosComentario}
-- ============================================================================

BEGIN;

-- 1. Verificar que la clínica existe antes de modificar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clinicas WHERE slug = '${slug}') THEN
    RAISE EXCEPTION 'Clínica con slug "%" no encontrada en tabla clinicas. Verificar slug.', '${slug}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clinicas_fce_config WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = '${slug}')) THEN
    RAISE EXCEPTION 'Clínica "%" no tiene fila en clinicas_fce_config. Crear registro base primero.', '${slug}';
  END IF;
END $$;

-- 2. Activar módulos y especialidades
UPDATE clinicas_fce_config
SET
  modulos_activos     = ${toSqlArray(template.modulos)},
  especialidades_activas = ${toSqlArray(template.especialidades)}
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = '${slug}');

-- 3. Verificar resultado post-update
SELECT
  c.slug,
  cf.modulos_activos,
  cf.especialidades_activas,
  cf.updated_at
FROM clinicas c
JOIN clinicas_fce_config cf ON cf.id_clinica = c.id
WHERE c.slug = '${slug}';

COMMIT;

-- ============================================================================
-- Próximos pasos post-aplicación:
-- 1. Confirmar resultado del SELECT de verificación (paso 3).
-- 2. Activar permisos individuales en profesionales según tabla de arriba.
-- 3. Verificar que el Sidebar muestre los módulos correctos al iniciar sesión.
-- ============================================================================
`;
}

// ── Validación estática ───────────────────────────────────────────────────────

function validarTemplate(template: ClinicaTemplate): string[] {
  const errores: string[] = [];

  if (template.modulos.length === 0) {
    errores.push("El template no tiene módulos configurados.");
  }

  if (!template.modulos.includes("M1_identificacion")) {
    errores.push("M1_identificacion es obligatorio y no está en el template.");
  }

  if (!template.modulos.includes("M6_auditoria")) {
    errores.push("M6_auditoria es obligatorio y no está en el template.");
  }

  for (const esp of template.especialidades) {
    if (!ESPECIALIDADES_REGISTRY[esp]) {
      errores.push(`Especialidad desconocida en registry: "${esp}". Verificar tilde y mayúsculas.`);
    }
  }

  return errores;
}

// ── DB validation (solo cuando no es dry-run) ─────────────────────────────────

async function validarEnDB(slug: string, isForce: boolean): Promise<string[]> {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !srvKey) {
    console.warn(
      "\n⚠️  NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas.\n" +
      "   Saltando validación contra DB. El SQL generado requiere que la clínica exista.\n"
    );
    return [];
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, srvKey);

  const errores: string[] = [];

  // Verificar que el slug existe en clinicas
  const { data: clinica, error: errClinica } = await supabase
    .from("clinicas")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (errClinica) {
    errores.push(`Error consultando clinicas: ${errClinica.message}`);
    return errores;
  }

  if (!clinica) {
    errores.push(`No existe ninguna clínica con slug="${slug}" en tabla clinicas.`);
    return errores;
  }

  // Verificar que no haya un onboarding previo con módulos distintos al default
  if (!isForce) {
    const DEFAULT_MODULOS = ["M1_identificacion", "M6_auditoria"];
    const { data: config, error: errConfig } = await supabase
      .from("clinicas_fce_config")
      .select("modulos_activos")
      .eq("id_clinica", clinica.id)
      .maybeSingle();

    if (errConfig) {
      errores.push(`Error consultando clinicas_fce_config: ${errConfig.message}`);
      return errores;
    }

    if (config) {
      const modulosActuales: string[] = config.modulos_activos ?? [];
      const esSoloDefault =
        modulosActuales.length === DEFAULT_MODULOS.length &&
        DEFAULT_MODULOS.every((m) => modulosActuales.includes(m));

      if (!esSoloDefault) {
        errores.push(
          `La clínica "${slug}" ya tiene onboarding configurado ` +
          `(módulos: ${modulosActuales.join(", ")}). ` +
          "Usa --force para sobreescribir."
        );
      }
    }
  }

  return errores;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n── FCE Onboarding CLI ──\n");

  // 1. Validar argumentos mínimos
  if (!slug) {
    console.error("❌ Falta --slug=<slug>. Uso: npm run onboard:clinica -- --slug=foo --template=bar");
    process.exit(1);
  }

  if (!templateName) {
    console.error(
      `❌ Falta --template=<nombre>. Templates disponibles:\n  ${TEMPLATE_NAMES.join("\n  ")}`
    );
    process.exit(1);
  }

  // 2. Validar template existe
  const template = TEMPLATES[templateName];
  if (!template) {
    console.error(
      `❌ Template desconocido: "${templateName}". Templates disponibles:\n  ${TEMPLATE_NAMES.join("\n  ")}`
    );
    process.exit(1);
  }

  console.log(`Slug:     ${slug}`);
  console.log(`Template: ${templateName} — ${template.nombre}`);
  console.log(`Dry-run:  ${isDryRun ? "SÍ (no crea archivo, no valida DB)" : "NO (crea archivo en supabase/migrations/)"}`);
  console.log(`Force:    ${isForce ? "SÍ" : "NO"}\n`);

  // 3. Validación estática del template
  const erroresEstaticos = validarTemplate(template);
  if (erroresEstaticos.length > 0) {
    console.error("❌ Errores en el template:");
    erroresEstaticos.forEach((e) => console.error(`   → ${e}`));
    process.exit(1);
  }
  console.log(`✓ Template válido: ${template.modulos.length} módulos, ${template.especialidades.length} especialidades`);

  // 4. Validación contra DB (solo en modo real, no dry-run)
  if (!isDryRun) {
    const erroresDB = await validarEnDB(slug, isForce);
    if (erroresDB.length > 0) {
      console.error("\n❌ Errores de validación:");
      erroresDB.forEach((e) => console.error(`   → ${e}`));
      process.exit(1);
    }
    console.log("✓ Validación DB completada\n");
  }

  // 5. Generar SQL
  const ahora = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sql = generarSQL(slug, template, new Date().toISOString());

  // 6. Dry-run: solo imprimir
  if (isDryRun) {
    console.log("── SQL generado (--dry-run) ──\n");
    console.log(sql);
    return;
  }

  // 7. Modo normal: guardar archivo
  const root       = path.resolve(__dirname, "..");
  const migrDir    = path.join(root, "supabase", "migrations");
  const filename   = `${ahora}_onboard_${slug}.sql`;
  const filepath   = path.join(migrDir, filename);

  if (fs.existsSync(filepath) && !isForce) {
    console.error(
      `❌ El archivo ${filename} ya existe. Usa --force para sobreescribir.`
    );
    process.exit(1);
  }

  fs.mkdirSync(migrDir, { recursive: true });
  fs.writeFileSync(filepath, sql, "utf-8");

  console.log(`✅ Archivo generado: supabase/migrations/${filename}`);
  console.log("── SQL generado ──\n");
  console.log(sql);
  console.log(`\n📋 Próximo paso: revisar el SQL y aplicar con coordinación del equipo Synapta.`);
}

// Solo ejecutar main() cuando este archivo es el entry point (no cuando se importa)
if (require.main === module) {
  main().catch((err: unknown) => {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  });
}
