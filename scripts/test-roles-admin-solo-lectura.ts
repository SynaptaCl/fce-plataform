/**
 * test-roles-admin-solo-lectura.ts
 * Roles admin/director/superadmin = solo lectura administrativa (spec 2026-09-29).
 *
 * Sin DB — valida:
 *  - Constantes de roles en registry.ts (solo `profesional` escribe/firma; `coordinador` eliminado).
 *  - Migration 20260929_01: es_profesional_clinico exige rol='profesional' y las tablas
 *    de contenido clínico dejaron de usar tiene_acceso_clinico() para escritura.
 *  - adendas.ts: sin override de director; errata/anulación exclusivas del autor.
 *
 * La verificación contra RLS real (admin no inserta, no lee SOAP) se hace tras aplicar la
 * migration, con usuarios de prueba — ver spec §5.10.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROLES_QUE_PUEDEN_ESCRIBIR,
  ROLES_QUE_PUEDEN_FIRMAR,
  ROLES_QUE_CONFIGURAN,
  ROLES_CON_ACCESO_FCE,
} from "../src/lib/modules/registry";

const errors: string[] = [];
let passCount = 0;
function check(cond: boolean, ok: string, ko: string) {
  if (cond) {
    console.log(`  ✓ ${ok}`);
    passCount++;
  } else {
    console.error(`  ✗ ${ko}`);
    errors.push(ko);
  }
}
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

console.log("\n[1] registry.ts");
const escribir = ROLES_QUE_PUEDEN_ESCRIBIR as string[];
check(escribir.length === 1 && escribir[0] === "profesional", "solo profesional escribe", `ROLES_QUE_PUEDEN_ESCRIBIR = ${escribir}`);
for (const r of ["admin", "director", "superadmin", "recepcionista"]) {
  check(!escribir.includes(r), `${r} no escribe`, `${r} aparece en ROLES_QUE_PUEDEN_ESCRIBIR`);
}
check((ROLES_QUE_PUEDEN_FIRMAR as string[]).join() === "profesional", "solo profesional firma", "ROLES_QUE_PUEDEN_FIRMAR alterado");
check(!(ROLES_CON_ACCESO_FCE as string[]).includes("recepcionista"), "recepcionista sin acceso FCE", "recepcionista con acceso FCE");
check(!(ROLES_CON_ACCESO_FCE as string[]).includes("coordinador"), "coordinador eliminado", "coordinador sigue en ROLES_CON_ACCESO_FCE");
for (const r of ["admin", "director", "superadmin"]) {
  check((ROLES_QUE_CONFIGURAN as string[]).includes(r), `${r} configura`, `${r} perdió configuración`);
}
check(!/coordinador/.test(read("src/lib/modules/registry.ts")), "registry sin 'coordinador'", "registry aún menciona coordinador");

console.log("\n[2] migration 20260929_01");
const sqlRaw = read("supabase/migrations/20260929_01_rls_separar_lectura_admin_escritura_profesional.sql");
// Sin comentarios de línea: los chequeos miran solo SQL ejecutable.
const sql = sqlRaw.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join(" ");
check(/au\.rol = 'profesional'/.test(sql), "es_profesional_clinico exige rol profesional", "función no exige rol='profesional'");
const contenidoClinico = [
  "fce_notas_soap", "fce_notas_clinicas", "fce_anamnesis", "fce_evaluaciones", "fce_signos_vitales",
  "fce_antropometria", "instrumentos_aplicados", "fce_odontograma", "fce_periograma", "fce_fichas_esteticas",
];
for (const t of contenidoClinico) {
  const tiene = new RegExp(String.raw`ON public\.${t}\b[^;]*es_profesional_clinico`).test(sql);
  check(tiene, `${t}: policy con es_profesional_clinico`, `${t}: sin es_profesional_clinico en migration`);
}
check(!/CREATE POLICY pacientes_delete/.test(sql), "pacientes sin policy DELETE", "pacientes aún permite DELETE");
check(/presupuestos_insert ON public\.fce_presupuestos FOR INSERT\s+WITH CHECK \(es_profesional_clinico/.test(sql), "presupuestos: insert solo profesional", "presupuestos insert sin es_profesional_clinico");
const presupuestosSql = sql.split("DROP POLICY IF EXISTS presupuestos_select")[1]?.split("DROP POLICY IF EXISTS pacientes_by_clinica")[0] ?? "";
check(presupuestosSql.length > 0 && !/get_clinica_ids_for_user/.test(presupuestosSql), "presupuestos ya no usa get_clinica_ids_for_user", "presupuestos conserva get_clinica_ids_for_user");

console.log("\n[3] adendas.ts");
const adendas = read("src/app/actions/adendas.ts");
check(!/ROLES_AUTORIZADORES|esAutorizador|overrideMotivo/.test(adendas), "sin override director/admin", "adendas.ts conserva override");
check(/Solo el autor original puede corregir/.test(adendas), "errata: solo autor", "errata sin gate de autor");
check(/Solo el autor original puede anular/.test(adendas), "anulación: solo autor", "anulación sin gate de autor");
check(/VENTANA_ERRATA_MS/.test(adendas) && /ventana de corrección está cerrada/.test(adendas), "errata cierra a las 72 h", "errata sin cierre de ventana");

console.log(`\n${passCount} ok, ${errors.length} fallas`);
if (errors.length) process.exit(1);
