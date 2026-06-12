"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { Scale, TrendingUp, Plus, ChevronDown, ChevronUp, Trash2, Loader2, Baby, HeartPulse } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { AntropometriaChart } from "./AntropometriaChart";
import {
  getAntropometriaByPaciente,
  registrarAntropometria,
  eliminarAntropometria,
} from "@/app/actions/clinico/antropometria";
import {
  calcularIMC,
  clasificarCircunferenciaCintura,
} from "@/lib/nutricion/antropometria";
import {
  calcularGrasaCorporal,
  calcularMasaMagra,
  getSitiosRequeridos,
  FORMULAS_PLIEGUES,
  SITIO_LABELS,
} from "@/lib/nutricion/pliegues";
import type { AntropometriaRecord, ModoAntropometria } from "@/types/antropometria";
import type { FormulaId, SitioPliegue } from "@/lib/nutricion/pliegues";
import { getBMIDataset, calcularIndicadorPediatrico } from "@/lib/nutricion/zscore";
import { clasificarGestacional, calcularSemanaGestacional, clasificarIMCPregestacional } from "@/lib/nutricion/atalah";

interface Props {
  pacienteId: string;
  idClinica: string;
  encuentroId?: string;
  sexoRegistral?: "M" | "F" | "Otro" | null;
  fechaNacimiento?: string | null;
  readOnly?: boolean;
}

type SexoCalculo = "M" | "F";

const IMC_CLASIFICACION_COLOR: Record<string, string> = {
  "Bajo peso": "#3B82F6",
  "Normal":    "#22C55E",
  "Sobrepeso": "#F59E0B",
  "Obesidad I":   "#F97316",
  "Obesidad II":  "#EF4444",
  "Obesidad III": "#991B1B",
};

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "short", year: "numeric",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function calcEdad(fechaNacimiento: string): number {
  return differenceInYears(new Date(), parseISO(fechaNacimiento));
}
function calcEdadMeses(fechaNacimiento: string): number {
  return differenceInMonths(new Date(), parseISO(fechaNacimiento));
}

const ZSCORE_COLORS: Record<string, string> = {
  "Desnutrición severa": "#991B1B",
  "Desnutrición":        "#EF4444",
  "Riesgo bajo peso":    "#F59E0B",
  "Normal":              "#22C55E",
  "Posible sobrepeso":   "#F97316",
  "Sobrepeso":           "#F97316",
  "Obesidad":            "#DC2626",
};

