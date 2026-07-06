"use server";

import { dbError } from "@/lib/modules/guards";
import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { log } from "@/lib/logger";
import { calcularIMC, clasificarCircunferenciaCintura } from "@/lib/nutricion/antropometria";
import { calcularGrasaCorporal, calcularMasaMagra } from "@/lib/nutricion/pliegues";
import { getBMIDataset, calcularIndicadorPediatrico } from "@/lib/nutricion/zscore";
import { clasificarGestacional } from "@/lib/nutricion/atalah";
import { calcularEdad } from "@/lib/nutricion/edad";
import { parseISO } from "date-fns";
import type { ActionResult } from "@/lib/modules/guards";
import type { AntropometriaRecord, AntropometriaInput } from "@/types/antropometria";

// ── Schema Zod ───────────────────────────────────────────────────────────────

const antropometriaSchema = z.object({
  idPaciente:      z.string().uuid(),
  idClinica:       z.string().uuid(),
  idEncuentro:     z.string().uuid().optional(),
  modo:            z.enum(["adulto", "pediatrico", "gestacional"]),
  peso_kg:         z.number().min(0.5).max(400),
  talla_cm:        z.number().min(20).max(260),
  circ_cintura_cm: z.number().min(20).max(250).optional(),
  circ_cadera_cm:  z.number().min(20).max(250).optional(),
  pliegues: z.record(
    z.enum(["biceps","triceps","subescapular","suprailiaco","pecho","abdomen","muslo","axilar_medio"]),
    z.number().min(1).max(100),
  ).optional(),
  formula_grasa:   z.enum(["durnin_womersley","jackson_pollock_3","jackson_pollock_7","faulkner"]).optional(),
  observaciones:   z.string().max(2000).optional(),
  sexoRegistral:   z.enum(["M","F"]).optional(),
  edadAnios:       z.number().min(1).max(120).optional(),
  edadMeses:        z.number().min(0).max(228).optional(),
  fechaNacimiento:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fur:              z.string().optional(),
  semanaGestacional: z.number().min(4).max(42).optional(),
  imcPregestacional: z.number().min(10).max(80).optional(),
});

// ── getAntropometriaByPaciente ────────────────────────────────────────────────

export async function getAntropometriaByPaciente(
  idPaciente: string,
): Promise<ActionResult<AntropometriaRecord[]>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "Clínica no encontrada." };

  const { data, error } = await supabase
    .from("fce_antropometria")
    .select("*")
    .eq("id_paciente", idPaciente)
    .eq("id_clinica", idClinica)
    .order("registrado_at", { ascending: false })
    .limit(50);

  if (error) {
    log("error", { action: "get_antropometria", id_clinica: idClinica, id_paciente: idPaciente, error });
    return dbError("antropometria", error);
  }

  return { success: true, data: (data ?? []) as AntropometriaRecord[] };
}

// ── registrarAntropometria ────────────────────────────────────────────────────

