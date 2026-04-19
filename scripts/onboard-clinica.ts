#!/usr/bin/env tsx
/**
 * CLI de onboarding de clínica nueva.
 *
 * Uso:
 *   npm run onboard-clinica -- \
 *     --slug=nuevos-horizontes \
 *     --nombre="Clínica Nuevos Horizontes" \
 *     --admin-email=admin@nh.cl \
 *     --direccion="Av. Siempre Viva 742, Santiago" \
 *     --modulos=M1_identificacion,M2_anamnesis,M5_consentimiento,M6_auditoria \
 *     --especialidades=psicologia,nutricion
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env (NO usa SSR cliente, usa admin).
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cargar .env
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
} catch {
  // .env.local no encontrado, seguir con env vars del sistema
}

import {
  MODULE_REGISTRY,
  ESPECIALIDADES_REGISTRY,
  validateConfig,
  type ModuleId,
  type EspecialidadCodigo,
} from "../src/lib/modules/registry";

// ============================================================================
// PARSE ARGS
// ============================================================================

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    nombre: { type: "string" },
    "admin-email": { type: "string" },
    direccion: { type: "string" },
    modulos: { type: "string" },
    especialidades: { type: "string", default: "" },
  },
  strict: true,
  allowPositionals: false,
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!values.slug || !values.nombre || !values["admin-email"] || !values.modulos) {
  fail(
    "Error: flags requeridos: --slug, --nombre, --admin-email, --modulos (--especialidades opcional)"
  );
}

const slug: string = values.slug;
const nombre: string = values.nombre;
const adminEmail: string = values["admin-email"];
const direccion = values.direccion ?? "";
const modulosArg = values.modulos.split(",").filter(Boolean) as ModuleId[];
const especialidadesArg = (values.especialidades ?? "")
  .split(",")
  .filter(Boolean) as EspecialidadCodigo[];

if (modulosArg.length === 0) {
  fail("Error: --modulos no puede estar vacío.");
}
// ============================================================================
// VALIDAR CONFIG
// ============================================================================

// Asegurar que M1 y M6 (obligatorios) estén incluidos
const modulosFinal = Array.from(new Set([...modulosArg, "M1_identificacion", "M6_auditoria"])) as ModuleId[];

const { ok, errores } = validateConfig(modulosFinal, especialidadesArg);
if (!ok) {
  console.error("Errores de validación:");
  errores.forEach((e) => console.error(" -", e));
  process.exit(1);
}

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================================
// ONBOARDING
// ============================================================================

async function main() {
  console.log(`\n🏥 Onboarding: ${nombre} (${slug})`);
  console.log(`   Admin: ${adminEmail}`);
  console.log(`   Módulos: ${modulosFinal.join(", ")}`);
  console.log(`   Especialidades: ${especialidadesArg.join(", ") || "(ninguna)"}\n`);

  // 1. Crear clínica
  const { data: clinica, error: errClinica } = await supabase
    .from("clinicas")
    .insert({ nombre, direccion })
    .select()
    .single();

  if (errClinica || !clinica) {
    console.error("Error creando clínica:", errClinica);
    process.exit(1);
  }
  console.log(`✓ Clínica creada. id_clinica=${clinica.id}`);

  // 2. Crear config
  const { error: errConfig } = await supabase.from("clinicas_config").insert({
    id_clinica: clinica.id,
    nombre_display: nombre,
    slug,
    modulos_activos: modulosFinal,
    especialidades_activas: especialidadesArg,
  });

  if (errConfig) {
    console.error("Error creando config:", errConfig);
    process.exit(1);
  }
  console.log("✓ Configuración creada");

  // 3. Invitar admin via Supabase Auth
  const { data: inviteData, error: errInvite } = await supabase.auth.admin.inviteUserByEmail(
    adminEmail,
    { data: { rol: "admin", id_clinica: clinica.id } }
  );

  if (errInvite) {
    console.error("Error invitando admin:", errInvite);
    // no fatal: la clínica ya existe, el admin se puede invitar después
  } else {
    console.log(`✓ Invitación enviada a ${adminEmail}`);

    // 4. Crear fila en admin_users
    if (inviteData.user) {
      const { error: errAdmin } = await supabase.from("admin_users").insert({
        auth_id: inviteData.user.id,
        id_clinica: clinica.id,
        rol: "admin",
        email: adminEmail,
      });
      if (errAdmin) {
        console.error("Error creando admin_user:", errAdmin);
      } else {
        console.log("✓ admin_users registrado");
      }
    }
  }

  // 5. Imprimir CLAUDE.md sugerido
  console.log("\n" + "=".repeat(70));
  console.log(`📝 CLAUDE.md sugerido — guardar en clinics/${slug}/CLAUDE.md`);
  console.log("=".repeat(70) + "\n");
  console.log(buildClaudeMd({
    nombre,
    slug,
    direccion,
    modulos: modulosFinal,
    especialidades: especialidadesArg,
  }));

  console.log("\n✅ Onboarding completado.");
  console.log(`\nPróximo paso: mkdir -p clinics/${slug} y guardar el CLAUDE.md de arriba.`);
}

// ============================================================================
// GENERADOR DE CLAUDE.md
// ============================================================================

function buildClaudeMd(opts: {
  nombre: string;
  slug: string;
  direccion: string;
  modulos: ModuleId[];
  especialidades: EspecialidadCodigo[];
}): string {
  const modsActivos = opts.modulos.map((id) => MODULE_REGISTRY[id]);
  const modsInactivos = (Object.keys(MODULE_REGISTRY) as ModuleId[])
    .filter((id) => !opts.modulos.includes(id))
    .map((id) => MODULE_REGISTRY[id]);
  const esp = opts.especialidades.map((id) => ESPECIALIDADES_REGISTRY[id]);
  const tieneContra = esp.some((e) => e.tieneContraindicaciones);

  let md = `# CLAUDE.md — ${opts.nombre} (instancia)\n\n`;
  md += `> Archivo de contexto específico de clínica. Usar cuando el usuario\n`;
  md += `> diga "estoy trabajando para ${opts.nombre}".\n\n`;
  md += `## Identidad\n- Nombre: ${opts.nombre}\n- Slug: \`${opts.slug}\`\n- Dirección: ${opts.direccion}\n\n`;

  md += `## Configuración activa\n\n### Módulos (${modsActivos.length})\n`;
  modsActivos.forEach((m) => {
    md += `- ✅ \`${m.id}\` — ${m.label}\n`;
  });
  md += `\n### Módulos INACTIVOS\n`;
  modsInactivos.forEach((m) => {
    md += `- ❌ \`${m.id}\` — ${m.label} · no implementar\n`;
  });

  md += `\n### Especialidades (${esp.length})\n`;
  if (esp.length === 0) md += `- (ninguna)\n`;
  else esp.forEach((e) => {
    md += `- ✅ \`${e.codigo}\`${e.tieneContraindicaciones ? " — requiere hard-stop contraindicaciones" : ""}\n`;
  });

  md += `\n## Reglas específicas\n\n`;
  md += `1. Solo implementar módulos activos listados arriba.\n`;
  md += `2. Si piden algo de un módulo inactivo, responder "no está habilitado para ${opts.nombre}".\n`;
  if (tieneContra) {
    const nombres = esp.filter((e) => e.tieneContraindicaciones).map((e) => e.label).join(", ");
    md += `3. Hard-stop contraindicaciones obligatorio para: ${nombres}.\n`;
  }

  md += `\n## Referencias\n`;
  md += `- CLAUDE.md raíz (plataforma): \`../../CLAUDE.md\`\n`;
  md += `- Registry: \`../../src/lib/modules/registry.ts\`\n`;

  return md;
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
