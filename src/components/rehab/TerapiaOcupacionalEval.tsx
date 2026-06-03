"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { upsertEvaluacion } from "@/app/actions/rehab/evaluacion";
import type { Evaluation } from "@/types";

// ── Sub-áreas ──────────────────────────────────────────────────────────────

const SUB_AREAS = [
  { key: "avd",       label: "AVD y Participación" },
  { key: "destrezas", label: "Destrezas Motoras" },
  { key: "sensorial", label: "Procesamiento Sensorial" },
  { key: "cognitivo", label: "Funciones Cognitivas" },
  { key: "contexto",  label: "Contexto y Entorno" },
  { key: "apoyo",     label: "Productos de Apoyo" },
] as const;

type TOSubAreaKey = (typeof SUB_AREAS)[number]["key"];

// ── Props ──────────────────────────────────────────────────────────────────

interface TerapiaOcupacionalEvalProps {
  patientId: string;
  evaluaciones: Evaluation[];
  readOnly?: boolean;
}

// ── Helper: extract data for sub_area ─────────────────────────────────────

function getSubAreaData(evals: Evaluation[], subArea: string): Record<string, unknown> {
  return (evals.find((e) => e.sub_area === subArea)?.data ?? {}) as Record<string, unknown>;
}

// ── Componente principal ───────────────────────────────────────────────────