export async function registrarAntropometria(
  input: AntropometriaInput,
): Promise<ActionResult<AntropometriaRecord>> {
  // Validación Zod
  const parsed = antropometriaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { supabase, user, idClinica } = await requireContext();

  // Verificar id_clinica coincide con el input (defense-in-depth)
  if (idClinica !== input.idClinica) {
    log("warn", { action: "antrop_cross_tenant_attempt", id_clinica: idClinica, detail: "id_clinica no coincide" });
    return { success: false, error: "No autorizado." };
  }

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) return { success: false, error: "Profesional no encontrado." };

  const {
    peso_kg, talla_cm, circ_cintura_cm, pliegues, formula_grasa,
    sexoRegistral, edadAnios, edadMeses, observaciones, modo,
    semanaGestacional, imcPregestacional, fechaNacimiento,
  } = parsed.data;

  // Snapshot de edad al momento del registro — fuente única de verdad para z-score
  // parseISO crea medianoche LOCAL (no UTC) para strings YYYY-MM-DD → evita artefactos DST
  const edadSnapshot = fechaNacimiento
    ? calcularEdad(parseISO(fechaNacimiento), new Date())
    : null;

  // Cálculos server-side
  const resultIMC = calcularIMC(peso_kg, talla_cm);
  const imc = resultIMC?.imc ?? null;
  let clasificacion: string | null = resultIMC?.clasificacion ?? null;

  let riesgo_cintura: string | null = null;
  if (circ_cintura_cm) {
    const sexoCalc = sexoRegistral === 'M' || sexoRegistral === 'F' ? sexoRegistral : undefined;
    riesgo_cintura = clasificarCircunferenciaCintura(circ_cintura_cm, sexoCalc);
  }

  let perc_grasa: number | null = null;
  let masa_magra_kg: number | null = null;
  if (pliegues && formula_grasa && modo === 'adulto') {
    const resultGrasa = calcularGrasaCorporal({
      formula: formula_grasa,
      pliegues,
      sexo: sexoRegistral === 'M' || sexoRegistral === 'F' ? sexoRegistral : undefined,
      edad: edadAnios,
    });
    if (resultGrasa) {
      perc_grasa = resultGrasa.percGrasa;
      masa_magra_kg = calcularMasaMagra(peso_kg, resultGrasa.percGrasa);
    }
  }

  // ── Z-score pediátrico ───────────────────────────────────────────────────────
  let zscore_imc: number | null = null;
  let percentil_imc: number | null = null;
  if (modo === 'pediatrico' && imc !== null && sexoRegistral && edadMeses !== undefined) {
    const indicador = calcularIndicadorPediatrico(
      imc,
      edadMeses,
      getBMIDataset(sexoRegistral, edadMeses),
    );
    if (indicador) {
      zscore_imc   = indicador.z;
      percentil_imc = indicador.percentil;
      clasificacion = indicador.clasificacion;
    }
  }

  // ── Atalah gestacional ───────────────────────────────────────────────────────
  let clasificacion_gestacional: string | null = null;
  const semana_final: number | null = semanaGestacional ?? null;
  let rango_min: number | null = null;
  let rango_max: number | null = null;
  if (modo === 'gestacional' && imc !== null && imcPregestacional != null) {
    const semana = semana_final ?? null;
    if (semana !== null) {
      const res = clasificarGestacional(imcPregestacional, imc, semana);
      clasificacion_gestacional = res.descripcion;
      clasificacion = res.descripcion;
      rango_min = res.rangoGananciaTotal.min;
      rango_max = res.rangoGananciaTotal.max;
    }
  }

  const payload = {
    id_clinica:      idClinica,
    id_paciente:     input.idPaciente,
    id_encuentro:    input.idEncuentro ?? null,
    modo,
    peso_kg,
    talla_cm,
    imc,
    clasificacion,
    circ_cintura_cm:  circ_cintura_cm ?? null,
    circ_cadera_cm:   parsed.data.circ_cadera_cm ?? null,
    riesgo_cintura,
    pliegues:         pliegues ?? null,
    formula_grasa:    formula_grasa ?? null,
    perc_grasa,
    masa_magra_kg,
    edad_meses_registro: edadSnapshot?.mesesTotal ?? null,
    zscore_imc,
    percentil_imc,
    semana_gestacional:     semana_final,
    imc_pregestacional:     imcPregestacional ?? null,
    rango_ganancia_min:     rango_min,
    rango_ganancia_max:     rango_max,
    observaciones:    observaciones ?? null,
    registrado_por:   profesional.id,
  };

  // Suprimir advertencia de variable no usada (solo para clasificacion_gestacional que ya va en `clasificacion`)
  void clasificacion_gestacional;

  const { data, error } = await supabase
    .from("fce_antropometria")
    .insert(payload)
    .select()
    .single();

  if (error) {
    log("error", { action: "registrar_antropometria", id_clinica: idClinica, id_paciente: input.idPaciente, error });
    return dbError("antropometria", error);
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "registrar_antropometria",
    tipoEvento: "create",
    tablaAfectada: "fce_antropometria",
    registroId: data.id,
    idClinica: idClinica!,
    idPaciente: input.idPaciente,
  });
  revalidatePath(`/dashboard/pacientes/${input.idPaciente}`);

  return { success: true, data: data as AntropometriaRecord };
}

// ── eliminarAntropometria ─────────────────────────────────────────────────────

export async function eliminarAntropometria(
  id: string,
  idPaciente: string,
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireContext();

  const { error } = await supabase
    .from("fce_antropometria")
    .delete()
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .eq("id_paciente", idPaciente);

  if (error) {
    log("error", { action: "eliminar_antropometria", id_clinica: idClinica, id_paciente: idPaciente, error });
    return dbError("antropometria", error);
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_antropometria",
    tipoEvento: "delete",
    tablaAfectada: "fce_antropometria",
    registroId: id,
    idClinica: idClinica!,
    idPaciente: idPaciente,
  });
  revalidatePath(`/dashboard/pacientes/${idPaciente}`);

  return { success: true, data: undefined };
}
