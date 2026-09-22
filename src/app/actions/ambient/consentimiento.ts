"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPuedeFirmar, dbError, type ActionResult } from "@/lib/modules/guards";
import type { Rol } from "@/lib/modules/registry";
import { validarFirmaDataUrl } from "@/lib/consentimientos/firma";
import {
  TIPO_CONSENTIMIENTO_GRABACION,
  getUltimaVersionGrabacion,
} from "@/lib/ambient/consentimiento";

/**
 * AMB-1 F1 — captura presencial (fallback en box/mesón) y revocación del
 * consentimiento de grabación.
 *
 * T4 (Fase 0 hotfix M5, 2026-09-21): el criterio original de AMB-1 F1 — "la
 * recepcionista puede escribir consentimiento sin acceso a FCE" — queda
 * CORREGIDO. La RLS real de fce_consentimientos (tiene_acceso_clinico) ya
 * bloquea a la recepcionista: cualquier INSERT suyo falla con error genérico de
 * DB. Este flujo nunca funcionó para recepcionistas — los tests de AMB-1 son de
 * funciones puras sin DB y no lo detectaron.
 *
 * TODO(CI-1 — docs/plan-redisenio/sprints/CI-1-consentimiento-canal-paciente.md):
 * este flujo presencial desaparece como vía principal. Recepcionista (y
 * profesional) solo podrán ENVIAR LA SOLICITUD de consentimiento (link/QR con
 * token de un solo uso); la FIRMA la hace el paciente desde su propio
 * dispositivo. Mientras CI-1 no exista, ningún rol no-profesional puede crear
 * una fila con firmado=true — un consentimiento "firmado por el paciente" no
 * puede originarse en la sesión del staff.
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
  // T6 (Fase 0): misma validación de firma que M5 — PNG, tamaño máximo, canvas vacío.
  const validacion = validarFirmaDataUrl(firmaDataUrl);
  if (!validacion.ok) return { success: false, error: validacion.error };

  const { supabase, user, idClinica, rol, profesionalId } = await requireContext();

  // T4: solo rol profesional puede crear un consentimiento firmado por el
  // paciente. assertPuedeFirmar = ROLES_QUE_PUEDEN_FIRMAR = ['profesional'].
  const gate = assertPuedeFirmar(rol as Rol);
  if (!gate.success) {
    return {
      success: false,
      error:
        "Solo un profesional puede registrar un consentimiento firmado de grabación. " +
        "La recepcionista solo podrá enviar la solicitud al paciente (CI-1).",
    };
  }
  if (!profesionalId) {
    return { success: false, error: "No se encontró el profesional asociado al usuario." };
  }

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
