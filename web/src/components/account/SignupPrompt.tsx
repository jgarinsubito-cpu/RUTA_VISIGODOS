"use client";
/**
 * One-time onboarding, shown to guests once the answer to their second question has arrived
 * (never while an answer is loading or a trip change is under review). One question per step:
 *   1. interests (photo tiles)  2. pace and company  3. access needs  4. account (optional).
 * Each answer applies on this device at once; "Saltar" moves on without answering. Access needs
 * stay on the device until the visitor consents on /cuenta. Escape, the close button or
 * "Seguir sin cuenta" dismiss it for good on this device.
 */
import { useId, useRef, useState } from "react";
import type { VisitorPreferences } from "@/domain/types";
import { useAccount } from "@/state/account";
import { actions, useAppState } from "@/state/store";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { IconChevronLeft, IconClose } from "@/components/shell/icons";
import { AuthPanel } from "./AuthForms";
import { AccessNeedsPicker, InterestTiles, PaceAndGroup } from "./Flairs";

const DISMISSED_KEY = "ruta-visigoda:signup-prompt";
/** Shown after this many questions from the visitor on this device. */
export const PROMPT_AFTER_MESSAGES = 2;

const STEPS = [
  { key: "interests", title: "¿Qué te gustaría descubrir?", intro: "Elige todos los que quieras: ordenamos lugares y rutas según esto y el asistente te recomienda mejor." },
  { key: "style", title: "¿Cómo viajas?", intro: "Ajustamos cuántas paradas te proponemos y el tono de las respuestas." },
  { key: "access", title: "Accesibilidad", intro: "Opcional. Se queda en este dispositivo salvo que aceptes guardarlo en tu cuenta." },
  {
    key: "account",
    title: "Guarda tus preferencias",
    intro: "Ya se aplican aquí. Con una cuenta gratuita las tendrás en cualquier dispositivo. Tu viaje y tus chats siguen en este dispositivo.",
  },
] as const;

function wasDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "dismissed");
  } catch {
    // Storage blocked: it may show again next visit, never twice in this one.
  }
}

/** `ready`: the chat is idle (latest answer shown, nothing being reviewed). */
export function SignupPrompt({ ready }: { ready: boolean }) {
  const status = useAccount((s) => s.status);
  const questions = useAppState((s) => s.conversations.reduce((n, c) => n + c.messages.filter((m) => m.role === "user").length, 0));
  const devicePrefs = useAppState((s) => s.preferences);
  const [closed, setClosed] = useState(false);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<VisitorPreferences>(devicePrefs);
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const open = !closed && ready && status === "signed-out" && questions >= PROMPT_AFTER_MESSAGES && !wasDismissed();

  function dismiss() {
    rememberDismissed();
    setClosed(true);
  }

  function go(next: number) {
    actions.setPreferences(prefs);
    setStep(next);
    bodyRef.current?.scrollTo({ top: 0 });
    // Announce the new step by moving focus to its heading.
    requestAnimationFrame(() => document.getElementById(titleId)?.focus());
  }

  useFocusTrap(ref, open, dismiss);
  if (!open) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-scrim" onClick={dismiss} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl focus:outline-none md:max-w-2xl md:rounded-2xl"
      >
        <header className="flex flex-col gap-3 border-b border-stone px-5 pb-4 pt-3">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => go(step - 1)}
                className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                <IconChevronLeft width={18} height={18} />
                Atrás
              </button>
            ) : (
              <span className="text-sm font-semibold text-ink-muted">Personaliza tu visita</span>
            )}
            <span className="ml-auto text-xs text-ink-muted">
              Paso {step + 1} de {STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
            >
              <IconClose />
            </button>
          </div>
          <div aria-hidden="true" className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-stone"}`} />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <h2 id={titleId} tabIndex={-1} data-autofocus className="font-display text-2xl leading-tight text-ink focus:outline-none">
              {current.title}
            </h2>
            <p id={descId} className="text-sm text-ink-muted">
              {current.intro}
            </p>
          </div>
        </header>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {current.key === "interests" && (
            <InterestTiles visibleLegend={false} selected={prefs.interests} onChange={(interests) => setPrefs((p) => ({ ...p, interests }))} />
          )}
          {current.key === "style" && <PaceAndGroup value={prefs} onChange={setPrefs} />}
          {current.key === "access" && (
            <AccessNeedsPicker value={prefs.accessNeeds} onChange={(accessNeeds) => setPrefs((p) => ({ ...p, accessNeeds }))} />
          )}
          {current.key === "account" && <AuthPanel initialMode="signup" onDone={dismiss} />}
        </div>

        <footer className="flex items-center gap-3 border-t border-stone px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:pb-4">
          {last ? (
            <button type="button" onClick={dismiss} className="ml-auto min-h-11 rounded-full px-4 text-sm font-semibold text-ink-muted hover:text-ink">
              Seguir sin cuenta
            </button>
          ) : (
            <>
              <button type="button" onClick={() => go(step + 1)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                Saltar
              </button>
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="btn-primary ml-auto inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
              >
                Continuar
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
