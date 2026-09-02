"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, AlertTriangle } from "lucide-react";
import { generarNotaAmbient } from "@/app/actions/ambient/generar-nota";
import { connectSttStream, type SttStreamHandle } from "@/lib/ambient/stt-stream";
import type { BorradorNota } from "@/lib/ia/copiloto-nota/types";

interface AmbientRecorderProps {
  encuentroId: string;
  idClinica: string;
  idPaciente: string;
  /** Mismo contrato que CopilotoNotaButton — el borrador resultante alimenta el mismo CopilotoNotaPanel. */
  onBorradorReady: (borrador: BorradorNota) => void;
}

type Estado = "idle" | "solicitando-permiso" | "grabando" | "generando" | "error";

/**
 * AMB-1 F2/F3/F4 — botón de grabación de consulta. Nunca bloquea el encuentro:
 * cualquier fallo (permiso de mic, token, STT, IA) degrada a mensaje inline y
 * el profesional sigue con la nota manual (criterio F2/F3, AMB-1-ambient-scribe.md).
 *
 * El indicador de "grabando" es visible mientras dura la captura — nunca se
 * graba de forma no evidente (§7).
 */
export function AmbientRecorder({ encuentroId, idClinica, idPaciente, onBorradorReady }: AmbientRecorderProps) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reconectando, setReconectando] = useState(false);
  const [elapsedS, setElapsedS] = useState(0);

  const transcriptRef = useRef("");
  const streamHandleRef = useRef<SttStreamHandle | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupMedia = () => {
    streamHandleRef.current?.stop();
    streamHandleRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  async function handleIniciar() {
    setErrorMsg(null);
    setReconectando(false);
    setEstado("solicitando-permiso");

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setEstado("error");
      setErrorMsg("Permiso de micrófono denegado. Puedes redactar la nota manualmente.");
      return;
    }
    mediaStreamRef.current = mediaStream;

    let res: Response;
    try {
      res = await fetch(
        `/api/ambient/token?idEncuentro=${encodeURIComponent(encuentroId)}&idPaciente=${encodeURIComponent(idPaciente)}`,
        { cache: "no-store" }
      );
    } catch {
      cleanupMedia();
      setEstado("error");
      setErrorMsg("No se pudo contactar el servicio de grabación. Puedes redactar la nota manualmente.");
      return;
    }
    const body = await res.json().catch(() => ({}) as { error?: string; token?: string; wsUrl?: string });
    if (!res.ok || !body.token || !body.wsUrl) {
      cleanupMedia();
      setEstado("error");
      setErrorMsg(body.error ?? "No se pudo iniciar la grabación. Puedes redactar la nota manualmente.");
      return;
    }

    transcriptRef.current = "";
    setElapsedS(0);
    setEstado("grabando");
    timerRef.current = setInterval(() => setElapsedS((s) => s + 1), 1000);

    streamHandleRef.current = connectSttStream(body.wsUrl, body.token, mediaStream, {
      onTranscriptChunk: (text) => {
        transcriptRef.current = `${transcriptRef.current} ${text}`.trim();
      },
      onDisconnect: () => setReconectando(true),
      onError: (message) => setErrorMsg(message),
    });
  }

  async function handleDetener() {
    cleanupMedia();
    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      setEstado("idle");
      setErrorMsg("No se capturó transcripción. Puedes redactar la nota manualmente.");
      return;
    }
    setEstado("generando");
    const result = await generarNotaAmbient({ idEncuentro: encuentroId, idClinica, transcript });
    if (!result.success) {
      setEstado("error");
      setErrorMsg(result.error);
      return;
    }
    onBorradorReady(result.data);
    setEstado("idle");
  }

  if (estado === "grabando" || estado === "generando") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {reconectando && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-kp-warning, #F5A623)" }}>
              <AlertTriangle className="w-3 h-3" />
              Conexión perdida — transcripción conservada
            </span>
          )}
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-white"
            style={{ background: "var(--color-kp-danger, #DC2626)" }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
            {estado === "generando" ? "Generando borrador…" : `Grabando ${formatTimer(elapsedS)}`}
          </span>
          {estado === "grabando" && (
            <button
              type="button"
              onClick={handleDetener}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border"
              style={{ borderColor: "var(--color-kp-border, #E2E8F0)", color: "var(--color-ink-2, #475569)" }}
            >
              <Square className="w-3 h-3" />
              Detener
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleIniciar}
        disabled={estado === "solicitando-permiso"}
        title="Grabar consulta y generar borrador con IA (Ambient Scribe)"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          color: "var(--color-kp-danger, #DC2626)",
          borderColor: "var(--color-kp-danger, #DC2626)",
          background: "transparent",
        }}
      >
        {estado === "solicitando-permiso" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
        {estado === "solicitando-permiso" ? "Conectando…" : "Ambient Scribe"}
      </button>
      {errorMsg && <p className="text-xs text-red-600 text-right max-w-56">{errorMsg}</p>}
    </div>
  );
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
