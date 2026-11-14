/**
 * test-sprint-adj1.ts
 * Sprint ADJ-1 — Adjuntos clínicos: helpers puros (sin DB)
 * Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
 */

import {
  esMimePermitido,
  limiteParaMime,
  detectarMime,
  magicBytesValidos,
  construirStoragePath,
  sanitizarNombreArchivo,
  hoySantiago,
  LIMITE_IMAGEN_BYTES,
  LIMITE_PDF_BYTES,
  BUCKET_ADJUNTOS,
} from "../src/lib/adjuntos/archivo";
import {
  AdjuntoInputSchema,
  AdjuntoInputConLimiteSchema,
  ValidarAdjuntoSchema,
  AnularAdjuntoSchema,
} from "../src/lib/adjuntos/validations";
import { CATEGORIA_ADJUNTO_LABELS, MIMES_ADJUNTO } from "../src/types/adjunto";

const errors: string[] = [];
let passCount = 0;

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
  passCount++;
}
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  errors.push(msg);
}
function check(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) pass(passMsg);
  else fail(failMsg);
}

// Buffers de prueba
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]); // "RIFF"....WEBP"VP8 "
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // "MZ" — binario Windows
const WEBP_TRUNCADO = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00]); // sin "WEBP" en 8..11
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // "GIF89a"

console.log("\n[Test 1] Whitelist MIME y límites por tipo");
check(esMimePermitido("image/jpeg"), "image/jpeg permitido", "image/jpeg debería estar permitido");
check(esMimePermitido("application/pdf"), "application/pdf permitido", "application/pdf debería estar permitido");
check(!esMimePermitido("application/msword"), "application/msword rechazado", "application/msword no debería estar permitido");
check(!esMimePermitido("image/gif"), "image/gif rechazado", "image/gif no debería estar permitido");
check(limiteParaMime("image/png") === LIMITE_IMAGEN_BYTES, "PNG limita a 8MB", "Límite de PNG incorrecto");
check(limiteParaMime("application/pdf") === LIMITE_PDF_BYTES, "PDF limita a 15MB", "Límite de PDF incorrecto");
check(limiteParaMime("application/x-msdownload") === null, "MIME desconocido → null", "MIME desconocido debería retornar null");

console.log("\n[Test 2] Magic bytes — detectarMime");
check(detectarMime(JPEG) === "image/jpeg", "detecta JPEG real", "no detectó JPEG");
check(detectarMime(PNG) === "image/png", "detecta PNG real", "no detectó PNG");
check(detectarMime(WEBP) === "image/webp", "detecta WEBP (RIFF....WEBP)", "no detectó WEBP");
check(detectarMime(PDF) === "application/pdf", "detecta PDF (%PDF-)", "no detectó PDF");
check(detectarMime(EXE) === null, "EXE (MZ) → null", "EXE no debería detectarse como permitido");
check(detectarMime(WEBP_TRUNCADO) === null, "WEBP truncado sin firma → null", "WEBP truncado no debería pasar");
check(detectarMime(GIF) === null, "GIF → null (no permitido)", "GIF no debería detectarse");

console.log("\n[Test 3] Magic bytes — magicBytesValidos (contenido vs declarado)");
check(magicBytesValidos(PDF, "application/pdf"), "PDF declarado y real → válido", "PDF válido rechazado");
check(!magicBytesValidos(EXE, "application/pdf"), "EXE renombrado a .pdf → inválido", "EXE renombrado pasó como PDF");
check(!magicBytesValidos(JPEG, "image/png"), "JPEG declarado como PNG → inválido", "JPEG/PNG cruzado pasó");
check(!magicBytesValidos(PNG, "image/gif"), "MIME no permitido → inválido", "MIME no permitido pasó");

console.log("\n[Test 4] sanitizarNombreArchivo");
check(sanitizarNombreArchivo("radiografia_torax.pdf") === "radiografia_torax.pdf", "nombre simple intacto", "nombre simple fue alterado");
check(sanitizarNombreArchivo("..\\..\\windows\\system32\\evil.dll") === "evil.dll", "path traversal Windows → basename", "path traversal Windows no fue neutralizado");
check(sanitizarNombreArchivo("../../etc/passwd") === "passwd", "path traversal Unix → basename", "path traversal Unix no fue neutralizado");
check(sanitizarNombreArchivo(".hidden") === "hidden", "punto inicial strip", "punto inicial no fue removido");
check(!/[\u0000-\u001f]/.test(sanitizarNombreArchivo("a\u0000b\u001fc.txt")), "caracteres de control removidos", "control chars sobrevivieron");
check(sanitizarNombreArchivo("x".repeat(500)).length === 180, "truncate a 180 chars", "no truncó a 180");
check(sanitizarNombreArchivo("   ") === "archivo", "fallback 'archivo' si queda vacío", "fallback no aplicó");
check(sanitizarNombreArchivo("") === "archivo", "vacío → 'archivo'", "vacío no hizo fallback");

