"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine, Lock, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notaClinicaSchema, type NotaClinicaSchemaType } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { upsertNotaClinica, signNotaClinica } from "@/app/actions/clinico/nota-clinica";
import type { NotaClinica } from "@/types/nota-clinica";
import { DiagnosticoSearch } from '@/components/clinico/DiagnosticoSearch';
import type { ICDCodeSnap } from '@/lib/icd/types';
import { CopilotoNotaButton, CopilotoNotaPanel } from '@/components/modules/CopilotoNota'
import type { BorradorNota } from '@/lib/ia/copiloto-nota/types'
import type { PlanIntervencion } from '@/types/plan-intervencion'

// ── Tipos internos ───────────────────────────────────────────────────────────

interface SeccionesEstructuradas {
  conductas_observadas?: string;
  participacion_cuidador?: string;
  estrategias?: string;
  asistencia?: string;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface NotaClinicaFormProps {
  encuentroId: string;
  patientId: string;
  notaExistente?: NotaClinica | null;
  readOnly?: boolean;
  idClinica: string;
  m10Activo?: boolean;
  planActivo?: PlanIntervencion | null;
}

// ── Componente principal ─────────────────────────────────────────────────────

export function NotaClinicaForm({
  encuentroId,
  patientId,
  notaExistente,
  readOnly: readOnlyProp = false,
  idClinica,
  m10Activo = false,
  // planActivo disponible para futura integración de progreso desde nota
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  planActivo: _planActivo,
}: NotaClinicaFormProps) {
  const [notaId, setNotaId] = useState<string | undefined>(notaExistente?.id);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [firmado, setFirmado] = useState(notaExistente?.firmado ?? false);
  const [firmadoAt, setFirmadoAt] = useState<string | null>(notaExistente?.firmado_at ?? null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const [isPendingSign, startSignTransition] = useTransition();

  const readOnly = readOnlyProp || firmado;

  const [icdCodigos, setIcdCodigos] = useState<ICDCodeSnap[]>(
    notaExistente?.icd_codigos ?? []
  );

  // CIE-10: array interno representado como string separado por comas en UI
  const [cie10Input, setCie10Input] = useState(
    (notaExistente?.cie10_codigos ?? []).join(", ")
  );

  const [borradorActivo, setBorradorActivo] = useState<BorradorNota | null>(null)

  const [seccionesEstructuradas, setSeccionesEstructuradas] = useState<SeccionesEstructuradas>(
    (notaExistente?.secciones_estructuradas as SeccionesEstructuradas) ?? {}
  )

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NotaClinicaSchemaType>({
    resolver: zodResolver(notaClinicaSchema),
    defaultValues: {
      motivo_consulta: notaExistente?.motivo_consulta ?? "",
      contenido: notaExistente?.contenido ?? "",
      diagnostico: notaExistente?.diagnostico ?? "",
      cie10_codigos: notaExistente?.cie10_codigos ?? [],
      plan: notaExistente?.plan ?? "",
      proxima_sesion: notaExistente?.proxima_sesion ?? "",
    },
  });

  async function onSubmit(data: NotaClinicaSchemaType) {
    setServerError(null);
    setSaved(false);

    const cie10 = cie10Input
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const result = await upsertNotaClinica(encuentroId, patientId, {
      ...data,
      cie10_codigos: cie10,
      icd_codigos: icdCodigos,
      icd_version: 'ICD-11 2025-01',
      ...(m10Activo ? { secciones_estructuradas: seccionesEstructuradas } : {}),
    });

    if (!result.success) { setServerError(result.error); return; }
    setNotaId(result.data.id);
    setSaved(true);
  }

  function handleSignClick() {
    if (!notaId) {
      setServerError("Guarda la nota antes de firmar.");
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmSign() {
    setShowConfirm(false);
    startSignTransition(async () => {
      const result = await signNotaClinica(notaId!, patientId);
      if (!result.success) { setServerError(result.error); return; }
      setFirmado(true);
      setFirmadoAt(new Date().toISOString());
      if (result.data?.redirectTo) {
        router.push(result.data.redirectTo);
      }
    });
  }

  function handleInsertar(modo: 'agregar' | 'reemplazar') {
    if (!borradorActivo) return
    const actual = getValues("contenido")
    setValue(
      "contenido",
      modo === 'reemplazar' || !actual.trim()
        ? borradorActivo.contenido
        : `${actual}\n\n---\n\n${borradorActivo.contenido}`
    )
    setBorradorActivo(null)
  }

  return (
    <div className="space-y-6">
      {/* Estado: firmada */}
      {firmado && (
        <AlertBanner variant="success" title="Nota clínica firmada — documento inmutable">
          <span className="text-sm">
            Firmada el{" "}
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

        {/* Motivo de consulta */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Motivo de consulta <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Textarea
            {...register("motivo_consulta")}
            disabled={readOnly}
            rows={2}
            placeholder="Motivo de esta sesión específica…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
          {errors.motivo_consulta && (
            <p className="text-xs text-red-600">{errors.motivo_consulta.message}</p>
          )}
        </div>

        {/* Contenido (obligatorio) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink-1">
              Nota clínica <span className="text-red-500">*</span>
            </label>
            {!readOnly && (
              <CopilotoNotaButton
                encuentroId={encuentroId}
                idClinica={idClinica}
                getBullets={() => getValues("contenido")}
                onBorradorReady={setBorradorActivo}
              />
            )}
          </div>
          <Textarea
            {...register("contenido")}
            disabled={readOnly}
            rows={10}
            placeholder="Describa los hallazgos, la evolución del paciente, las intervenciones realizadas…"
            className={cn(
              "font-mono text-sm",
              readOnly && "opacity-70 cursor-not-allowed"
            )}
          />
          {errors.contenido && (
            <p className="text-xs text-red-600">{errors.contenido.message}</p>
          )}
        </div>

        {/* Panel copiloto — aparece entre la nota y el diagnóstico cuando hay borrador */}
        {borradorActivo && !readOnly && (
          <CopilotoNotaPanel
            borrador={borradorActivo}
            tieneContenido={getValues("contenido").trim().length > 0}
            onInsertar={handleInsertar}
            onDescartar={() => setBorradorActivo(null)}
          />
        )}

        {/* Registro de sesión M10 — solo si m10Activo y hay contenido o no es readOnly */}
        {m10Activo && (!readOnly || Object.values(seccionesEstructuradas).some(Boolean)) && (
          <div className="rounded-lg border border-kp-border bg-surface-0 p-4 space-y-4">
            <p className="text-sm font-semibold text-ink-1">
              Registro de sesión{" "}
              <span className="font-normal text-ink-3">(Neurodesarrollo)</span>
            </p>

            {/* Conductas observadas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-2">
                Conductas observadas{" "}
                <span className="text-ink-3 font-normal">(opcional)</span>
              </label>
              {readOnly ? (
                seccionesEstructuradas.conductas_observadas ? (
                  <p className="text-sm text-ink-1 whitespace-pre-wrap">
                    {seccionesEstructuradas.conductas_observadas}
                  </p>
                ) : null
              ) : (
                <Textarea
                  value={seccionesEstructuradas.conductas_observadas ?? ""}
                  onChange={(e) =>
                    setSeccionesEstructuradas((prev) => ({
                      ...prev,
                      conductas_observadas: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Conductas observadas durante la sesión…"
                />
              )}
            </div>

            {/* Participación del cuidador */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-2">
                Participación del cuidador{" "}
                <span className="text-ink-3 font-normal">(opcional)</span>
              </label>
              {readOnly ? (
                seccionesEstructuradas.participacion_cuidador ? (
                  <p className="text-sm text-ink-1 whitespace-pre-wrap">
                    {seccionesEstructuradas.participacion_cuidador}
                  </p>
                ) : null
              ) : (
                <Textarea
                  value={seccionesEstructuradas.participacion_cuidador ?? ""}
                  onChange={(e) =>
                    setSeccionesEstructuradas((prev) => ({
                      ...prev,
                      participacion_cuidador: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Rol y participación del cuidador en la sesión…"
                />
              )}
            </div>

            {/* Estrategias utilizadas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-2">
                Estrategias utilizadas{" "}
                <span className="text-ink-3 font-normal">(opcional)</span>
              </label>
              {readOnly ? (
                seccionesEstructuradas.estrategias ? (
                  <p className="text-sm text-ink-1 whitespace-pre-wrap">
                    {seccionesEstructuradas.estrategias}
                  </p>
                ) : null
              ) : (
                <Textarea
                  value={seccionesEstructuradas.estrategias ?? ""}
                  onChange={(e) =>
                    setSeccionesEstructuradas((prev) => ({
                      ...prev,
                      estrategias: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Estrategias y técnicas utilizadas durante la sesión…"
                />
              )}
            </div>

            {/* Asistencia */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-2">
                Asistencia{" "}
                <span className="text-ink-3 font-normal">(opcional)</span>
              </label>
              {readOnly ? (
                seccionesEstructuradas.asistencia ? (
                  <p className="text-sm text-ink-1 whitespace-pre-wrap">
                    {seccionesEstructuradas.asistencia}
                  </p>
                ) : null
              ) : (
                <Textarea
                  value={seccionesEstructuradas.asistencia ?? ""}
                  onChange={(e) =>
                    setSeccionesEstructuradas((prev) => ({
                      ...prev,
                      asistencia: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Nivel de asistencia requerida…"
                />
              )}
            </div>
          </div>
        )}

        {/* Diagnóstico ICD-11 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Diagnóstico ICD-11 <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <DiagnosticoSearch
            value={icdCodigos}
            onChange={setIcdCodigos}
            readOnly={readOnly}
          />
          {/* Fallback: diagnóstico de texto libre (notas antiguas sin código ICD) */}
          {icdCodigos.length === 0 && notaExistente?.diagnostico && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-kp-border bg-surface-0 text-ink-2"
              >
                diagnóstico sin código ICD: {notaExistente.diagnostico}
              </span>
            </div>
          )}
          {/* Campo diagnóstico texto (hidden, backwards compat) */}
          <input type="hidden" {...register("diagnostico")} />
        </div>

        {/* CIE-10 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Códigos CIE-10 <span className="text-ink-3 font-normal">(separados por coma, opcional)</span>
          </label>
          <Input
            value={cie10Input}
            onChange={(e) => setCie10Input(e.target.value)}
            disabled={readOnly}
            placeholder="J06.9, Z00.0…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
          {/* Mostrar tags */}
          {cie10Input.trim() && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {cie10Input
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
                .map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-0 border border-kp-border text-xs font-mono text-ink-2"
                  >
                    {code}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          setCie10Input(
                            cie10Input
                              .split(",")
                              .filter((s) => s.trim().toUpperCase() !== code)
                              .join(", ")
                          )
                        }
                        className="text-ink-3 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Plan */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Plan <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Textarea
            {...register("plan")}
            disabled={readOnly}
            rows={4}
            placeholder="Plan de tratamiento, indicaciones, derivaciones…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
          {errors.plan && (
            <p className="text-xs text-red-600">{errors.plan.message}</p>
          )}
        </div>

        {/* Próxima sesión */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-2">
            Próxima sesión <span className="text-ink-3 font-normal">(opcional)</span>
          </label>
          <Input
            {...register("proxima_sesion")}
            disabled={readOnly}
            placeholder="Ej: 1 semana, control en 15 días…"
            className={cn(readOnly && "opacity-70 cursor-not-allowed")}
          />
        </div>

        {/* Acciones */}
        {!readOnly && (
          <div id="signature-section" className="flex items-center gap-3 pt-2 border-t border-kp-border">
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
              disabled={isSubmitting || isPendingSign || !notaId}
              onClick={handleSignClick}
              title={!notaId ? "Guarda la nota antes de firmar" : undefined}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isPendingSign ? "Firmando…" : "Firmar y cerrar"}
            </Button>

            {!notaId && (
              <span className="text-xs text-ink-3">Guarda la nota primero para poder firmar</span>
            )}
          </div>
        )}

        {readOnly && firmado && (
          <div className="flex items-center gap-2 pt-2 border-t border-kp-border text-ink-3 text-sm">
            <Lock className="w-4 h-4" />
            Nota firmada — solo lectura
          </div>
        )}
      </form>

      {/* Modal de confirmación de firma */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-1 rounded-xl border border-kp-border p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-ink-1">Confirmar firma</h3>
            <p className="text-sm text-ink-2">
              Al firmar la nota quedará <strong>inmutable</strong> y el encuentro se cerrará.
              Esta acción no se puede deshacer.
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
                Sí, firmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
