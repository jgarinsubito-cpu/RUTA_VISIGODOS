"use client";
/**
 * Account access: "Entrar" / "Crear cuenta" tabs, Google when enabled, a complete sign-up form
 * (name, email, password twice with strength hint, optional country, privacy acceptance), password
 * reset, and the "new password" form reached from a reset link. Fields are labelled, errors are
 * tied to their field and announced.
 */
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { accountActions, useAccount, type Result } from "@/state/account";

const field =
  "min-h-11 w-full rounded-xl border border-stone bg-surface px-3 text-base text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";
const label = "text-sm font-semibold text-ink";
const primary = "btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60";
const secondary =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-60";

/** Countries most visitors come from; anything else is "Otro país". */
const COUNTRIES: [string, string][] = [
  ["ES", "España"],
  ["PT", "Portugal"],
  ["FR", "Francia"],
  ["IT", "Italia"],
  ["DE", "Alemania"],
  ["GB", "Reino Unido"],
  ["US", "Estados Unidos"],
  ["MX", "México"],
  ["AR", "Argentina"],
  ["CO", "Colombia"],
  ["CL", "Chile"],
  ["ZZ", "Otro país"],
];

function Feedback({ result }: { result: Result | null }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-sm ${result && !result.ok ? "text-danger" : "text-ink-muted"}`}>
      {result?.message ?? ""}
    </p>
  );
}

function Field({ id, label: text, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${field} pr-24`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-full px-3 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        {shown ? "Ocultar" : "Mostrar"}
        <span className="sr-only"> contraseña</span>
      </button>
    </div>
  );
}

/** 0–3: length, mixed case, digits/symbols. Guidance only; the server sets the real rule. */
function strength(p: string): number {
  if (p.length < 8) return 0;
  let score = 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  else if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score += p.length >= 12 ? 1 : 0;
  return Math.min(score, 3);
}

const STRENGTH_TEXT = ["Al menos 8 caracteres", "Aceptable", "Buena", "Muy buena"];

function StrengthMeter({ password }: { password: string }) {
  const level = strength(password);
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${level >= i ? "bg-ink" : "bg-stone"}`} />
        ))}
      </span>
      <span>Seguridad: {STRENGTH_TEXT[level]}</span>
    </span>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={18} height={18}>
      <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" opacity=".9" />
      <path fill="currentColor" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" opacity=".7" />
      <path fill="currentColor" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" opacity=".5" />
      <path fill="currentColor" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" opacity=".8" />
    </svg>
  );
}

/** Hidden until Google sign-in is switched on in the Supabase project. */
export function GoogleButton({ autoFocus = false }: { autoFocus?: boolean }) {
  const enabled = useAccount((s) => s.googleEnabled);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  if (!enabled) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        data-autofocus={autoFocus ? "" : undefined}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await accountActions.signInWithGoogle();
          // On success the browser leaves for Google; only failures come back here.
          if (!r.ok) {
            setResult(r);
            setBusy(false);
          }
        }}
        className={secondary}
      >
        <GoogleMark />
        {busy ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {result && <Feedback result={result} />}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignInForm({ onForgot, onDone }: { onForgot: () => void; onDone?: () => void }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setResult({ ok: false, message: "Escribe tu correo y tu contraseña." });
      return;
    }
    setBusy(true);
    const r = await accountActions.signIn(email.trim(), password);
    setBusy(false);
    setResult(r);
    if (r.ok) onDone?.();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${id}-email`} label="Correo electrónico">
        <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </Field>
      <Field id={`${id}-password`} label="Contraseña">
        <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <button type="button" onClick={onForgot} className="-mt-2 min-h-11 self-start text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
        He olvidado la contraseña
      </button>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <Feedback result={result} />
    </form>
  );
}

