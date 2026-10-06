/**
 * test-rehab-nota-simple.ts — resolución del formato de nota en rehab (puro, sin DB).
 * USO: npm run test:rehab-nota-simple
 */
import { resolverFormatoNota, type ResolverFormatoInput } from "../src/lib/modules/formato-nota";
import { ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";

let fallos = 0;
function eq(nombre: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}${ok ? "" : ` → got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
}
const base: ResolverFormatoInput = { permiteNotaSimple: true, tieneSoap: false, tieneNotaClinica: false };

eq("default = soap", resolverFormatoNota(base), { formato: "soap", bloqueado: false });
eq("preferencia nota_clinica", resolverFormatoNota({ ...base, preferencia: "nota_clinica" }), { formato: "nota_clinica", bloqueado: false });
eq("url gana a preferencia", resolverFormatoNota({ ...base, formatoUrl: "soap", preferencia: "nota_clinica" }), { formato: "soap", bloqueado: false });
eq("valor inválido ignorado", resolverFormatoNota({ ...base, formatoUrl: "xx", preferencia: "yy" }), { formato: "soap", bloqueado: false });
eq("soap existente bloquea", resolverFormatoNota({ ...base, tieneSoap: true, formatoUrl: "nota_clinica" }), { formato: "soap", bloqueado: true });
eq("nota existente bloquea", resolverFormatoNota({ ...base, tieneNotaClinica: true, formatoUrl: "soap" }), { formato: "nota_clinica", bloqueado: true });
eq("sin permiso ignora url/pref", resolverFormatoNota({ ...base, permiteNotaSimple: false, formatoUrl: "nota_clinica", preferencia: "nota_clinica" }), { formato: "soap", bloqueado: false });
eq("sin permiso pero nota legada", resolverFormatoNota({ ...base, permiteNotaSimple: false, tieneNotaClinica: true }), { formato: "nota_clinica", bloqueado: true });

for (const esp of ["Kinesiología", "Fonoaudiología", "Masoterapia", "Terapia Ocupacional"]) {
  eq(`${esp} permiteNotaSimple`, ESPECIALIDAD_CONFIG[esp].permiteNotaSimple, true);
}
eq("Medicina General sin flag", ESPECIALIDAD_CONFIG["Medicina General"].permiteNotaSimple ?? false, false);

console.log(fallos ? `\n${fallos} fallo(s)` : "\nOK");
process.exit(fallos ? 1 : 0);
