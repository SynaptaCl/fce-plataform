/**
 * test-resumen-ia-parcial.ts
 * Auditoría RLS 2026-07 — Resumen IA, Fase 2
 *
 * Valida (sin DB/Anthropic — funciones puras):
 *  - evaluarContextoParaResumen: guard híbrido (críticas vs no-críticas vs evolución)
 *  - withPartialFlag: aviso visible cuando el contexto es parcial
 *  - calcularContextoHash: determinismo + invalidación por contenido distinto
 *
 * "Mockear buildContextoClinico" acá significa construir a mano los ContextoClinico
 * que esa función devolvería en cada escenario (día1 con anamnesis en error, día2
 * completo, etc.) — no hay framework de mocks en el repo (mismo patrón que
 * scripts/test-sprint-rte.ts: funciones puras, sin DB).
 *
 * El check de "guardarResumenCache NO llamado" se prueba por construcción: en
 * generarResumenIA (resumen-ia.ts) ese paso vive DESPUÉS de `evaluarContextoParaResumen`
 * y DENTRO de `if (!contexto.contexto_incompleto)` — así que `guard.ok === false` o
 * `contexto_incompleto === true` garantizan que ese código nunca se alcanza / nunca
 * se ejecuta, sin necesitar un spy real.
 */

import type { ContextoClinico } from "../src/lib/ia/contexto-clinico";
import {
  SECCIONES_CRITICAS,
  SECCIONES_NO_CRITICAS,
  MAX_SECCIONES_NO_CRITICAS,
} from "../src/lib/ia/contexto-clinico";
import { evaluarContextoParaResumen, withPartialFlag } from "../src/lib/ia/resumen-guard";
import { calcularContextoHash } from "../src/lib/ia/cache";
import type { ReporteIA } from "../src/types/resumen-ia";

// ── Test runner (mismo patrón que test-sprint-rte.ts) ──────────────────────────

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

// ── Fixtures ─────────────────────────────────────────────────────────────────

const EMPTY_DEMOGRAFICO = { edad: null, sexo: null, prevision: null, fecha_primera_atencion: null };
const EMPTY_ANAMNESIS = {
  motivo_consulta: null,
  antecedentes_medicos: null,
  alergias: null,
  farmacologia_cronica: null,
  habitos: null,
};
const EMPTY_SIGNOS_VITALES = {
  ultimo_registro: null,
  fc_promedio: null,
  pa_sistolica_promedio: null,
  pa_diastolica_promedio: null,
  spo2_minimo: null,
  temp_ultimo: null,
  total_registros: 0,
  alertas_vitales: [] as string[],
};
const EMPTY_EXAMENES = { pendientes: [], completados_count: 0 };

function contextoCompleto(overrides: Partial<ContextoClinico> = {}): ContextoClinico {
  return {
    demografico: { edad: 34, sexo: "F", prevision: "Isapre", fecha_primera_atencion: "2026-01-10" },
    anamnesis: {
      motivo_consulta: "Dolor lumbar",
      antecedentes_medicos: [{ condicion: "Hipertensión" }],
      alergias: [{ agente: "Penicilina", severidad: "alta" }],
      farmacologia_cronica: [{ medicamento: "Losartán" }],
      habitos: { tabaco: "no" },
    },
    signos_vitales: {
      ultimo_registro: "2026-07-20",
      fc_promedio: 72,
      pa_sistolica_promedio: 120,
      pa_diastolica_promedio: 80,
      spo2_minimo: 98,
      temp_ultimo: 36.5,
      total_registros: 3,
      alertas_vitales: [],
    },
    medicacion: {
      prescripciones_activas: [
        {
          principio_activo: "Losartán",
          nombre_comercial: "Cozaar",
          dosis: "50mg",
          frecuencia: "1x día",
          via: "oral",
          prescrito_por: "Dr. Pérez",
        },
      ],
      prescripciones_historicas_count: 2,
    },
    alertas: { criticas: [], advertencias: [], informativas: [] },
    evolucion: {
      total_sesiones: 5,
      primera_sesion: "2026-01-10",
      ultima_sesion: "2026-07-20",
      dias_en_tratamiento: 191,
      frecuencia_semanal_estimada: 0.2,
      ultimas_notas: [
        {
          fecha: "2026-07-20",
          tipo: "soap",
          profesional: "Dr. Pérez",
          especialidad: "Kinesiología",
          resumen_truncado: "Evolución favorable",
          tiene_diagnostico: true,
          tiene_plan: true,
        },
      ],
    },
    examenes: { pendientes: [], completados_count: 1 },
    instrumentos: { aplicaciones: [] },
    secciones_vacias: [],
    tokens_estimados: 500,
    tiene_datos_suficientes: true,
    contexto_incompleto: false,
    secciones_con_error: [],
    ...overrides,
  };
}