function SignUpForm({ onDone }: { onDone?: () => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [country, setCountry] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const errors = {
    name: name.trim().length < 2 ? "Escribe tu nombre." : undefined,
    email: !EMAIL_RE.test(email.trim()) ? "Escribe un correo válido." : undefined,
    password: password.length < 8 ? "Usa al menos 8 caracteres." : undefined,
    repeat: repeat !== password ? "Las contraseñas no coinciden." : undefined,
    privacy: !privacy ? "Necesitamos que aceptes la información de privacidad." : undefined,
  };
  const show = (e: string | undefined) => (tried ? e : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (busy || Object.values(errors).some(Boolean)) {
      setResult({ ok: false, message: "Revisa los campos marcados." });
      return;
    }
    setBusy(true);
    const r = await accountActions.signUp(email.trim(), password, {
      fullName: name.trim(),
      country: country || null,
      privacyAcceptedAt: new Date().toISOString(),
    });
    setBusy(false);
    setResult(r);
    if (r.ok && !r.message) onDone?.();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${id}-name`} label="Nombre" error={show(errors.name)}>
        <input
          id={`${id}-name`}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(show(errors.name)) || undefined}
          aria-describedby={show(errors.name) ? `${id}-name-error` : undefined}
          className={field}
        />
      </Field>
      <Field id={`${id}-email`} label="Correo electrónico" error={show(errors.email)} hint="Te enviaremos un enlace para confirmarlo.">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(show(errors.email)) || undefined}
          aria-describedby={show(errors.email) ? `${id}-email-error` : `${id}-email-hint`}
          className={field}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-password`} label="Contraseña" error={show(errors.password)} hint={<StrengthMeter password={password} />}>
          <PasswordInput
            id={`${id}-password`}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={Boolean(show(errors.password))}
            describedBy={show(errors.password) ? `${id}-password-error` : `${id}-password-hint`}
          />
        </Field>
        <Field id={`${id}-repeat`} label="Repite la contraseña" error={show(errors.repeat)}>
          <PasswordInput
            id={`${id}-repeat`}
            value={repeat}
            onChange={setRepeat}
            autoComplete="new-password"
            invalid={Boolean(show(errors.repeat))}
            describedBy={show(errors.repeat) ? `${id}-repeat-error` : undefined}
          />
        </Field>
      </div>
      <Field id={`${id}-country`} label="País de residencia (opcional)">
        <select id={`${id}-country`} value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
          <option value="">Prefiero no decirlo</option>
          {COUNTRIES.map(([code, nameEs]) => (
            <option key={code} value={code}>
              {nameEs}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            aria-invalid={Boolean(show(errors.privacy)) || undefined}
            aria-describedby={show(errors.privacy) ? `${id}-privacy-error` : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            He leído la{" "}
            <Link href="/privacidad" target="_blank" className="font-semibold underline underline-offset-4">
              información de privacidad
              <span className="sr-only"> (abre en otra pestaña)</span>
            </Link>{" "}
            y acepto crear la cuenta.
          </span>
        </label>
        {show(errors.privacy) && (
          <p id={`${id}-privacy-error`} className="text-xs text-danger">
            {errors.privacy}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <Feedback result={result} />
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) {
          setResult({ ok: false, message: "Escribe un correo válido." });
          return;
        }
        setBusy(true);
        setResult(await accountActions.sendPasswordReset(email.trim()));
        setBusy(false);
      }}
    >
      <p className="text-sm text-ink-muted">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <Field id={`${id}-email`} label="Correo electrónico">
        <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </Field>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Enviando…" : "Enviar enlace"}
      </button>
      <Feedback result={result} />
      <button type="button" onClick={onBack} className="min-h-11 self-start text-sm font-semibold text-ink underline-offset-4 hover:underline">
        Volver a entrar
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const id = useId();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) {
          setResult({ ok: false, message: "La contraseña debe tener al menos 8 caracteres." });
          return;
        }
        setBusy(true);
        setResult(await accountActions.updatePassword(password));
        setBusy(false);
      }}
    >
      <h2 className="font-display text-xl text-ink">Elige una contraseña nueva</h2>
      <Field id={`${id}-new`} label="Contraseña nueva" hint={<StrengthMeter password={password} />}>
        <PasswordInput id={`${id}-new`} value={password} onChange={setPassword} autoComplete="new-password" describedBy={`${id}-new-hint`} />
      </Field>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Guardando…" : "Guardar contraseña"}
      </button>
      <Feedback result={result} />
    </form>
  );
}

type Mode = "signin" | "signup" | "reset";

/** Switch between signing in and creating an account; Google above both when enabled. */
export function AuthPanel({ initialMode = "signup", onDone, autoFocus = false }: { initialMode?: "signin" | "signup"; onDone?: () => void; autoFocus?: boolean }) {
  const google = useAccount((s) => s.googleEnabled);
  const [mode, setMode] = useState<Mode>(initialMode);
  const tabId = useId();
  const tab = (m: "signin" | "signup", text: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      aria-controls={`${tabId}-panel`}
      onClick={() => setMode(m)}
      className={`min-h-11 flex-1 rounded-full text-sm transition-colors ${
        mode === m ? "bg-surface font-semibold text-ink shadow-[0_1px_3px_var(--shadow)]" : "text-ink-muted hover:text-ink"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {mode !== "reset" && (
        <div role="group" aria-label="Entrar o crear cuenta" className="flex rounded-full bg-surface-muted p-1">
          {tab("signin", "Entrar")}
          {tab("signup", "Crear cuenta")}
        </div>
      )}
      {mode !== "reset" && google && (
        <>
          <GoogleButton autoFocus={autoFocus} />
          <p className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-stone" />o con tu correo<span className="h-px flex-1 bg-stone" />
          </p>
        </>
      )}
      <div id={`${tabId}-panel`}>
        {mode === "signin" && <SignInForm onForgot={() => setMode("reset")} onDone={onDone} />}
        {mode === "signup" && <SignUpForm onDone={onDone} />}
        {mode === "reset" && <ResetForm onBack={() => setMode("signin")} />}
      </div>
    </div>
  );
}
