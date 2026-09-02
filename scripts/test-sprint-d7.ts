/**
 * test-sprint-d7.ts
 * Sprint D7 — cierre del módulo dental (funciones puras, sin DB).
 *
 * Valida:
 *  - lib/dental/fdi.ts: notación FDI (permanente + temporal), cuadrantes, labels.
 *  - lib/dental/periograma.ts: índices calculados (sangrado, profundidad, sitios
 *    patológicos) e inicialización de datos por pieza.
 *  - lib/dental/plan.ts: progreso, presupuesto (total/realizado) y priorización
 *    del próximo procedimiento.
 *  - Cableado de especialidad Odontología: modelo odontológico, ruta /dental,
 *    getEspecialidadConfig como única fuente de verdad (regla 18 CLAUDE.md).
 *
 * No cubre: exportarFichaCompletaPdf (server action con DB) ni renderFichaCompletaPdf
 * end-to-end — eso requiere datos reales, ver AMB-1-ambient-scribe.md como precedente
 * de qué queda para verificación manual/piloto.
 */

import {
  PIEZAS_ADULTO,
  PIEZAS_NINO,
  validarPieza,
  esPermanente,
  esTemporal,
  getCuadrante,
  getPiezasCuadrante,
  getLabelPieza,
} from "../src/lib/dental/fdi";
import {
  esMolar,
  calcularIndiceSangrado,
  calcularProfundidadMedia,
  calcularSitiosPatologicos,
  crearPiezaVacia,
  initDatos,
  meanOf,
  sondajeColor,
} from "../src/lib/dental/periograma";
import {
  calcularProgreso,
  calcularPresupuestoTotal,
  calcularMontoRealizado,
  proximoProcedimiento,
} from "../src/lib/dental/plan";
import { getEspecialidadConfig, ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";
import { getModeloDeEspecialidad, getRutaEncuentro } from "../src/lib/modules/modelos";
import type { PeriogramaPiezaDatos } from "../src/types/periograma";
import type { PlanTratamientoItem } from "../src/types/plan-tratamiento";

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

// ── fdi.ts — numeración FDI ──────────────────────────────────────────────────
console.log("\nfdi.ts — notación FDI (ISO 3950)");

check(PIEZAS_ADULTO.length === 32, "32 piezas permanentes", `esperaba 32, obtuvo ${PIEZAS_ADULTO.length}`);
check(PIEZAS_NINO.length === 20, "20 piezas temporales", `esperaba 20, obtuvo ${PIEZAS_NINO.length}`);

check(validarPieza(11) === true, "11 (incisivo central superior derecho) es válida", "11 no reconocida como válida");
check(validarPieza(48) === true, "48 (tercer molar inferior derecho) es válida", "48 no reconocida como válida");
check(validarPieza(55) === true, "55 (temporal) es válida", "55 (temporal) no reconocida como válida");
check(validarPieza(19) === false, "19 (cuadrante 1 fuera de rango) es inválida", "19 tratada como válida — bug");
check(validarPieza(0) === false, "0 es inválida", "0 tratada como válida");
check(validarPieza(99) === false, "99 es inválida", "99 tratada como válida");

check(esPermanente(16) === true, "16 es permanente", "16 no reconocida como permanente");
check(esPermanente(55) === false, "55 (temporal) NO es permanente", "55 tratada como permanente — bug");
check(esTemporal(55) === true, "55 es temporal", "55 no reconocida como temporal");
check(esTemporal(16) === false, "16 (permanente) NO es temporal", "16 tratada como temporal — bug");

check(getCuadrante(11) === 1, "pieza 11 → cuadrante 1", `obtuvo cuadrante ${getCuadrante(11)}`);
check(getCuadrante(28) === 2, "pieza 28 → cuadrante 2", `obtuvo cuadrante ${getCuadrante(28)}`);
check(getCuadrante(38) === 3, "pieza 38 → cuadrante 3", `obtuvo cuadrante ${getCuadrante(38)}`);
check(getCuadrante(48) === 4, "pieza 48 → cuadrante 4", `obtuvo cuadrante ${getCuadrante(48)}`);
check(getCuadrante(75) === 7, "pieza 75 (temporal) → cuadrante 7", `obtuvo cuadrante ${getCuadrante(75)}`);

check(
  getPiezasCuadrante(1).length === 8,
  "cuadrante 1 tiene 8 piezas",
  `obtuvo ${getPiezasCuadrante(1).length}`
);
check(
  getPiezasCuadrante(1).every((p) => p >= 11 && p <= 18),
  "todas las piezas del cuadrante 1 están en rango 11-18",
  "alguna pieza del cuadrante 1 fuera de rango — bug"
);

check(
  getLabelPieza(16) === "Primer molar superior derecho",
  "label de pieza 16 correcto",
  `obtuvo "${getLabelPieza(16)}"`
);
check(
  getLabelPieza(55) === "Segundo molar temporal superior derecho",
  "label de pieza 55 (temporal) correcto",
  `obtuvo "${getLabelPieza(55)}"`
);
check(
  getLabelPieza(999) === "Pieza 999",
  "pieza inexistente cae a fallback genérico (nunca undefined en el PDF)",
  `obtuvo "${getLabelPieza(999)}" — el fallback rompería el export a PDF`
);

// ── periograma.ts — índices calculados ───────────────────────────────────────
console.log("\nperiograma.ts — índices clínicos");

check(esMolar(16) === true, "16 es molar", "16 no reconocida como molar");
check(esMolar(11) === false, "11 (incisivo) NO es molar", "11 tratada como molar — bug");

const piezaVacia = crearPiezaVacia(16);
check(piezaVacia.pieza === 16, "crearPiezaVacia asigna la pieza correcta", "pieza incorrecta en crearPiezaVacia");
check(
  piezaVacia.sondaje.vestibular.every((v) => v === 0) && piezaVacia.sondaje.lingual.every((v) => v === 0),
  "crearPiezaVacia inicializa sondaje en 0 (sin falsos positivos clínicos)",
  "sondaje no inicializado en 0 — riesgo de dato clínico falso"
);
check(piezaVacia.furca === null, "crearPiezaVacia inicializa furca en null", "furca no inicializada en null");

check(calcularIndiceSangrado([]) === 0, "índice de sangrado sin datos → 0", "índice de sangrado sin datos no es 0");

const datosSinSangrado: PeriogramaPiezaDatos[] = [
  { ...crearPiezaVacia(16) },
  { ...crearPiezaVacia(17) },
];
check(
  calcularIndiceSangrado(datosSinSangrado) === 0,
  "sin sitios sangrantes → índice 0%",
  `esperaba 0, obtuvo ${calcularIndiceSangrado(datosSinSangrado)}`
);

const piezaConSangrado = crearPiezaVacia(16);
piezaConSangrado.sangrado.vestibular = [true, false, false];
piezaConSangrado.sangrado.lingual = [false, false, false];
// 1 de 6 sitios sangrando (3 vestibular + 3 lingual) = 16.7%
check(
  calcularIndiceSangrado([piezaConSangrado]) === 16.7,
  "1/6 sitios sangrando → 16.7%",
  `esperaba 16.7, obtuvo ${calcularIndiceSangrado([piezaConSangrado])}`
);

check(
  calcularProfundidadMedia([]) === 0,
  "profundidad media sin datos → 0",
  "profundidad media sin datos no es 0"
);
const piezaConSondaje = crearPiezaVacia(16);
piezaConSondaje.sondaje.vestibular = [3, 4, 5];
piezaConSondaje.sondaje.lingual = [0, 0, 0]; // ceros se excluyen del promedio (sitio no medido)
// promedio de [3,4,5] (los 0 se excluyen) = 4
check(
  calcularProfundidadMedia([piezaConSondaje]) === 4,
  "profundidad media excluye sitios en 0 (no medidos, no 'sanos')",
  `esperaba 4, obtuvo ${calcularProfundidadMedia([piezaConSondaje])} — los ceros no deben promediarse como profundidad real`
);

check(
  calcularSitiosPatologicos([]) === 0,
  "sitios patológicos sin datos → 0",
  "sitios patológicos sin datos no es 0"
);
const piezaConBolsa = crearPiezaVacia(16);
piezaConBolsa.sondaje.vestibular = [6, 3, 2];
piezaConBolsa.sondaje.lingual = [4, 1, 0];
// ≥4mm: 6, 4 → 2 sitios patológicos
check(
  calcularSitiosPatologicos([piezaConBolsa]) === 2,
  "cuenta solo sitios ≥4mm como patológicos (umbral clínico estándar)",
  `esperaba 2, obtuvo ${calcularSitiosPatologicos([piezaConBolsa])}`
);

const existentes: PeriogramaPiezaDatos[] = [piezaConSangrado];
const mapa = initDatos([16, 17], existentes);
check(
  mapa[16] === piezaConSangrado,
  "initDatos preserva datos existentes de una pieza (no los pisa con vacío)",
  "initDatos sobrescribió datos existentes — perdería registro clínico real"
);
check(
  mapa[17].pieza === 17 && mapa[17].sondaje.vestibular.every((v) => v === 0),
  "initDatos crea vacía la pieza sin datos previos",
  "initDatos no inicializó correctamente pieza sin datos previos"
);

check(meanOf([3, 4, 5]) === 4, "meanOf calcula promedio simple", `obtuvo ${meanOf([3, 4, 5])}`);
check(meanOf([0, 0, 0]) === 0, "meanOf de ceros → 0", `obtuvo ${meanOf([0, 0, 0])}`);

check(sondajeColor(0) === "none", "sondaje 0 → none", `obtuvo ${sondajeColor(0)}`);
check(sondajeColor(3) === "green", "sondaje 3mm → green (normal)", `obtuvo ${sondajeColor(3)}`);
check(sondajeColor(4) === "amber", "sondaje 4mm → amber (umbral patológico)", `obtuvo ${sondajeColor(4)}`);
check(sondajeColor(5) === "amber", "sondaje 5mm → amber", `obtuvo ${sondajeColor(5)}`);
check(sondajeColor(6) === "red", "sondaje 6mm → red (severo)", `obtuvo ${sondajeColor(6)}`);

// ── plan.ts — progreso y presupuesto del plan de tratamiento ────────────────
console.log("\nplan.ts — plan de tratamiento");

function item(overrides: Partial<PlanTratamientoItem>): PlanTratamientoItem {
  return {
    id: overrides.id ?? "item-1",
    id_plan: "plan-1",
    id_clinica: "clinica-1",
    id_prestacion: overrides.id_prestacion ?? null,
    procedimiento: overrides.procedimiento ?? "Destartraje",
    descripcion: null,
    pieza: overrides.pieza ?? null,
    superficie: null,
    orden: overrides.orden ?? 0,
    prioridad: overrides.prioridad ?? "normal",
    estado: overrides.estado ?? "pendiente",
    id_encuentro_realizado: null,
    realizado_at: null,
    realizado_por: null,
    notas: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// PRE-1 F8: los totales del plan derivan del presupuesto M11, no de valor_unitario
const PRESUPUESTO_M11 = {
  total_clp: 50000,
  items: [
    { id_prestacion: "prest-1", pieza: 16, total_linea_clp: 30000 },
    { id_prestacion: "prest-2", pieza: null, total_linea_clp: 20000 },
  ],
};

check(calcularProgreso([]) === 0, "progreso sin items → 0%", "progreso sin items no es 0");
check(
  calcularProgreso([item({ estado: "completado" }), item({ id: "2", estado: "pendiente" })]) === 50,
  "1 de 2 completado → 50%",
  `esperaba 50, obtuvo ${calcularProgreso([item({ estado: "completado" }), item({ id: "2", estado: "pendiente" })])}`
);

check(
  calcularPresupuestoTotal(PRESUPUESTO_M11) === 50000,
  "presupuesto total = total_clp del presupuesto M11 generado",
  "presupuesto total no lee el M11"
);
check(calcularPresupuestoTotal(null) === 0, "sin presupuesto M11 → 0", "sin M11 no es 0");
check(
  calcularMontoRealizado(
    [
      item({ id_prestacion: "prest-1", pieza: 16, estado: "completado" }),
      item({ id: "2", id_prestacion: "prest-2", estado: "pendiente" }),
    ],
    PRESUPUESTO_M11,
  ) === 30000,
  "monto realizado suma SOLO items completados con match en el M11 (no confundir con presupuesto total)",
  "monto realizado incluyó items no completados — sobreestimaría cobro al paciente"
);

const pendientesConPrioridad = [
  item({ id: "baja", prioridad: "baja", orden: 0 }),
  item({ id: "urgente", prioridad: "urgente", orden: 1 }),
  item({ id: "alta", prioridad: "alta", orden: 2 }),
];
check(
  proximoProcedimiento(pendientesConPrioridad)?.id === "urgente",
  "próximo procedimiento respeta prioridad clínica (urgente antes que orden de creación)",
  `esperaba "urgente", obtuvo "${proximoProcedimiento(pendientesConPrioridad)?.id}" — riesgo de postergar un caso urgente`
);
check(
  proximoProcedimiento([item({ estado: "completado" }), item({ id: "2", estado: "cancelado" })]) === null,
  "sin items pendientes/en_progreso → null (no sugiere nada ya cerrado)",
  "proximoProcedimiento devolvió un item completado/cancelado — bug"
);
check(
  proximoProcedimiento([
    item({ id: "en-progreso", estado: "en_progreso", prioridad: "baja", orden: 5 }),
    item({ id: "pendiente-alta", estado: "pendiente", prioridad: "alta", orden: 0 }),
  ])?.id === "pendiente-alta",
  "en_progreso también se considera 'próximo' pero prioridad manda sobre estado",
  "no priorizó correctamente entre pendiente y en_progreso"
);

// ── Cableado de especialidad Odontología ─────────────────────────────────────
console.log("\nCableado — Odontología en getEspecialidadConfig / modelos.ts");

check(
  getEspecialidadConfig("Odontología").modelo === "odontologico",
  "Odontología → modelo odontologico",
  `obtuvo modelo "${getEspecialidadConfig("Odontología").modelo}"`
);
check(
  getModeloDeEspecialidad("Odontología") === "odontologico",
  "getModeloDeEspecialidad('Odontología') === 'odontologico'",
  `obtuvo "${getModeloDeEspecialidad("Odontología")}"`
);
check(
  getRutaEncuentro("odontologico", "pac-1", "enc-1") === "/dashboard/pacientes/pac-1/encuentro/enc-1/dental",
  "modelo odontologico enruta a /dental",
  `obtuvo "${getRutaEncuentro("odontologico", "pac-1", "enc-1")}"`
);
check(
  getEspecialidadConfig("Odontología").tieneContraindicaciones === true,
  "Odontología tiene hard-stop de contraindicaciones (regla 9 CLAUDE.md)",
  "Odontología sin tieneContraindicaciones=true — hard-stop clínico faltante"
);
check(
  getEspecialidadConfig("Odontología").diagnostico?.tipo === "icd11_mms",
  "Odontología expone bloque diagnóstico ICD-11 (regla DX1)",
  "Odontología sin bloque diagnóstico ICD-11 configurado"
);

// No debe existir ningún `if (especialidad === 'Odontología')` disfrazado en otras
// especialidades — el modelo odontológico es exclusivo de Odontología (regla 18).
const otrasConModeloOdontologico = Object.entries(ESPECIALIDAD_CONFIG).filter(
  ([nombre, cfg]) => nombre !== "Odontología" && cfg.modelo === "odontologico"
);
check(
  otrasConModeloOdontologico.length === 0,
  "modelo odontologico es exclusivo de Odontología en el catálogo",
  `otras especialidades comparten modelo odontologico: ${otrasConModeloOdontologico.map(([n]) => n).join(", ")}`
);

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron. Sprint D7 (lógica dental pura + cableado) validado.");
  process.exit(0);
}
