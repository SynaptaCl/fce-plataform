"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dbError } from "@/lib/modules/guards";
import { consentSchema, PARENTESCO_REPRESENTANTE_LABELS, type ParentescoRepresentante } from "@/lib/validations";
import { formatRut } from "@/lib/run-validator";
import { validarFirmaDataUrl, hashConsentimiento } from "@/lib/consentimientos/firma";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";
import type { Consent } from "@/types";

export async function getConsentimientos(
  patientId: string
): Promise<ActionResult<Consent[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  const { data, error } = await supabase
    .from("fce_consentimientos")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });
  if (error) return dbError("consentimiento", error);
  return { success: true, data: data as Consent[] };
}

/**
 * T5 (Fase 0 hotfix M5): interpola los datos del representante legal en el
 * `contenido` ANTES del INSERT — server-side, nunca confiar en el contenido
 * armado por el cliente. Así el representante identificado queda cubierto por
 * la huella SHA-256 (calculada al firmar sobre este contenido) y por el
 * trigger de inmutabilidad post-firma.
 */
function interpolarRepresentante(
  contenido: string,
  representante: { nombre: string; rut: string; parentesco: ParentescoRepresentante }
): string {
  return contenido
    .replace(
      /^Nombre del representante legal: _+$/m,
      `Nombre del representante legal: ${representante.nombre}`
    )
    .replace(
      /^Parentesco con el\/la paciente: _+$/m,
      `Parentesco con el/la paciente: ${PARENTESCO_REPRESENTANTE_LABELS[representante.parentesco]}`
    )
    .replace(
      /^RUT del representante legal: _+$/m,
      `RUT del representante legal: ${formatRut(representante.rut)}`
    );
}

export async function createConsentimiento(
  patientId: string,
  formData: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = consentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  let contenido = parsed.data.contenido;
  if (parsed.data.tipo === "menores") {
    // Zod (superRefine) garantiza que los tres campos llegan y el RUT es válido;
    // el guard explícito satisface a TS sin non-null assertions.
    const { nombre_representante, rut_representante, parentesco } = parsed.data;
    if (!nombre_representante || !rut_representante || !parentesco) {
      return {
        success: false,
        error: "Faltan datos del representante legal (nombre, RUT y parentesco).",
      };
    }
    contenido = interpolarRepresentante(contenido, {
      nombre: nombre_representante,
      rut: rut_representante,
      parentesco,
    });
    if (/_{4,}/.test(contenido)) {
      return {
        success: false,
        error: "Faltan datos del representante legal en el consentimiento.",
      };
    }
  }

  // Versión: +1 sobre la más alta del mismo tipo
  const { data: existing } = await supabase
    .from("fce_consentimientos")
    .select("version")
    .eq("id_paciente", patientId)
    .eq("tipo", parsed.data.tipo)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = existing ? existing.version + 1 : 1;

  const { data, error } = await supabase
    .from("fce_consentimientos")
    .insert({
      id_paciente: patientId,
      tipo: parsed.data.tipo,
      contenido,
      version: nextVersion,
      created_by: profesionalId,
      id_clinica: idClinica,
    })
    .select("id")
    .single();

  if (error) return dbError("consentimiento", error);
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_consentimiento",
    tipoEvento: "create",
    tablaAfectada: "fce_consentimientos",
    registroId: data.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { id: data.id } };
}

/**
 * T7 (Fase 0 hotfix M5): `declaracionInformado` es la attestación explícita del
 * profesional ("Declaro haber informado al paciente y que la firma capturada
 * corresponde al paciente"). Obligatoria — sin ella no hay firma. Queda
 * registrada en el audit log (datosAfter, sin PII). La separación real de actos
 * paciente/profesional (firma por canal propio del paciente) es CI-1:
 * docs/plan-redisenio/sprints/CI-1-consentimiento-canal-paciente.md.
 */
export async function signConsentimiento(
  consentId: string,
  patientId: string,
  firmaDataUrl: string,
  declaracionInformado: boolean
): Promise<ActionResult<{ redirectTo: string }>> {
  if (declaracionInformado !== true) {
    return {
      success: false,
      error: "Debe declarar haber informado al paciente antes de firmar.",
    };
  }
  // T6: MIME PNG + tamaño máximo + rechazo de canvas vacío.
  const validacion = validarFirmaDataUrl(firmaDataUrl);
  if (!validacion.ok) return { success: false, error: validacion.error };

  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  // T3: leer la fila de la DB — la huella se calcula sobre lo que QUEDA ALMACENADO,
  // no sobre input del cliente. También verifica paciente y estado.
  const { data: row, error: fetchError } = await supabase
    .from("fce_consentimientos")
    .select("id, tipo, contenido, id_paciente, id_clinica, firmado")
    .eq("id", consentId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (fetchError) return dbError("consentimiento_fetch", fetchError);
  if (!row) return { success: false, error: "No se encontró el consentimiento." };
  if (row.firmado) return { success: false, error: "El consentimiento ya está firmado." };
  if (row.id_paciente !== patientId) {
    return { success: false, error: "El consentimiento no corresponde al paciente indicado." };
  }

  const timestamp = new Date().toISOString();
  const firmaPaciente = { data_url: firmaDataUrl, timestamp };
  // T3: SHA-256 real del contenido canónico (orden documentado en
  // src/lib/consentimientos/firma.ts). Reemplaza el hash aleatorio anterior.
  const hash = hashConsentimiento({
    tipo: row.tipo,
    contenido: row.contenido,
    id_paciente: row.id_paciente,
    id_clinica: row.id_clinica,
    firma_paciente: firmaPaciente,
  });

  const { error } = await supabase
    .from("fce_consentimientos")
    .update({
      firma_paciente: firmaPaciente,
      firma_profesional: { id_profesional: profesionalId, timestamp, hash },
      firmado: true,
      firmado_at: timestamp,
    })
    .eq("id", consentId)
    .eq("id_clinica", idClinica)
    .eq("id_paciente", patientId)
    .eq("firmado", false);

  if (error) return dbError("consentimiento", error);
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_consentimiento",
    tipoEvento: "sign",
    tablaAfectada: "fce_consentimientos",
    registroId: consentId,
    idClinica: idClinica,
    idPaciente: patientId,
    // T7: la declaración del profesional queda trazada en el audit log (sin PII).
    datosAfter: { declaracion_informado: true },
  });
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { redirectTo: `/dashboard/pacientes/${patientId}` } };
}