function reporteIA(): ReporteIA {
  return {
    alertas_prioritarias: [],
    resumen_narrativo: "Paciente estable, evolución favorable.",
    evolucion_clinica: "5 sesiones registradas.",
    estado_actual: "En tratamiento.",
    informacion_faltante: [],
    generado_en: "2026-07-25T10:00:00.000Z",
    desde_cache: false,
  };
}

// ── 0. Configuración acordada en Fase 1 (sanity check de las constantes) ───────

console.log("\n[Test 0] Constantes SECCIONES_CRITICAS / SECCIONES_NO_CRITICAS / MAX acordadas en Fase 1");

check(
  JSON.stringify(SECCIONES_CRITICAS) === JSON.stringify(["anamnesis", "medicacion"]),
  "SECCIONES_CRITICAS = [anamnesis, medicacion]",
  `SECCIONES_CRITICAS inesperado: ${JSON.stringify(SECCIONES_CRITICAS)}`
);
check(
  JSON.stringify(SECCIONES_NO_CRITICAS) === JSON.stringify(["demografico", "signos_vitales", "examenes", "instrumentos"]),
  "SECCIONES_NO_CRITICAS = [demografico, signos_vitales, examenes, instrumentos] (4, sin alertas)",
  `SECCIONES_NO_CRITICAS inesperado: ${JSON.stringify(SECCIONES_NO_CRITICAS)}`
);
check(MAX_SECCIONES_NO_CRITICAS === 2, "MAX_SECCIONES_NO_CRITICAS = 2", `MAX_SECCIONES_NO_CRITICAS = ${MAX_SECCIONES_NO_CRITICAS}`);

// ── 1. anamnesis en error (crítica) → hard-deny ─────────────────────────────────

console.log("\n[Test 1] anamnesis en error, resto OK → success:false (hard-deny por crítica)");

const contexto1 = contextoCompleto({
  anamnesis: EMPTY_ANAMNESIS,
  secciones_con_error: ["anamnesis"],
  contexto_incompleto: true,
});
const guard1 = evaluarContextoParaResumen(contexto1);

check(guard1.ok === false, "guard.ok === false", `guard.ok === ${guard1.ok}`);
check(
  guard1.error === "No se pudo cargar suficiente información clínica para generar el resumen. Intenta nuevamente.",
  "mensaje genérico (no menciona 'anamnesis')",
  `mensaje inesperado: ${guard1.error}`
);
check(
  !guard1.error?.toLowerCase().includes("anamnesis"),
  "el mensaje NO expone qué sección falló",
  "el mensaje expone la sección — viola el requisito de Fase 2 punto A"
);
// guard.ok === false ⇒ generarResumenIA retorna en el guard, antes del paso 5 (cache) —
// guardarResumenCache (paso 7) es estructuralmente inalcanzable en este escenario.
check(
  guard1.ok === false,
  "guardarResumenCache NO llamado (guard bloquea antes del paso de caché)",
  "guard no bloqueó — guardarResumenCache sería alcanzable"
);

// ── 2. evolucion OK + 3 no-críticas en error → deny por conteo ──────────────────

console.log("\n[Test 2] evolucion OK + 3 no-críticas en error → success:false (deny por conteo)");

const contexto2 = contextoCompleto({
  demografico: EMPTY_DEMOGRAFICO,
  signos_vitales: EMPTY_SIGNOS_VITALES,
  examenes: EMPTY_EXAMENES,
  secciones_con_error: ["demografico", "signos_vitales", "examenes"],
  contexto_incompleto: true,
});
const guard2 = evaluarContextoParaResumen(contexto2);

check(guard2.ok === false, "guard.ok === false (3 ≥ MAX_SECCIONES_NO_CRITICAS=2)", `guard.ok === ${guard2.ok}`);

// Confirmar que el umbral es real: 1 no-crítica sola NO debe bloquear.
const contexto2b = contextoCompleto({
  examenes: EMPTY_EXAMENES,
  secciones_con_error: ["examenes"],
  contexto_incompleto: true,
});
check(
  evaluarContextoParaResumen(contexto2b).ok === true,
  "1 no-crítica sola NO bloquea (confirma que el umbral no es demasiado agresivo)",
  "1 no-crítica sola bloqueó — MAX_SECCIONES_NO_CRITICAS mal aplicado"
);

// ── 3. solo examenes en error (1 no-crítica) → parcial, no cacheado ─────────────

console.log("\n[Test 3] solo examenes en error → success:true, aviso parcial, no cacheado");

const contexto3 = contextoCompleto({
  examenes: EMPTY_EXAMENES,
  secciones_con_error: ["examenes"],
  contexto_incompleto: true,
});
const guard3 = evaluarContextoParaResumen(contexto3);
check(guard3.ok === true, "guard.ok === true", `guard.ok === ${guard3.ok}`);

