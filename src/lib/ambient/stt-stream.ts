"use client";

/**
 * AMB-1 F2 — capa de streaming STT, aislada a propósito.
 *
 * El wire protocol (formato de mensajes, framing de audio) es específico de
 * cada proveedor y el spike F0 (AssemblyAI vs Deepgram, audio real chileno)
 * sigue sin resolverse — ver AMB-1-ambient-scribe.md §6. `parseTranscriptMessage`
 * intenta las formas más comunes de ambos, pero es best-effort: validar contra
 * el proveedor real antes de confiar en esto para producción.
 *
 * Todo lo que consume este módulo (AmbientRecorder, el Route Handler de token,
 * generarNotaAmbient) es estable — cuando el spike resuelva el proveedor, el
 * cambio queda contenido acá.
 */

export interface SttStreamHandle {
  stop: () => void;
}

export interface SttStreamCallbacks {
  onTranscriptChunk: (text: string) => void;
  onDisconnect: () => void;
  onError: (message: string) => void;
}

function parseTranscriptMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text;
  if (typeof obj.transcript === "string") return obj.transcript;
  const channel = obj.channel as { alternatives?: { transcript?: string }[] } | undefined;
  const dgTranscript = channel?.alternatives?.[0]?.transcript;
  if (typeof dgTranscript === "string") return dgTranscript;
  return null;
}

/** Abre el WebSocket al proveedor STT y streamea el MediaStream en chunks de 250ms. */
export function connectSttStream(
  wsUrl: string,
  token: string,
  mediaStream: MediaStream,
  callbacks: SttStreamCallbacks
): SttStreamHandle {
  const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
  let recorder: MediaRecorder | null = null;

  ws.onopen = () => {
    recorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm;codecs=opus" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
      }
    };
    recorder.start(250);
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const text = parseTranscriptMessage(parsed);
      if (text) callbacks.onTranscriptChunk(text);
    } catch {
      // Mensaje no-JSON (binario/keepalive de proveedor) — ignorar.
    }
  };

  ws.onerror = () => callbacks.onError("Error de conexión con el servicio de transcripción.");
  ws.onclose = () => callbacks.onDisconnect();

  return {
    stop: () => {
      try {
        recorder?.stop();
      } catch {
        // recorder ya detenido/inválido — no bloquear el cierre del socket por esto.
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}
