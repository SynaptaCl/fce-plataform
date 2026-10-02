"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Timeout de sesión por inactividad.
 *
 * La FCE se usa en computadores compartidos por box: si un profesional se
 * aleja sin cerrar sesión, la sesión debe expirar para que la siguiente
 * persona no herede su contexto clínico (perfil activo, RLS, auditoría).
 *
 * Comportamiento:
 * - Tras IDLE_LIMIT_MS sin interacción (mouse, teclado, scroll, touch) se
 *   muestra un aviso con cuenta regresiva de WARNING_MS.
 * - Si nadie confirma "Continuar sesión", se cierra la sesión (signOut) y
 *   se redirige a /login?motivo=expirada.
 * - Mientras el aviso está abierto, la actividad NO reinicia el timer:
 *   confirmar es explícito (evita que un tercero mantenga viva la sesión
 *   ajena con un clic cualquiera).
 * - El timestamp de última actividad se sincroniza entre pestañas vía
 *   localStorage: actividad en una pestaña mantiene vivas las demás.
 */

const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 min sin actividad → aviso
const WARNING_MS = 60 * 1000; // 60 s de cuenta regresiva antes de cerrar
const LAST_ACTIVITY_KEY = "fce_last_activity";
// Throttle de escrituras a localStorage (no escribir en cada tecla)
const WRITE_THROTTLE_MS = 5000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
];

export function SessionIdleTimeout() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const lastActivityRef = useRef<number>(0);
  const lastWriteRef = useRef<number>(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      /* localStorage no disponible: timer por pestaña */
    }

    const persistActivity = (ts: number) => {
      lastActivityRef.current = ts;
      if (ts - lastWriteRef.current < WRITE_THROTTLE_MS) return;
      lastWriteRef.current = ts;
      try {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
      } catch {
        /* noop */
      }
    };

    const onActivity = () => {
      if (secondsLeftRef.current !== null) return; // aviso abierto: requerir confirmación explícita
      persistActivity(Date.now());
    };

    // Sincronización entre pestañas: otra pestaña activa nos mantiene vivos
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVITY_KEY || !e.newValue) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts)) {
        lastActivityRef.current = Math.max(lastActivityRef.current, ts);
      }
    };

    // Ref espejo de secondsLeft para leerlo dentro de onActivity sin
    // re-registrar listeners en cada render.
    const secondsLeftRef = { current: null as number | null };
    const setSecondsLeftSynced = (v: number | null) => {
      secondsLeftRef.current = v;
      setSecondsLeft(v);
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    window.addEventListener("storage", onStorage);

    const interval = window.setInterval(async () => {
      if (loggingOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_LIMIT_MS + WARNING_MS) {
        loggingOutRef.current = true;
        setClosing(true);
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } finally {
          try {
            window.localStorage.removeItem(LAST_ACTIVITY_KEY);
          } catch {
            /* noop */
          }
          router.replace("/login?motivo=expirada");
          router.refresh();
        }
        return;
      }

      if (elapsed >= IDLE_LIMIT_MS) {
        setSecondsLeftSynced(
          Math.ceil((IDLE_LIMIT_MS + WARNING_MS - elapsed) / 1000)
        );
      } else if (secondsLeftRef.current !== null) {
        // Alguien confirmó en otra pestaña (storage actualizó el timestamp)
        setSecondsLeftSynced(null);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    const now = Date.now();
    lastActivityRef.current = now;
    lastWriteRef.current = now;
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      /* noop */
    }
    setSecondsLeft(null);
  }

  if (secondsLeft === null && !closing) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Sesión a punto de expirar"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="bg-surface-1 rounded-xl shadow-2xl"
        style={{ width: "min(92vw, 380px)", padding: 28, textAlign: "center" }}
      >
        <div
          className="bg-kp-warning-lt rounded-full"
          style={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Timer className="w-7 h-7 text-kp-warning" />
        </div>

        <h2
          className="text-ink-1"
          style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}
        >
          ¿Sigues aquí?
        </h2>
        <p
          className="text-ink-3"
          style={{ fontSize: 14, marginBottom: 4, lineHeight: 1.5 }}
        >
          Por seguridad, la sesión se cerrará por inactividad en este
          computador compartido.
        </p>

        {closing ? (
          <p
            className="text-kp-danger"
            style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}
          >
            Cerrando sesión…
          </p>
        ) : (
          <>
            <p
              className="text-kp-danger"
              style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 20px", fontVariantNumeric: "tabular-nums" }}
            >
              {Math.max(0, secondsLeft ?? 0)}s
            </p>
            <button
              type="button"
              onClick={handleContinue}
              autoFocus
              className="bg-kp-accent hover:bg-kp-accent-md text-white font-semibold rounded-lg transition-colors text-sm cursor-pointer"
              style={{ width: "100%", padding: "10px 0" }}
            >
              Continuar sesión
            </button>
            <p
              className="text-ink-4"
              style={{ fontSize: 12, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Si no eres el usuario de esta sesión, no la continúes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
