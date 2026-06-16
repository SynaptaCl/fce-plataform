"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type {
  TipoDocumentoFirmable,
  TipoAdenda,
  AdendaConAutor,
} from "@/types/adenda";
import type { ActionResult } from "./patients";

// ── Constantes de módulo ───────────────────────────────────────────────────

const TABLA_POR_TIPO: Record<TipoDocumentoFirmable, string> = {
  soap: "fce_notas_soap",
  nota_clinica: "fce_notas_clinicas",
  periograma: "fce_periograma",
  egreso: "fce_egresos",
  prescripcion: "fce_prescripciones",
  orden_examen: "fce_ordenes_examen",
  consentimiento: "fce_consentimientos",
};

const VENTANA_ERRATA_MS = 72 * 60 * 60 * 1000;

const ROLES_AUTORIZADORES = ["director", "admin", "superadmin"];

// ── Tipos de entrada ───────────────────────────────────────────────────────

interface CrearAdendaInput {
  tipoDocumento: TipoDocumentoFirmable;
  idDocumento: string;
  idPaciente: string;
  idEncuentro?: string | null;
  tipoAdenda: TipoAdenda;
  motivo: string;
  contenido: string;
  overrideMotivo?: string;
}

// ── crearAdenda ────────────────────────────────────────────────────────────

export async function crearAdenda(
  input: CrearAdendaInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user, idClinica, rol, profesionalId } =
      await requireContext();

    if (!profesionalId) {
      return { success: false, error: "No tienes un perfil profesional activo" };
    }

    if (!input.motivo.trim()) {
      return { success: false, error: "El motivo es obligatorio" };
    }

    if (!input.contenido.trim()) {
      return { success: false, error: "El contenido es obligatorio" };
    }

    const tabla = TABLA_POR_TIPO[input.tipoDocumento];

    const { data: original, error: fetchError } = await supabase
      .from(tabla)
      .select("id, firmado, firmado_at, created_by")
      .eq("id", input.idDocumento)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Documento original no encontrado" };
    }

    if (!original.firmado) {
      return {
        success: false,
        error: "Solo se pueden agregar adendas a documentos firmados",
      };
    }

    const esAutorizador = ROLES_AUTORIZADORES.includes(rol);
    const esAutorOriginal = original.created_by === profesionalId;
    let overrideDirector = false;

    if (input.tipoAdenda === "errata") {
      const dentroVentana =
        Date.now() - new Date(original.firmado_at as string).getTime() <=
        VENTANA_ERRATA_MS;

      if (dentroVentana) {
        if (!esAutorOriginal && !esAutorizador) {
          return {
            success: false,
            error:
              "Solo el autor original puede corregir esta nota dentro de las primeras 72 horas",
          };
        }
      } else {
        if (!esAutorizador) {
          return {
            success: false,
            error:
              "Han pasado más de 72 horas. Esta corrección requiere autorización de un director",
          };
        }
        if (!input.overrideMotivo?.trim()) {
          return {
            success: false,
            error:
              "Se requiere un motivo de autorización para erratas fuera de la ventana de 72 horas",
          };
        }
        overrideDirector = true;
      }
    } else if (input.tipoAdenda === "anulacion") {
      if (!esAutorizador) {
        return {
          success: false,
          error: "Solo un director o administrador puede anular documentos",
        };
      }
      if (!input.overrideMotivo?.trim()) {
        return {
          success: false,
          error: "Se requiere un motivo de autorización para anular documentos",
        };
      }
      overrideDirector = true;
    }

    const ahora = new Date().toISOString();

    const { data: adenda, error: insertError } = await supabase
      .from("fce_adendas")
      .insert({
        id_clinica: idClinica,
        id_paciente: input.idPaciente,
        id_encuentro: input.idEncuentro ?? null,
        tipo_documento: input.tipoDocumento,
        id_documento: input.idDocumento,
        tipo_adenda: input.tipoAdenda,
        motivo: input.motivo.trim(),
        contenido: input.contenido.trim(),
        override_director: overrideDirector,
        override_motivo: overrideDirector
          ? (input.overrideMotivo?.trim() ?? null)
          : null,
        override_por: overrideDirector ? user.id : null,
        firmado: true,
        firmado_at: ahora,
        firmado_por: profesionalId,
        created_by: profesionalId,
      })
      .select("id")
      .single();

    if (insertError || !adenda) {
      return { success: false, error: "No se pudo crear la adenda" };
    }

    const tipoEvento =
      input.tipoAdenda === "errata" && overrideDirector
        ? ("errata_post_ventana" as const)
        : input.tipoAdenda === "errata"
          ? ("create_errata" as const)
          : input.tipoAdenda === "anulacion"
            ? ("create_anulacion" as const)
            : ("create_adenda" as const);

    await logAudit({
      supabase,
      actorId: user.id,
      accion: `crear_${input.tipoAdenda}`,
      tipoEvento,
      tablaAfectada: "fce_adendas",
      registroId: adenda.id,
      idClinica,
      idPaciente: input.idPaciente,
      datosAfter: {
        tipo_documento: input.tipoDocumento,
        id_documento: input.idDocumento,
        tipo_adenda: input.tipoAdenda,
        override_director: overrideDirector,
      },
    });

    revalidatePath(`/dashboard/pacientes/${input.idPaciente}`);

    return { success: true, data: { id: adenda.id } };
  } catch (err) {
    console.error("[FCE] crearAdenda error:", err);
    return { success: false, error: "Error inesperado al crear la adenda" };
  }
}

