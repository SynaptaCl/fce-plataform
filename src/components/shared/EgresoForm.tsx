"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { egresoSchema, type EgresoSchemaType } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { createEgreso, updateEgreso, signEgreso } from "@/app/actions/egresos";
import type { Egreso } from "@/types/egreso";
import { TIPOS_EGRESO } from "@/types/egreso";
import { EpicrisisPdfView } from "@/components/shared/EpicrisisPdfView";

// ── Props ────────────────────────────────────────────────────────────────────

interface EgresoFormProps {
  patientId: string;
  egresoExistente?: Egreso | null;
  readOnly?: boolean;
}

// ── Componente principal ─────────────────────────────────────────────────────

export function EgresoForm({
  patientId,
  egresoExistente,
  readOnly: readOnlyProp = false,
}: EgresoFormProps) {
  const [egresoId, setEgresoId] = useState<string | undefined>(egresoExistente?.id);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [firmado, setFirmado] = useState(egresoExistente?.firmado ?? false);
  const [firmadoAt, setFirmadoAt] = useState<string | null>(egresoExistente?.firmado_at ?? null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEpicrisis, setShowEpicrisis] = useState(false);
  const router = useRouter();
  const [isPendingSign, startSignTransition] = useTransition();

  const readOnly = readOnlyProp || firmado;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EgresoSchemaType>({
    resolver: zodResolver(egresoSchema),
    defaultValues: {
      tipo_egreso: egresoExistente?.tipo_egreso ?? "alta_clinica",
      diagnostico_egreso: egresoExistente?.diagnostico_egreso ?? "",
      resumen_tratamiento: egresoExistente?.resumen_tratamiento ?? "",
      estado_al_egreso: egresoExistente?.estado_al_egreso ?? "",
      indicaciones_post_egreso: egresoExistente?.indicaciones_post_egreso ?? "",
      derivacion_a: egresoExistente?.derivacion_a ?? "",
      notas: egresoExistente?.notas ?? "",
    },
  });

  const tipoEgreso = watch("tipo_egreso");

  async function onSubmit(data: EgresoSchemaType) {
    setServerError(null);
    setSaved(false);

    if (egresoId) {
      const result = await updateEgreso(egresoId, patientId, data);
      if (!result.success) { setServerError(result.error); return; }
    } else {
      const result = await createEgreso(patientId, data);
      if (!result.success) { setServerError(result.error); return; }
      setEgresoId(result.data.id);
    }
    setSaved(true);
  }

  function handleSignClick() {
    if (!egresoId) {
      setServerError("Guarda el egreso antes de firmar.");
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmSign() {
    setShowConfirm(false);
    startSignTransition(async () => {
      const result = await signEgreso(egresoId!, patientId);
      if (!result.success) { setServerError(result.error); return; }
      setFirmado(true);
      setFirmadoAt(new Date().toISOString());
      setShowEpicrisis(true);
      // Note: removed router.push — user stays on page to download PDF
    });
  }

  return (
    <div className="space-y-6">
      {/* Estado: firmado */}
      {firmado && (
        <AlertBanner variant="success" title="Egreso firmado — documento inmutable">
          <span className="text-sm">
            Firmado el{" "}
            {firmadoAt &&
              new Date(firmadoAt).toLocaleDateString("es-CL", {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
          </span>
        </AlertBanner>
      )}

      {/* Error del servidor */}
      {serverError && (
        <AlertBanner variant="danger">{serverError}</AlertBanner>
      )}

      {/* Guardado ok */}
      {saved && !firmado && (
        <AlertBanner variant="success">Borrador guardado correctamente.</AlertBanner>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Tipo de egreso */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-1">
            Tipo de egreso <span className="text-red-500">*</span>
          </label>
          <select
            {...register("tipo_egreso")}
            disabled={readOnly}
            className={cn(
              "w-full rounded-md border border-kp-border bg-surface-1 px-3 py-2 text-sm text-ink-1",
              "focus:outline-none focus:ring-2 focus:ring-kp-primary/30 focus:border-kp-primary",
              readOnly && "opacity-70 cursor-not-allowed"
            )}
          >
            {TIPOS_EGRESO.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.tipo_egreso && (
            <p className="text-xs text-red-600">{errors.tipo_egreso.message}</p>
          )}
        </div>

        {/* Diagnóstico de egreso */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-1">
            Diagnóstico de egreso <span className="text-red-500">*</span>
          </label>
          <Textarea
            {...register("diagnostico_egreso")}
            disabled={readOnly}
            rows={3}
            placeholder="Diagnóstico al momento del egreso…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
          {errors.diagnostico_egreso && (
            <p className="text-xs text-red-600">{errors.diagnostico_egreso.message}</p>
          )}
        </div>

        {/* Resumen de tratamiento */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-1">
            Resumen de tratamiento <span className="text-red-500">*</span>
          </label>
          <Textarea
            {...register("resumen_tratamiento")}
            disabled={readOnly}
            rows={8}
            placeholder="Describa el tratamiento realizado, evolución y resultados obtenidos…"
            className={cn(
              "font-mono text-sm",
              readOnly && "opacity-70 cursor-not-allowed"
            )}
          />
          {errors.resumen_tratamiento && (
            <p className="text-xs text-red-600">{errors.resumen_tratamiento.message}</p>
          )}
        </div>

        {/* Estado al egreso */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Estado al egreso <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Textarea
            {...register("estado_al_egreso")}
            disabled={readOnly}
            rows={3}
            placeholder="Estado funcional y clínico al momento del egreso…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
        </div>

        {/* Indicaciones post-egreso */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Indicaciones post-egreso <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Textarea
            {...register("indicaciones_post_egreso")}
            disabled={readOnly}
            rows={4}
            placeholder="Indicaciones para el paciente tras el egreso…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
        </div>

        {/* Derivación — solo visible cuando tipo_egreso === 'derivacion' */}
        {tipoEgreso === "derivacion" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">
              Derivado a <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("derivacion_a")}
              disabled={readOnly}
              placeholder="Especialidad, profesional o centro de salud al que se deriva…"
              className={cn(readOnly && "opacity-70 cursor-not-allowed")}
            />
            {errors.derivacion_a && (
              <p className="text-xs text-red-600">{errors.derivacion_a.message}</p>
            )}
          </div>
        )}

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Notas adicionales <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Textarea
            {...register("notas")}
            disabled={readOnly}
            rows={3}
            placeholder="Observaciones adicionales…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
        </div>

        {/* Acciones */}
        {!readOnly && (
          <div className="flex items-center gap-3 pt-2 border-t border-kp-border">
            <Button
              type="submit"
              variant="secondary"
              disabled={isSubmitting}
            >
              <PenLine className="w-4 h-4 mr-1.5" />
              {isSubmitting ? "Guardando…" : "Guardar borrador"}
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting || isPendingSign || !egresoId}
              onClick={handleSignClick}
              title={!egresoId ? "Guarda el egreso antes de firmar" : undefined}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isPendingSign ? "Firmando…" : "Firmar y egresar"}
            </Button>

            {!egresoId && (
              <span className="text-xs text-ink-3">Guarda el egreso primero para poder firmar</span>
            )}
          </div>
        )}

        {readOnly && firmado && (
          <div className="flex items-center gap-2 pt-2 border-t border-kp-border text-ink-3 text-sm">
            <Lock className="w-4 h-4" />
            Egreso firmado — solo lectura
          </div>
        )}
      </form>

      {/* Modal de confirmación de firma */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-1 rounded-xl border border-kp-border p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-ink-1">Confirmar egreso</h3>
            <p className="text-sm text-ink-2">
              Al firmar el egreso, el paciente quedará en estado <strong>egresado</strong> y
              el documento será <strong>inmutable</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmSign}
              >
                Sí, firmar y egresar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF epicrisis — visible después de firmar */}
      {showEpicrisis && egresoId && (
        <div className="space-y-3">
          <EpicrisisPdfView egresoId={egresoId} patientId={patientId} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/pacientes/${patientId}`)}
              className="text-sm text-ink-3 hover:text-kp-accent transition-colors underline"
            >
              Volver a la ficha del paciente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