export function TerapiaOcupacionalEval({
  patientId,
  evaluaciones,
  readOnly = false,
}: TerapiaOcupacionalEvalProps) {
  const [activeTab, setActiveTab] = useState<TOSubAreaKey>("avd");

  return (
    <div className="space-y-4">
      {readOnly && (
        <AlertBanner variant="warning" title="Modo lectura">
          Solo profesionales de Terapia Ocupacional pueden editar esta evaluación.
        </AlertBanner>
      )}

      {/* Sub-area tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_AREAS.map((area) => {
          const hasData = evaluaciones.some((e) => e.sub_area === area.key);
          return (
            <button
              key={area.key}
              type="button"
              onClick={() => setActiveTab(area.key)}
              className={
                activeTab === area.key
                  ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent text-white"
                  : hasData
                    ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-kp-accent-xs border border-kp-accent/30 text-kp-primary"
                    : "px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-0 border border-kp-border text-ink-2 hover:border-kp-border-md"
              }
            >
              {area.label}
              {hasData && activeTab !== area.key && (
                <span className="ml-1 text-[0.55rem] font-bold text-kp-accent">●</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active sub-area form */}
      <div className="pt-2">
        {activeTab === "avd" && (
          <AvdForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "avd")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "destrezas" && (
          <DestrezasForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "destrezas")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "sensorial" && (
          <SensorialForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "sensorial")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "cognitivo" && (
          <CognitivoForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "cognitivo")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "contexto" && (
          <ContextoForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "contexto")}
            readOnly={readOnly}
          />
        )}
        {activeTab === "apoyo" && (
          <ApoyoForm
            patientId={patientId}
            initialData={getSubAreaData(evaluaciones, "apoyo")}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-area form helpers ──────────────────────────────────────────────────

interface SubFormProps {
  patientId: string;
  initialData: Record<string, unknown>;
  readOnly: boolean;
}

function SaveRow({
  isSubmitting,
  readOnly,
  saved,
}: {
  isSubmitting: boolean;
  readOnly: boolean;
  saved: boolean;
}) {
  if (readOnly) return null;
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-kp-border">
      {saved && (
        <span className="text-sm font-medium text-kp-success">
          ✓ Guardado
        </span>
      )}
      <Button type="submit" size="sm" disabled={isSubmitting}>
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {isSubmitting ? "Guardando…" : "Guardar sección"}
      </Button>
    </div>
  );
}

const SELECT_CLASS =
  "w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border border-kp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kp-accent/30 disabled:bg-surface-0";

// ── AVD y Participación Ocupacional ────────────────────────────────────────

const AVD_BASICAS = [
  "Alimentación",
  "Higiene personal",
  "Baño/ducha",
  "Vestido superior",
  "Vestido inferior",
  "Movilidad funcional",
  "Continencia",
];

const AVD_INSTRUMENTALES = [
  "Preparación de alimentos",
  "Manejo del hogar",
  "Uso del teléfono",
  "Uso del transporte",
  "Administración de medicamentos",
  "Gestión financiera básica",
];

const NIVEL_INDEPENDENCIA_OPTS = [
  "Independiente",
  "Supervisión",
  "Asistencia mínima (<25%)",
  "Asistencia moderada (25-50%)",
  "Asistencia máxima (50-75%)",
  "Dependencia total (>75%)",
];

type AvdFormData = {
  avd_basicas: string[];
  avd_instrumentales: string[];
  nivel_independencia: string;
  observaciones_avd: string;
};

function AvdForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<AvdFormData>;

  const { register, handleSubmit, control, setValue, formState: { isSubmitting } } =
    useForm<AvdFormData>({
      defaultValues: {
        avd_basicas: (d.avd_basicas as string[]) ?? [],
        avd_instrumentales: (d.avd_instrumentales as string[]) ?? [],
        nivel_independencia: (d.nivel_independencia as string) ?? "",
        observaciones_avd: (d.observaciones_avd as string) ?? "",
      },
    });

  const avdBasicasVal = useWatch({ control, name: "avd_basicas" });
  const avdInstrumentalesVal = useWatch({ control, name: "avd_instrumentales" });

  function toggleItem(field: "avd_basicas" | "avd_instrumentales", item: string, current: string[]) {
    const next = current.includes(item)
      ? current.filter((v) => v !== item)
      : [...current, item];
    setValue(field, next);
  }

  async function onSubmit(data: AvdFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "avd",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      {/* AVD Básicas */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink-1">AVD Básicas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVD_BASICAS.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-kp-border px-3 py-2.5 hover:border-kp-border-md transition-colors"
            >
              <input
                type="checkbox"
                disabled={readOnly}
                className="w-4 h-4"
                style={{ accentColor: "var(--color-kp-accent)" }}
                checked={avdBasicasVal.includes(item)}
                onChange={() => toggleItem("avd_basicas", item, avdBasicasVal)}
              />
              <span className="text-sm text-ink-2">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AVD Instrumentales */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink-1">AVD Instrumentales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVD_INSTRUMENTALES.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-kp-border px-3 py-2.5 hover:border-kp-border-md transition-colors"
            >
              <input
                type="checkbox"
                disabled={readOnly}
                className="w-4 h-4"
                style={{ accentColor: "var(--color-kp-accent)" }}
                checked={avdInstrumentalesVal.includes(item)}
                onChange={() => toggleItem("avd_instrumentales", item, avdInstrumentalesVal)}
              />
              <span className="text-sm text-ink-2">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Nivel de independencia */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink-1">Nivel de independencia</label>
        <select
          disabled={readOnly}
          className={SELECT_CLASS}
          {...register("nivel_independencia")}
        >
          <option value="">— Seleccionar —</option>
          {NIVEL_INDEPENDENCIA_OPTS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <Textarea
        label="Observaciones AVD"
        placeholder="Observaciones sobre desempeño ocupacional…"
        rows={3}
        readOnly={readOnly}
        {...register("observaciones_avd")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── Destrezas Motoras ──────────────────────────────────────────────────────

const ESCALA_MOTORA_OPTS = [
  "Normal",
  "Levemente alterada",
  "Moderadamente alterada",
  "Severamente alterada",
];

type DestrezasFormData = {
  motricidad_fina: string;
  motricidad_gruesa: string;
  coordinacion: string;
  tono_muscular: string;
  observaciones_destrezas: string;
};

function DestrezasForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<DestrezasFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<DestrezasFormData>({
      defaultValues: {
        motricidad_fina: (d.motricidad_fina as string) ?? "",
        motricidad_gruesa: (d.motricidad_gruesa as string) ?? "",
        coordinacion: (d.coordinacion as string) ?? "",
        tono_muscular: (d.tono_muscular as string) ?? "",
        observaciones_destrezas: (d.observaciones_destrezas as string) ?? "",
      },
    });

  async function onSubmit(data: DestrezasFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "destrezas",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  const selectFields: { name: keyof DestrezasFormData; label: string }[] = [
    { name: "motricidad_fina",   label: "Motricidad fina" },
    { name: "motricidad_gruesa", label: "Motricidad gruesa" },
    { name: "coordinacion",      label: "Coordinación" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {selectFields.map(({ name, label }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">{label}</label>
            <select
              disabled={readOnly}
              className={SELECT_CLASS}
              {...register(name)}
            >
              <option value="">— Seleccionar —</option>
              {ESCALA_MOTORA_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Textarea
        label="Tono muscular"
        placeholder="Descripción del tono muscular general o por segmento…"
        rows={2}
        readOnly={readOnly}
        {...register("tono_muscular")}
      />
      <Textarea
        label="Observaciones"
        placeholder="Observaciones clínicas sobre destrezas motoras…"
        rows={3}
        readOnly={readOnly}
        {...register("observaciones_destrezas")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── Procesamiento Sensorial ────────────────────────────────────────────────

const SENSORIAL_OPTS_3 = ["Normal", "Hipersensible", "Hiposensible"];
const SENSORIAL_OPTS_4 = ["Normal", "Hipersensible", "Hiposensible", "No evaluado"];

type SensorialFormData = {
  sensibilidad_tactil: string;
  procesamiento_auditivo: string;
  procesamiento_visual: string;
  procesamiento_vestibular: string;
  sensory_profile_aplicado: boolean;
  observaciones_sensorial: string;
};

function SensorialForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<SensorialFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<SensorialFormData>({
      defaultValues: {
        sensibilidad_tactil:       (d.sensibilidad_tactil as string) ?? "",
        procesamiento_auditivo:    (d.procesamiento_auditivo as string) ?? "",
        procesamiento_visual:      (d.procesamiento_visual as string) ?? "",
        procesamiento_vestibular:  (d.procesamiento_vestibular as string) ?? "",
        sensory_profile_aplicado:  (d.sensory_profile_aplicado as boolean) ?? false,
        observaciones_sensorial:   (d.observaciones_sensorial as string) ?? "",
      },
    });

  async function onSubmit(data: SensorialFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "sensorial",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 3-option selects */}
        {(
          [
            { name: "sensibilidad_tactil",    label: "Sensibilidad táctil",       opts: SENSORIAL_OPTS_3 },
            { name: "procesamiento_auditivo", label: "Procesamiento auditivo",     opts: SENSORIAL_OPTS_3 },
            { name: "procesamiento_visual",   label: "Procesamiento visual",       opts: SENSORIAL_OPTS_3 },
          ] as { name: keyof SensorialFormData; label: string; opts: string[] }[]
        ).map(({ name, label, opts }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">{label}</label>
            <select
              disabled={readOnly}
              className={SELECT_CLASS}
              {...register(name)}
            >
              <option value="">— Seleccionar —</option>
              {opts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}

        {/* Vestibular: 4 options */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-1">Procesamiento vestibular</label>
          <select
            disabled={readOnly}
            className={SELECT_CLASS}
            {...register("procesamiento_vestibular")}
          >
            <option value="">— Seleccionar —</option>
            {SENSORIAL_OPTS_4.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sensory Profile checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-kp-border px-3 py-2.5 hover:border-kp-border-md transition-colors">
        <input
          type="checkbox"
          disabled={readOnly}
          className="w-4 h-4"
          style={{ accentColor: "var(--color-kp-accent)" }}
          {...register("sensory_profile_aplicado")}
        />
        <span className="text-sm text-ink-2">Se aplicó Sensory Profile 2</span>
      </label>

      <Textarea
        label="Observaciones"
        placeholder="Observaciones sobre procesamiento sensorial…"
        rows={3}
        readOnly={readOnly}
        {...register("observaciones_sensorial")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── Funciones Cognitivas ───────────────────────────────────────────────────

const COGNITIVO_OPTS = [
  "Normal",
  "Levemente alterada",
  "Moderadamente alterada",
  "Severamente alterada",
  "No evaluada",
];

const FUNCIONES_EJECUTIVAS_OPTS = [
  "Normal",
  "Levemente alterada",
  "Moderadamente alterada",
  "Severamente alterada",
  "No evaluadas",
];

type CognitivoFormData = {
  atencion: string;
  memoria: string;
  funciones_ejecutivas: string;
  observaciones_cognitivo: string;
};

function CognitivoForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<CognitivoFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<CognitivoFormData>({
      defaultValues: {
        atencion:                (d.atencion as string) ?? "",
        memoria:                 (d.memoria as string) ?? "",
        funciones_ejecutivas:    (d.funciones_ejecutivas as string) ?? "",
        observaciones_cognitivo: (d.observaciones_cognitivo as string) ?? "",
      },
    });

  async function onSubmit(data: CognitivoFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "cognitivo",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(
          [
            { name: "atencion", label: "Atención",  opts: COGNITIVO_OPTS },
            { name: "memoria",  label: "Memoria",   opts: COGNITIVO_OPTS },
            { name: "funciones_ejecutivas", label: "Funciones ejecutivas", opts: FUNCIONES_EJECUTIVAS_OPTS },
          ] as { name: keyof CognitivoFormData; label: string; opts: string[] }[]
        ).map(({ name, label, opts }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-sm font-medium text-ink-1">{label}</label>
            <select
              disabled={readOnly}
              className={SELECT_CLASS}
              {...register(name)}
            >
              <option value="">— Seleccionar —</option>
              {opts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Textarea
        label="Observaciones"
        placeholder="Observaciones sobre funciones cognitivas…"
        rows={3}
        readOnly={readOnly}
        {...register("observaciones_cognitivo")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── Contexto y Entorno ─────────────────────────────────────────────────────

const ENTORNO_OPTS = [
  "Hogar",
  "Escuela/trabajo",
  "Centro de salud",
  "Comunitario",
  "Múltiple",
];

type ContextoFormData = {
  entorno_principal: string;
  barreras_entorno: string;
  facilitadores_entorno: string;
};

function ContextoForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<ContextoFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<ContextoFormData>({
      defaultValues: {
        entorno_principal:    (d.entorno_principal as string) ?? "",
        barreras_entorno:     (d.barreras_entorno as string) ?? "",
        facilitadores_entorno:(d.facilitadores_entorno as string) ?? "",
      },
    });

  async function onSubmit(data: ContextoFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "contexto",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink-1">Entorno principal de intervención</label>
        <select
          disabled={readOnly}
          className={SELECT_CLASS}
          {...register("entorno_principal")}
        >
          <option value="">— Seleccionar —</option>
          {ENTORNO_OPTS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <Textarea
        label="Barreras del entorno"
        placeholder="Obstáculos arquitectónicos, actitudinales, sociales o tecnológicos…"
        rows={3}
        readOnly={readOnly}
        {...register("barreras_entorno")}
      />
      <Textarea
        label="Facilitadores del entorno"
        placeholder="Apoyos familiares, recursos comunitarios, adaptaciones existentes…"
        rows={3}
        readOnly={readOnly}
        {...register("facilitadores_entorno")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}

// ── Productos de Apoyo / Adaptaciones ─────────────────────────────────────

type ApoyoFormData = {
  productos_indicados: string;
  entrenamiento_requerido: string;
};

function ApoyoForm({ patientId, initialData, readOnly }: SubFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const d = initialData as Partial<ApoyoFormData>;

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<ApoyoFormData>({
      defaultValues: {
        productos_indicados:     (d.productos_indicados as string) ?? "",
        entrenamiento_requerido: (d.entrenamiento_requerido as string) ?? "",
      },
    });

  async function onSubmit(data: ApoyoFormData) {
    setServerError(null);
    setSaved(false);
    const result = await upsertEvaluacion(
      patientId,
      "Terapia Ocupacional",
      "apoyo",
      data as Record<string, unknown>
    );
    if (!result.success) { setServerError(result.error); return; }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <AlertBanner variant="danger">{serverError}</AlertBanner>}

      <Textarea
        label="Productos de apoyo o adaptaciones indicadas o en uso"
        placeholder="Ej: órtesis de muñeca, silla de ruedas, engrosadores de lápiz, modificación de utensilios…"
        rows={4}
        readOnly={readOnly}
        {...register("productos_indicados")}
      />
      <Textarea
        label="Entrenamiento requerido"
        placeholder="Entrenamiento al paciente o cuidador para el uso de productos indicados…"
        rows={3}
        readOnly={readOnly}
        {...register("entrenamiento_requerido")}
      />

      <SaveRow isSubmitting={isSubmitting} readOnly={readOnly} saved={saved} />
    </form>
  );
}
