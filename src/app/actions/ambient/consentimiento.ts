"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dbError, type ActionResult } from "@/lib/modules/guards";
import {
  TIPO_CONSENTIMIENTO_GRABACION,
  getUltimaVersionGrabacion,
} from "@/lib/ambient/consentimiento";

/**
 * AMB-1 F1 — captura presencial (fallback en box/mesón) y revocación del
 * consentimiento de grabación. No usa requireAccesoFCE: la recepcionista debe
 * poder registrar/revocar consentimiento SIN acceso a la FCE (criterio F1,
 * AMB-1-ambient-scribe.md). requireContext() solo exige admin_users activo.
 *
 * Texto legal — AMB-1-ambient-scribe.md §8, borrador pendiente de revisión de
 * abogado (P4, bloqueante para producción — no modificar sin ese visto bueno).
 */
const TEXTO_CONSENTIMIENTO_GRABACION = `Grabación de la consulta para apoyo en el registro clínico

Autorizo que mi consulta sea grabada y transcrita automáticamente, y que el texto resultante sea procesado por un sistema de inteligencia artificial con el único fin de generar un borrador de mi nota clínica, que será revisado y firmado por el profesional tratante.

La grabación no se almacena. El procesamiento involucra a proveedores fuera de Chile bajo contrato de tratamiento de datos. Puedo revocar esta autorización en cualquier momento, sin que ello afecte mi atención.`;

const TEXTO_REVOCACION_GRABACION =
  "Revocación del consentimiento de grabación de consulta (Ambient Scribe). A partir de esta fecha no se graban ni transcriben las consultas de este paciente.";

export async function crearConsentimientoGrabacionPresencial(
  patientId: string,
  firmaDataUrl: string
): Promise<ActionResult<{ id: string }>> {
  if (!firmaDataUrl.startsWith("data:image/")) {
    return { success: false, error: "Firma inválida" };
  }
  const { supabase, user, idClinica, profesionalId } = await requireContext();

  const ultima = await getUltimaVersionGrabacion(supabase, patientId);
  if (ultima?.firmado) {
    return { success: false, error: "El paciente ya tiene un consentimiento de grabación vigente." };
  }
  const nextVersion = ultima ? ultima.version + 1 : 1;
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("fce_consentimientos")
    .insert({
      id_paciente: patientId,
      id_clinica: idClinica,
      tipo: TIPO_CONSENTIMIENTO_GRABACION,
      contenido: TEXTO_CONSENTIMIENTO_GRABACION,
      version: nextVersion,
      created_by: profesionalId,
      firma_paciente: { data_url: firmaDataUrl, timestamp },
      firmado: true,
      firmado_at: timestamp,
    })
    .select("id")
    .single();

  if (error) return dbError("consentimiento_grabacion_presencial", error, { id_clinica: idClinica });

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_consentimiento_grabacion_presencial",
    tipoEvento: "consent_grabacion_otorgado",
    tablaAfectada: "fce_consentimientos",
    registroId: data.id,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { id: data.id } };
}

export async function revocarConsentimientoGrabacion(
  patientId: string
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica, profesionalId } = await requireContext();

  const ultima = await getUltimaVersionGrabacion(supabase, patientId);
  if (!ultima?.firmado) {
    return { success: false, error: "El paciente no tiene un consentimiento de grabación vigente para revocar." };
  }
  const nextVersion = ultima.version + 1;

  // INSERT, nunca UPDATE sobre la fila firmada — trg_block_update_signed_consent
  // bloquearía un UPDATE. La revocación es una versión nueva con firmado=false.
  const { data, error } = await supabase
    .from("fce_consentimientos")
    .insert({
      id_paciente: patientId,
      id_clinica: idClinica,
      tipo: TIPO_CONSENTIMIENTO_GRABACION,
      contenido: TEXTO_REVOCACION_GRABACION,
      version: nextVersion,
      created_by: profesionalId,
      firmado: false,
    })
    .select("id")
    .single();

  if (error) return dbError("revocar_consentimiento_grabacion", error, { id_clinica: idClinica });

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "revocar_consentimiento_grabacion",
    tipoEvento: "consent_grabacion_revocado",
    tablaAfectada: "fce_consentimientos",
    registroId: data.id,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { id: data.id } };
}