// ── getAdendasDeDocumento ──────────────────────────────────────────────────

export async function getAdendasDeDocumento(
  tipoDocumento: TipoDocumentoFirmable,
  idDocumento: string
): Promise<ActionResult<AdendaConAutor[]>> {
  try {
    const { supabase } = await requireContext();

    const { data: adendas, error } = await supabase
      .from("fce_adendas")
      .select("*")
      .eq("tipo_documento", tipoDocumento)
      .eq("id_documento", idDocumento)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: "No se pudieron cargar las adendas" };
    }

    if (!adendas || adendas.length === 0) {
      return { success: true, data: [] };
    }

    const uniqueIds = [...new Set(adendas.map((a) => a.created_by as string))];

    const { data: profesionales } = await supabase
      .from("profesionales")
      .select("id, nombre")
      .in("id", uniqueIds);

    const profMap = new Map<string, string>(
      (profesionales ?? []).map((p) => [p.id as string, p.nombre as string])
    );

    const result: AdendaConAutor[] = adendas.map((a) => ({
      id: a.id as string,
      id_clinica: a.id_clinica as string,
      id_paciente: a.id_paciente as string,
      id_encuentro: (a.id_encuentro as string | null) ?? null,
      tipo_documento: a.tipo_documento as TipoDocumentoFirmable,
      id_documento: a.id_documento as string,
      tipo_adenda: a.tipo_adenda as "adenda" | "errata" | "anulacion",
      motivo: a.motivo as string,
      contenido: a.contenido as string,
      override_director: a.override_director as boolean,
      override_motivo: (a.override_motivo as string | null) ?? null,
      override_por: (a.override_por as string | null) ?? null,
      firmado: a.firmado as boolean,
      firmado_at: (a.firmado_at as string | null) ?? null,
      firmado_por: (a.firmado_por as string | null) ?? null,
      created_by: a.created_by as string,
      created_at: a.created_at as string,
      updated_at: a.updated_at as string,
      autorNombre: profMap.get(a.created_by as string) ?? "Profesional",
    }));

    return { success: true, data: result };
  } catch (err) {
    console.error("[FCE] getAdendasDeDocumento error:", err);
    return { success: false, error: "Error inesperado al cargar las adendas" };
  }
}