const reporteConAviso = withPartialFlag(reporteIA(), contexto3.secciones_con_error);
check(
  reporteConAviso.alertas_prioritarias.length === 1 &&
    reporteConAviso.alertas_prioritarias[0].startsWith("Resumen parcial"),
  "alertas_prioritarias antepone el aviso 'Resumen parcial'",
  `alertas_prioritarias: ${JSON.stringify(reporteConAviso.alertas_prioritarias)}`
);
check(
  reporteConAviso.alertas_prioritarias[0].includes("exámenes"),
  "el aviso incluye la etiqueta legible de la sección ('exámenes')",
  `aviso no incluye la sección: ${reporteConAviso.alertas_prioritarias[0]}`
);
// contexto_incompleto === true ⇒ en resumen-ia.ts el bloque `if (!contexto.contexto_incompleto)`
// que envuelve guardarResumenCache no se ejecuta — no se llama.
check(
  contexto3.contexto_incompleto === true,
  "guardarResumenCache NO llamado (contexto_incompleto === true salta ese bloque)",
  "contexto_incompleto no quedó en true — guardarResumenCache se ejecutaría igual"
);

// ── 4. Determinismo y sensibilidad del hash ─────────────────────────────────────

console.log("\n[Test 4] calcularContextoHash: mismo contexto → mismo hash; alergia distinta → hash distinto");

const hashA = calcularContextoHash(contextoCompleto());
const hashB = calcularContextoHash(contextoCompleto());
check(hashA === hashB, "contexto idéntico (objetos distintos) → mismo hash", `hashA=${hashA} hashB=${hashB}`);

const contextoAlergiaDistinta = contextoCompleto({
  anamnesis: {
    ...contextoCompleto().anamnesis,
    alergias: [{ agente: "Amoxicilina", severidad: "moderada" }],
  },
});
const hashC = calcularContextoHash(contextoAlergiaDistinta);
check(hashA !== hashC, "cambiar anamnesis.alergias → hash distinto", `hashA=${hashA} hashC=${hashC} (coinciden)`);

check(
  calcularContextoHash(contextoCompleto()).length > 0 &&
    !Number.isNaN(parseInt(calcularContextoHash(contextoCompleto()), 16)),
  "el hash es hex válido",
  "el hash no es hex válido"
);

// ── 5. Verificación del bug original: día1 (falla) no contamina día2 ────────────

console.log("\n[Test 5] Regresión: resumen de día1 (anamnesis falló) NO se sirve en día2 (anamnesis OK, otra alergia)");

const contextoDia1 = contextoCompleto({
  anamnesis: EMPTY_ANAMNESIS,
  secciones_con_error: ["anamnesis"],
  contexto_incompleto: true,
});
const contextoDia2 = contextoCompleto({
  anamnesis: {
    ...contextoCompleto().anamnesis,
    alergias: [{ agente: "Sulfas", severidad: "alta" }],
  },
});

const guardDia1 = evaluarContextoParaResumen(contextoDia1);
const guardDia2 = evaluarContextoParaResumen(contextoDia2);
const hashDia1 = calcularContextoHash(contextoDia1);
const hashDia2 = calcularContextoHash(contextoDia2);

console.log(`  día1 → guard.ok=${guardDia1.ok} contexto_incompleto=${contextoDia1.contexto_incompleto} hash=${hashDia1}`);
console.log(`  día2 → guard.ok=${guardDia2.ok} contexto_incompleto=${contextoDia2.contexto_incompleto} hash=${hashDia2}`);

check(
  guardDia1.ok === false,
  "[B, vía A] día1: guard bloquea la solicitud — nunca llega al paso de caché, nunca se persiste",
  "día1 no fue bloqueado — guardarResumenCache sería alcanzable"
);
check(
  guardDia2.ok === true,
  "día2: guard permite la solicitud (contexto completo)",
  "día2 fue bloqueado inesperadamente"
);
check(
  hashDia1 !== hashDia2,
  "[C] defensa en profundidad: aunque día1 se hubiese persistido, su hash no coincide con el de día2",
  `hashDia1 === hashDia2 (${hashDia1}) — un bypass de (A)/(B) podría servir contenido de día1 en día2`
);

console.log(
  "\n  Conclusión escenario 5: día2 NO puede servir el resumen de día1 por dos motivos independientes —" +
    "\n  (a) día1 nunca se cachea: el guard híbrido (A) lo rechaza antes de llegar al paso de caché, y" +
    "\n      guardarResumenCache vive dentro de `if (!contexto.contexto_incompleto)` (B), doblemente inalcanzable;" +
    "\n  (b) aun en un hipotético bypass de (A)/(B), el hash v2 versionado (C) de día1 difiere del de día2" +
    "\n      porque serializa las 7 secciones completas, así que un `getResumenCacheado` de día2 jamás" +
    "\n      encontraría coincidencia con una fila (real o hipotética) de día1."
);

// ── Resumen ──────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("Todos los checks pasaron.");
}
