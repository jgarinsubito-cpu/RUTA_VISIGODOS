"use client";
/**
 * Cuenta: optional account (Google or email) for visit preferences and accessibility answers.
 * Guest use stays complete: trips, saved places and chats live on this device either way.
 */
import { useState } from "react";
import { accountActions, useAccount, type Result } from "@/state/account";
import { IconInfo } from "@/components/shell/icons";
import { AuthPanel, NewPasswordForm } from "@/components/account/AuthForms";
import { Preferences } from "@/components/account/Preferences";

const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-60";

function WhatIsStored() {
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
      <li className="flex items-start gap-2">
        <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
        En la cuenta: tus preferencias de visita y, solo si lo aceptas, tus respuestas de accesibilidad.
      </li>
      <li className="flex items-start gap-2">
        <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
        En este dispositivo: tu viaje, tus guardados y tus chats, con o sin cuenta.
      </li>
    </ul>
  );
}

function DeleteData() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  return (
    <section aria-labelledby="cuenta-datos" className="flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4 md:p-6">
      <h2 id="cuenta-datos" className="font-display text-xl text-ink">
        Tus datos
      </h2>
      <WhatIsStored />
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger/40 p-3">
          <p className="text-sm text-ink">¿Borrar tus preferencias y respuestas de accesibilidad de la cuenta? No se puede deshacer.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setResult(await accountActions.deleteProfile());
                setBusy(false);
                setConfirming(false);
              }}
              className="inline-flex min-h-11 items-center rounded-full bg-danger px-4 text-sm font-semibold text-surface disabled:opacity-60"
            >
              Sí, borrar mis datos
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondaryBtn}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${secondaryBtn} self-start`}>
          Borrar mis datos de la cuenta
        </button>
      )}
      <p aria-live="polite" className={`text-sm ${result && !result.ok ? "text-danger" : "text-ink-muted"}`}>
        {result?.message ?? ""}
      </p>
      <p className="text-xs text-ink-muted">Cerrar la cuenta de acceso por completo aún no está disponible desde la app.</p>
    </section>
  );
}

export default function CuentaPage() {
  const status = useAccount((s) => s.status);
  const email = useAccount((s) => s.email);
  const name = useAccount((s) => s.name);
  const profile = useAccount((s) => s.profile);
  const recovering = useAccount((s) => s.recovering);
  // Phones: the sign-in form opens on demand so preferences stay in view; desktop shows it.
  const [authOpen, setAuthOpen] = useState(false);

  const accountCard =
    status === "unavailable" ? (
      <p className="flex items-start gap-2 rounded-2xl border border-stone bg-surface p-5 text-sm text-ink-muted">
        <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
        Las cuentas no están disponibles en esta versión. Tus preferencias se guardan en este dispositivo.
      </p>
    ) : status === "loading" ? (
      <p aria-live="polite" className="rounded-2xl border border-stone bg-surface p-5 text-sm text-ink-muted">
        Comprobando tu sesión…
      </p>
    ) : status === "signed-out" ? (
      <section aria-labelledby="cuenta-entrar" className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-2">
          <h2 id="cuenta-entrar" className="font-display text-2xl text-ink">
            Tu cuenta
          </h2>
          <WhatIsStored />
        </div>
        <button
          type="button"
          aria-expanded={authOpen}
          aria-controls="cuenta-acceso"
          onClick={() => setAuthOpen((o) => !o)}
          className="btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold lg:hidden"
        >
          {authOpen ? "Ocultar" : "Entrar o crear cuenta"}
        </button>
        <div id="cuenta-acceso" className={`${authOpen ? "block" : "hidden"} lg:block`}>
          <AuthPanel initialMode="signin" />
        </div>
      </section>
    ) : (
      <section aria-labelledby="cuenta-sesion" className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-5 md:p-6">
        <h2 id="cuenta-sesion" className="sr-only">
          Sesión
        </h2>
        <p className="flex min-w-0 items-center gap-3 text-sm text-ink">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-muted font-display text-lg">
            {(name ?? email ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{name ?? "Tu cuenta"}</span>
            <span className="block truncate text-xs text-ink-muted">{email}</span>
          </span>
        </p>
        <WhatIsStored />
        <button type="button" onClick={() => void accountActions.signOut()} className={`${secondaryBtn} self-start`}>
          Cerrar sesión
        </button>
      </section>
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Cuenta</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{name ? `Hola, ${name.split(" ")[0]}` : "Tu visita, a tu manera"}</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Cuéntanos qué te interesa y cómo viajas. La cuenta es opcional: sin ella todo se guarda en este dispositivo.
        </p>
      </header>

      {status === "signed-in" && recovering && (
        <section className="rounded-2xl border border-stone bg-surface p-5 md:p-6">
          <NewPasswordForm />
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          {status !== "loading" && <Preferences key={`${status}:${profile ? JSON.stringify(profile) : "none"}`} />}
          {status === "signed-in" && <DeleteData />}
        </div>
        <aside className="order-1 flex flex-col gap-4 lg:sticky lg:top-6 lg:order-2">{accountCard}</aside>
      </div>
    </div>
  );
}