console.log("\n[Test 5] construirStoragePath");
{
  const CLINICA = "11111111-1111-1111-1111-111111111111";
  const PACIENTE = "22222222-2222-2222-2222-222222222222";
  const p = construirStoragePath(CLINICA, PACIENTE, "pdf");
  const segs = p.split("/");
  check(segs.length === 3, "path de 3 segmentos {clinica}/{paciente}/{uuid.ext}", `path con ${segs.length} segmentos`);
  check(segs[0] === CLINICA, "primer segmento = id_clinica (tenant para RLS storage)", "primer segmento no es id_clinica");
  check(segs[1] === PACIENTE, "segundo segmento = id_paciente", "segundo segmento no es id_paciente");
  check(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(segs[2]), "tercer segmento = uuid.pdf (sin nombre original)", "tercer segmento no es uuid.ext");
  check(construirStoragePath(CLINICA, PACIENTE, "pdf") !== p, "cada llamada genera uuid distinto", "uuid repetido entre llamadas");
}

console.log("\n[Test 6] Zod — AdjuntoInputSchema");
{
  const hoy = hoySantiago();
  const base = {
    // UUID v4 válido (Zod v4 valida RFC 9562: versión 1-8 + variante 8/9/a/b)
    patientId: "33333333-3333-4333-8333-333333333333",
    categoria: "resultado_examen" as const,
    descripcion: "Hemograma traído por el paciente",
    nombreArchivoOriginal: "hemograma.pdf",
    mimeDeclarado: "application/pdf",
    tamano: 500_000,
    fechaDocumento: hoy,
    idOrdenExamen: null,
    idEncuentro: null,
  };
  check(AdjuntoInputSchema.safeParse(base).success, "input válido pasa", "input válido fue rechazado");
  check(
    !AdjuntoInputSchema.safeParse({ ...base, categoria: "radiografia" }).success,
    "categoría fuera del enum rechazada",
    "categoría inválida pasó"
  );
  check(
    !AdjuntoInputSchema.safeParse({ ...base, fechaDocumento: "2999-01-01" }).success,
    "fecha futura rechazada",
    "fecha futura pasó"
  );
  check(
    !AdjuntoInputSchema.safeParse({ ...base, tamano: 16 * 1024 * 1024 }).success,
    "tamano > 15MB rechazado por schema base",
    "tamano 16MB pasó el schema base"
  );
  check(
    !AdjuntoInputSchema.safeParse({ ...base, mimeDeclarado: "application/msword" }).success,
    "MIME no permitido rechazado",
    "MIME msword pasó"
  );
  check(
    !AdjuntoInputSchema.safeParse({ ...base, descripcion: "x".repeat(501) }).success,
    "descripción >500 rechazada",
    "descripción de 501 pasó"
  );
  // Límite por tipo: imagen 8MB
  const imgBase = { ...base, mimeDeclarado: "image/jpeg", tamano: LIMITE_IMAGEN_BYTES + 1 };
  check(AdjuntoInputSchema.safeParse(imgBase).success, "imagen 8MB+1 pasa schema base (lo frena el límite por tipo)", "schema base rechazó imagen 8MB+1 inesperadamente");
  check(!AdjuntoInputConLimiteSchema.safeParse(imgBase).success, "imagen >8MB rechazada por límite por tipo", "imagen 8MB+1 pasó el límite por tipo");
  check(
    AdjuntoInputConLimiteSchema.safeParse({ ...base, mimeDeclarado: "application/pdf", tamano: LIMITE_PDF_BYTES }).success,
    "PDF de exactamente 15MB aceptado",
    "PDF de 15MB exacto fue rechazado"
  );
}

console.log("\n[Test 7] Zod — validar/anular");
check(ValidarAdjuntoSchema.safeParse({ adjuntoId: "44444444-4444-4444-8444-444444444444", estadoResultados: "completo" }).success, "validar con estadoResultados válido", "validar válido fue rechazado");
check(ValidarAdjuntoSchema.safeParse({ adjuntoId: "44444444-4444-4444-8444-444444444444", estadoResultados: "pendiente" }).success === false, "estadoResultados 'pendiente' rechazado (solo parcial|completo)", "estadoResultados pendiente pasó");
check(AnularAdjuntoSchema.safeParse({ adjuntoId: "44444444-4444-4444-8444-444444444444", motivo: "ok" }).success === false, "motivo <5 chars rechazado", "motivo corto pasó");
check(AnularAdjuntoSchema.safeParse({ adjuntoId: "44444444-4444-4444-8444-444444444444", motivo: "Documento ilegible, se pide copia al paciente" }).success, "anular con motivo válido pasa", "anular válido fue rechazado");

console.log("\n[Test 8] Consistencia de catálogos");
{
  const cats = Object.keys(CATEGORIA_ADJUNTO_LABELS);
  check(cats.length === 3 && cats.every((c) => CATEGORIA_ADJUNTO_LABELS[c as keyof typeof CATEGORIA_ADJUNTO_LABELS].length > 0), "3 categorías con label", "categorías/labels inconsistentes");
  check(MIMES_ADJUNTO.length === 4, "4 MIMEs permitidos", `se esperaban 4 MIMEs, hay ${MIMES_ADJUNTO.length}`);
  check(BUCKET_ADJUNTOS === "adjuntos-clinicos", "nombre de bucket correcto", "nombre de bucket incorrecto");
}

console.log("\n────────────────────────────────────────────────────────────");
if (errors.length === 0) {
  console.log(`Resultado: ${passCount} checks pasaron, 0 fallaron`);
  console.log("Todos los checks pasaron.");
  process.exit(0);
} else {
  console.error(`Resultado: ${passCount} pasaron, ${errors.length} fallaron`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