export function AntropometriaPanel({
  pacienteId,
  idClinica,
  encuentroId,
  sexoRegistral,
  fechaNacimiento,
  readOnly = false,
}: Props) {
  // ── Historial ──────────────────────────────────────────────────────────────
  const [historia, setHistoria] = useState<AntropometriaRecord[]>([]);
  const [loadingHistoria, setLoadingHistoria] = useState(true);
  const [showChart, setShowChart] = useState(false);

  const cargarHistoria = useCallback(async () => {
    setLoadingHistoria(true);
    const result = await getAntropometriaByPaciente(pacienteId);
    if (result.success) setHistoria(result.data);
    setLoadingHistoria(false);
  }, [pacienteId]);

  useEffect(() => { cargarHistoria(); }, [cargarHistoria]);

  // ── Form ───────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Basic
  const [pesoKg, setPesoKg] = useState("");
  const [tallaCm, setTallaCm] = useState("");
  const [circCintura, setCircCintura] = useState("");
  const [circCadera, setCircCadera] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // ── Detección de modo ──────────────────────────────────────────────────────
  const edadPaciente = fechaNacimiento ? calcEdad(fechaNacimiento) : null;
  const edadMesesPaciente = fechaNacimiento ? calcEdadMeses(fechaNacimiento) : null;
  const puedeSerPediatrico =
    edadPaciente !== null && edadPaciente < 19 &&
    (sexoRegistral === "M" || sexoRegistral === "F");

  const [embarazoActivo, setEmbarazoActivo] = useState(false);

  const modoDetectado: ModoAntropometria = embarazoActivo
    ? "gestacional"
    : puedeSerPediatrico
    ? "pediatrico"
    : "adulto";

  // ── Gestacional ────────────────────────────────────────────────────────────
  const [furInput, setFurInput] = useState("");
  const [semanaManual, setSemanaManual] = useState("");
  const [imcPregestacionalInput, setImcPregestacionalInput] = useState("");

  const semanaCalculada = furInput
    ? calcularSemanaGestacional(furInput)
    : semanaManual ? parseInt(semanaManual) : undefined;

  // Pliegues
  const [showPliegues, setShowPliegues] = useState(false);
  const [formula, setFormula] = useState<FormulaId>("durnin_womersley");
  const [sexoFormula, setSexoFormula] = useState<SexoCalculo>(
    sexoRegistral === "M" || sexoRegistral === "F" ? sexoRegistral : "M",
  );
  const [edadManual, setEdadManual] = useState("");
  const [pliegues, setPliegues] = useState<Partial<Record<SitioPliegue, string>>>({});

  const edad = fechaNacimiento ? calcEdad(fechaNacimiento) : (parseInt(edadManual) || undefined);
  const needsEdadInput = !fechaNacimiento && FORMULAS_PLIEGUES[formula].requiereEdad;
  const needsSexoInput = !sexoRegistral || sexoRegistral === "Otro";
  const sitiosRequeridos = getSitiosRequeridos(formula, sexoFormula);

  // ── Preview IMC (cliente) ──────────────────────────────────────────────────
  const peso = parseFloat(pesoKg);
  const talla = parseFloat(tallaCm);
  const previewIMC = !isNaN(peso) && !isNaN(talla) ? calcularIMC(peso, talla) : null;

  const circCinturaNum = parseFloat(circCintura);
  const previewCintura =
    !isNaN(circCinturaNum) && circCinturaNum > 0
      ? clasificarCircunferenciaCintura(
          circCinturaNum,
          sexoRegistral === "M" || sexoRegistral === "F" ? sexoRegistral : undefined,
        )
      : null;

  // ── Preview grasa corporal ─────────────────────────────────────────────────
  const plieguesNum: Partial<Record<SitioPliegue, number>> = {};
  for (const [k, v] of Object.entries(pliegues)) {
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) plieguesNum[k as SitioPliegue] = n;
  }

  const previewGrasa = showPliegues
    ? calcularGrasaCorporal({
        formula,
        pliegues: plieguesNum,
        sexo: sexoFormula,
        edad,
      })
    : null;

  const previewMasaMagra =
    previewGrasa && peso > 0 ? calcularMasaMagra(peso, previewGrasa.percGrasa) : null;

  // ── Preview z-score pediátrico ─────────────────────────────────────────────
  const previewZScore = useMemo(() => {
    if (modoDetectado !== "pediatrico") return null;
    if (!previewIMC || !sexoRegistral || sexoRegistral === "Otro") return null;
    if (edadMesesPaciente === null) return null;
    const sx = sexoRegistral as "M" | "F";
    return calcularIndicadorPediatrico(previewIMC.imc, edadMesesPaciente, getBMIDataset(sx, edadMesesPaciente));
  }, [modoDetectado, previewIMC, sexoRegistral, edadMesesPaciente]);

  // ── Preview Atalah gestacional ─────────────────────────────────────────────
  const previewAtalah = useMemo(() => {
    if (modoDetectado !== "gestacional") return null;
    const imcPre = parseFloat(imcPregestacionalInput);
    if (!previewIMC || isNaN(imcPre) || semanaCalculada === undefined || isNaN(semanaCalculada)) return null;
    return clasificarGestacional(imcPre, previewIMC.imc, semanaCalculada);
  }, [modoDetectado, previewIMC, imcPregestacionalInput, semanaCalculada]);

  // ── Resetear form ──────────────────────────────────────────────────────────
  function resetForm() {
    setPesoKg(""); setTallaCm(""); setCircCintura(""); setCircCadera("");
    setObservaciones(""); setPliegues({}); setEdadManual("");
    setFurInput(""); setSemanaManual(""); setImcPregestacionalInput("");
    setShowPliegues(false); setError(null); setSuccess(false);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const pesoNum = parseFloat(pesoKg);
    const tallaNum = parseFloat(tallaCm);
    if (isNaN(pesoNum) || pesoNum < 0.5 || pesoNum > 400)
      return setError("Peso inválido (0.5–400 kg).");
    if (isNaN(tallaNum) || tallaNum < 20 || tallaNum > 260)
      return setError("Talla inválida (20–260 cm).");

    const circCinturaNum2 = circCintura ? parseFloat(circCintura) : undefined;
    const circCaderaNum = circCadera ? parseFloat(circCadera) : undefined;

    const plieguesFinal: Partial<Record<SitioPliegue, number>> | undefined = showPliegues
      ? Object.fromEntries(
          Object.entries(plieguesNum).filter(([, v]) => !isNaN(v) && v > 0),
        ) as Partial<Record<SitioPliegue, number>>
      : undefined;

    const edadNum = edad;

    const imcPreNum = parseFloat(imcPregestacionalInput);

    startTransition(async () => {
      const result = await registrarAntropometria({
        idPaciente: pacienteId,
        idClinica,
        idEncuentro: encuentroId,
        modo: modoDetectado,
        peso_kg: pesoNum,
        talla_cm: tallaNum,
        circ_cintura_cm: circCinturaNum2 && !isNaN(circCinturaNum2) ? circCinturaNum2 : undefined,
        circ_cadera_cm: circCaderaNum && !isNaN(circCaderaNum) ? circCaderaNum : undefined,
        pliegues: plieguesFinal && Object.keys(plieguesFinal).length > 0 ? plieguesFinal : undefined,
        formula_grasa: showPliegues && plieguesFinal && Object.keys(plieguesFinal).length > 0
          ? formula
          : undefined,
        observaciones: observaciones.trim() || undefined,
        sexoRegistral: sexoFormula,
        edadAnios: edadNum,
        edadMeses: edadMesesPaciente ?? undefined,
        fur: furInput || undefined,
        semanaGestacional: semanaCalculada,
        imcPregestacional: !isNaN(imcPreNum) ? imcPreNum : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      resetForm();
      setShowForm(false);
      await cargarHistoria();
    });
  }

  // ── Eliminar registro ──────────────────────────────────────────────────────
  function handleEliminar(id: string) {
    startTransition(async () => {
      await eliminarAntropometria(id, pacienteId);
      await cargarHistoria();
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "var(--color-kp-border)" }}
      >
        <div className="flex items-center gap-2">
          <Scale size={16} style={{ color: "var(--color-kp-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Antropometría
          </span>
          {historia.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--color-kp-accent-xs)", color: "var(--color-kp-accent)" }}
            >
              {historia.length} registro{historia.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {historia.length >= 2 && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: "var(--color-ink-2)" }}
              onClick={() => setShowChart((p) => !p)}
            >
              <TrendingUp size={13} />
              {showChart ? "Ocultar gráfico" : "Ver evolución"}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg transition-colors"
              style={{
                background: showForm ? "var(--color-kp-accent-xs)" : "var(--color-kp-primary)",
                color: showForm ? "var(--color-kp-accent)" : "#fff",
              }}
              onClick={() => {
                setShowForm((p) => !p);
                if (showForm) resetForm();
              }}
            >
              {showForm ? (
                <><ChevronUp size={13} /> Cerrar</>
              ) : (
                <><Plus size={13} /> Nuevo registro</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Gráfico de evolución */}
      {showChart && historia.length >= 2 && (
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-kp-border)" }}>
          <AntropometriaChart data={historia} modo={modoDetectado} />
        </div>
      )}

      {/* Formulario nuevo registro */}
      {showForm && !readOnly && (
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-b space-y-4"
          style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
        >
          {error && <AlertBanner variant="danger">{error}</AlertBanner>}

          {/* Badge de modo */}
          {modoDetectado !== "adulto" && (
            <AlertBanner variant="warning">
              <span className="font-semibold">
                {modoDetectado === "pediatrico" ? "⚠️ Modo pediátrico" : "⚠️ Modo gestacional"} —
              </span>{" "}
              datos de referencia OMS/Atalah en validación clínica. Requiere verificación por nutricionista antes de uso diagnóstico.
            </AlertBanner>
          )}

          {/* Toggle embarazo (visible solo si no es pediátrico) */}
          {!puedeSerPediatrico && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                style={{
                  borderColor: embarazoActivo ? "var(--color-kp-warning)" : "var(--color-kp-border)",
                  background: embarazoActivo ? "#FEF3C722" : "var(--color-surface-1)",
                  color: embarazoActivo ? "#92400E" : "var(--color-ink-2)",
                }}
                onClick={() => setEmbarazoActivo((p) => !p)}
              >
                <HeartPulse size={13} />
                {embarazoActivo ? "Modo gestacional activo" : "Activar modo gestacional"}
              </button>
            </div>
          )}

          {/* Sección gestacional */}
          {modoDetectado === "gestacional" && (
            <div
              className="space-y-3 p-3 rounded-lg border"
              style={{ borderColor: "var(--color-kp-warning)", background: "#FEF3C711" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#92400E" }}>Datos gestacionales</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                    FUR (fecha última regla)
                  </label>
                  <Input
                    type="date"
                    value={furInput}
                    onChange={(e) => setFurInput(e.target.value)}
                  />
                  {semanaCalculada !== undefined && !isNaN(semanaCalculada) && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                      Semana gestacional estimada: <strong>{semanaCalculada}</strong>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                    Semana gestacional (manual)
                  </label>
                  <Input
                    type="number"
                    min={4}
                    max={42}
                    placeholder="Ej: 20"
                    value={semanaManual}
                    onChange={(e) => setSemanaManual(e.target.value)}
                    disabled={!!furInput}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                  IMC pregestacional
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min={10}
                  max={80}
                  placeholder="IMC antes del embarazo"
                  value={imcPregestacionalInput}
                  onChange={(e) => setImcPregestacionalInput(e.target.value)}
                  className="w-40"
                />
                {imcPregestacionalInput && !isNaN(parseFloat(imcPregestacionalInput)) && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                    Categoría: <strong>{clasificarIMCPregestacional(parseFloat(imcPregestacionalInput))}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Modo pediátrico: info de edad */}
          {modoDetectado === "pediatrico" && fechaNacimiento && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <Baby size={14} style={{ color: "#2563EB" }} />
              <span className="text-xs" style={{ color: "#1E40AF" }}>
                Paciente pediátrico — {edadPaciente} años ({edadMesesPaciente} meses)
              </span>
            </div>
          )}

          {/* Básico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                Peso (kg) *
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 70.5"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                Talla (cm) *
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 165"
                value={tallaCm}
                onChange={(e) => setTallaCm(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Preview IMC */}
          {previewIMC && (
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-kp-border)" }}
            >
              <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>IMC calculado</span>
              <span className="text-sm font-bold" style={{ color: "var(--color-ink-1)" }}>
                {previewIMC.imc.toFixed(1)}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${IMC_CLASIFICACION_COLOR[previewIMC.clasificacion] ?? "#94A3B8"}22`,
                  color: IMC_CLASIFICACION_COLOR[previewIMC.clasificacion] ?? "#94A3B8",
                }}
              >
                {previewIMC.clasificacion}
              </span>
              {previewIMC.riesgoCardiometabolico && (
                <span className="text-xs" style={{ color: "var(--color-kp-warning)" }}>
                  · {previewIMC.riesgoCardiometabolico}
                </span>
              )}
            </div>
          )}

          {/* Z-score pediátrico preview */}
          {modoDetectado === "pediatrico" && previewZScore && (
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <Baby size={13} style={{ color: "#2563EB" }} />
              <span className="text-xs" style={{ color: "#1E40AF" }}>Z-score IMC/edad</span>
              <span
                className="text-sm font-bold"
                style={{ color: ZSCORE_COLORS[previewZScore.clasificacion] ?? "#1E293B" }}
              >
                {previewZScore.z > 0 ? "+" : ""}{previewZScore.z.toFixed(2)}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${ZSCORE_COLORS[previewZScore.clasificacion] ?? "#94A3B8"}22`,
                  color: ZSCORE_COLORS[previewZScore.clasificacion] ?? "#94A3B8",
                }}
              >
                {previewZScore.clasificacion}
              </span>
              <span className="text-xs" style={{ color: "#1E40AF" }}>
                P{previewZScore.percentil}
              </span>
            </div>
          )}

          {/* Atalah gestacional preview */}
          {modoDetectado === "gestacional" && previewAtalah && (
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}
            >
              <HeartPulse size={13} style={{ color: "#92400E" }} />
              <span className="text-xs" style={{ color: "#92400E" }}>Atalah gestacional</span>
              <span
                className="text-sm font-bold"
                style={{ color: "#92400E" }}
              >
                {previewAtalah.descripcion}
              </span>
              <span className="text-xs" style={{ color: "#78350F" }}>
                Semana {previewAtalah.semana} · Ganancia recomendada: {previewAtalah.rangoGananciaTotal.min}–{previewAtalah.rangoGananciaTotal.max} kg
              </span>
            </div>
          )}

          {/* Circunferencias */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                Cintura (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 88"
                value={circCintura}
                onChange={(e) => setCircCintura(e.target.value)}
              />
              {previewCintura && (
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                  {previewCintura}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                Cadera (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 98"
                value={circCadera}
                onChange={(e) => setCircCadera(e.target.value)}
              />
            </div>
          </div>

          {/* Pliegues (colapsable) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--color-kp-accent)" }}
              onClick={() => setShowPliegues((p) => !p)}
            >
              {showPliegues ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Composición corporal por pliegues
            </button>

            {showPliegues && (
              <div className="mt-3 space-y-3">
                {/* Selector fórmula */}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                    Ecuación
                  </label>
                  <select
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--color-kp-border)",
                      background: "var(--color-surface-1)",
                      color: "var(--color-ink-1)",
                    }}
                    value={formula}
                    onChange={(e) => {
                      setFormula(e.target.value as FormulaId);
                      setPliegues({});
                    }}
                  >
                    {(Object.keys(FORMULAS_PLIEGUES) as FormulaId[]).map((id) => (
                      <option key={id} value={id}>
                        {FORMULAS_PLIEGUES[id].label} — {FORMULAS_PLIEGUES[id].poblacion}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                    {FORMULAS_PLIEGUES[formula].descripcion}
                  </p>
                </div>

                {/* Sexo para cálculo (si es necesario override) */}
                {needsSexoInput && FORMULAS_PLIEGUES[formula].requiereSexo && (
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                      Sexo biológico (para cálculo de pliegues)
                    </label>
                    <div className="flex gap-2">
                      {(["M", "F"] as SexoCalculo[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="px-4 py-1.5 text-sm rounded-lg border transition-colors"
                          style={{
                            borderColor: sexoFormula === s ? "var(--color-kp-primary)" : "var(--color-kp-border)",
                            background: sexoFormula === s ? "var(--color-kp-accent-xs)" : "var(--color-surface-1)",
                            color: sexoFormula === s ? "var(--color-kp-accent)" : "var(--color-ink-2)",
                            fontWeight: sexoFormula === s ? 600 : 400,
                          }}
                          onClick={() => { setSexoFormula(s); setPliegues({}); }}
                        >
                          {s === "M" ? "Masculino" : "Femenino"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edad (si no viene de fecha_nacimiento) */}
                {needsEdadInput && (
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                      Edad (años)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="Ej: 35"
                      value={edadManual}
                      onChange={(e) => setEdadManual(e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}

                {fechaNacimiento && edad !== undefined && (
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    Edad calculada desde fecha de nacimiento: <strong>{edad} años</strong>
                  </p>
                )}

                {/* Campos de pliegues dinámicos */}
                <div className="grid grid-cols-2 gap-3">
                  {sitiosRequeridos.map((sitio) => (
                    <div key={sitio}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
                        {SITIO_LABELS[sitio]} (mm)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={1}
                        max={100}
                        placeholder="mm"
                        value={pliegues[sitio] ?? ""}
                        onChange={(e) =>
                          setPliegues((p) => ({ ...p, [sitio]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Preview grasa */}
                {previewGrasa && (
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-kp-border)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>%&nbsp;Grasa</span>
                    <span className="text-sm font-bold" style={{ color: "var(--color-ink-1)" }}>
                      {previewGrasa.percGrasa.toFixed(1)}%
                    </span>
                    {previewMasaMagra !== null && (
                      <>
                        <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>Masa magra</span>
                        <span className="text-sm font-bold" style={{ color: "var(--color-ink-1)" }}>
                          {previewMasaMagra.toFixed(1)} kg
                        </span>
                      </>
                    )}
                    <span className="text-xs ml-auto" style={{ color: "var(--color-ink-3)" }}>
                      {FORMULAS_PLIEGUES[formula].label}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-ink-2)" }}>
              Observaciones
            </label>
            <textarea
              className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
              style={{
                borderColor: "var(--color-kp-border)",
                background: "var(--color-surface-1)",
                color: "var(--color-ink-1)",
                minHeight: 60,
              }}
              placeholder="Observaciones clínicas…"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <><Loader2 size={13} className="animate-spin mr-1" /> Guardando…</>
              ) : (
                "Guardar registro"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Historial */}
      <div className="px-5 py-3">
        {success && (
          <AlertBanner variant="success" className="mb-3">Registro guardado correctamente.</AlertBanner>
        )}

        {loadingHistoria ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-ink-3)" }} />
          </div>
        ) : historia.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--color-ink-3)" }}>
            Sin registros de antropometría.
          </p>
        ) : (
          <div className="space-y-2">
            {historia.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg border"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                      {r.peso_kg} kg · {r.talla_cm} cm
                    </span>
                    {r.imc != null && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${IMC_CLASIFICACION_COLOR[r.clasificacion ?? ""] ?? "#94A3B8"}22`,
                          color: IMC_CLASIFICACION_COLOR[r.clasificacion ?? ""] ?? "#94A3B8",
                        }}
                      >
                        IMC {r.imc.toFixed(1)} · {r.clasificacion}
                      </span>
                    )}
                    {r.perc_grasa != null && (
                      <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        {r.perc_grasa.toFixed(1)}% grasa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                      {formatFecha(r.registrado_at)}
                    </span>
                    {r.circ_cintura_cm && (
                      <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        Cintura: {r.circ_cintura_cm} cm
                      </span>
                    )}
                    {r.riesgo_cintura && (
                      <span className="text-xs" style={{ color: "var(--color-kp-warning)" }}>
                        {r.riesgo_cintura}
                      </span>
                    )}
                    {r.observaciones && (
                      <span
                        className="text-xs truncate max-w-xs"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        {r.observaciones}
                      </span>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-kp-danger)" }}
                    onClick={() => handleEliminar(r.id)}
                    title="Eliminar registro"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
