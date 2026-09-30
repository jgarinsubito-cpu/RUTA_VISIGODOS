"use client";
/**
 * Preferences and accessibility on /cuenta.
 *   Guests: everything applies and is kept on this device.
 *   Signed in: explanation style, transport, interests, pace and group go to the account; access
 *   needs and display answers only with the consent box ticked, because they can reveal health
 *   information. Without consent they still apply on this device.
 */
import { useId, useState } from "react";
import type { TransportMode, VisitorPreferences, VisitorProfile } from "@/domain/types";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { actions, useAppState } from "@/state/store";
import { accountActions, useAccount, type Result } from "@/state/account";
import { PROFILE_HINT, PROFILE_LABEL } from "@/components/chat/format";
import { AccessNeedsPicker, ChipGroup, InterestTiles, PaceAndGroup } from "./Flairs";

type Display = "largerText" | "reduceMotion";
const DISPLAY_LABEL: Record<Display, string> = { largerText: "Texto más grande", reduceMotion: "Menos animaciones" };

export function Preferences() {
  const id = useId();
  const signedIn = useAccount((s) => s.status === "signed-in");
  const profile = useAccount((s) => s.profile);
  const display = useAccount((s) => s.display);
  const context = useAppState((s) => s.context);
  const devicePrefs = useAppState((s) => s.preferences);

  // Draft starts from the account when there is one, else from this device.
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile>(profile?.visitorProfile ?? context.profile);
  const [transport, setTransport] = useState<TransportMode>(profile?.transport ?? context.transport);
  const [prefs, setPrefs] = useState<VisitorPreferences>(
    profile
      ? {
          interests: profile.interests,
          pace: profile.pace,
          group: profile.group,
          accessNeeds: profile.accessibilityConsent ? profile.accessibility.needs : devicePrefs.accessNeeds,
        }
      : devicePrefs,
  );
  const [displayDraft, setDisplayDraft] = useState(
    profile?.accessibilityConsent ? { largerText: profile.accessibility.largerText, reduceMotion: profile.accessibility.reduceMotion } : display,
  );
  const [consent, setConsent] = useState(profile?.accessibilityConsent ?? false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function save() {
    setBusy(true);
    // Always apply here; the account only stores what the visitor agreed to.
    actions.setContext({ profile: visitorProfile, transport });
    actions.setPreferences(prefs);
    accountActions.setDisplay(displayDraft);
    const r = signedIn
      ? await accountActions.saveProfile({
          visitorProfile,
          transport,
          interests: prefs.interests,
          pace: prefs.pace,
          group: prefs.group,
          accessibility: { needs: prefs.accessNeeds, ...displayDraft },
          accessibilityConsent: consent,
        })
      : { ok: true as const, message: "Guardado en este dispositivo." };
    setResult(r);
    setBusy(false);
  }

  const selectedDisplay = (Object.keys(DISPLAY_LABEL) as Display[]).filter((k) => displayDraft[k]);

  const section = "flex flex-col gap-5 border-t border-stone pt-6";

  return (
    <form
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-6 rounded-2xl border border-stone bg-surface p-5 md:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void save();
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="font-display text-2xl text-ink">
          Tus preferencias
        </h2>
        <p className="text-sm text-ink-muted">
          Cambian el orden de lugares y rutas y cómo te responde el asistente.{" "}
          {signedIn ? "Se guardan en tu cuenta." : "Sin cuenta se guardan en este dispositivo."}
        </p>
      </div>

      <InterestTiles selected={prefs.interests} onChange={(interests) => setPrefs((p) => ({ ...p, interests }))} />

      <section aria-label="Cómo viajas" className={section}>
        <PaceAndGroup value={prefs} onChange={setPrefs} />
        <ChipGroup<TransportMode>
          legend="¿Cómo te desplazas normalmente?"
          multiple={false}
          options={(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((t) => ({ value: t, label: TRANSPORT_LABEL[t] }))}
          selected={[transport]}
          onToggle={(t) => setTransport(t)}
        />
        <ChipGroup<VisitorProfile>
          legend="¿Cómo quieres que te explique?"
          layout="cards"
          multiple={false}
          options={(Object.keys(PROFILE_LABEL) as VisitorProfile[]).map((p) => ({ value: p, label: PROFILE_LABEL[p], hint: PROFILE_HINT[p] }))}
          selected={[visitorProfile]}
          onToggle={(p) => setVisitorProfile(p)}
        />
      </section>

      <section aria-label="Accesibilidad" className={section}>
        <AccessNeedsPicker value={prefs.accessNeeds} onChange={(accessNeeds) => setPrefs((p) => ({ ...p, accessNeeds }))} />
        <ChipGroup<Display>
          legend="Lectura en pantalla"
          description="Se aplica en toda la app al guardar."
          multiple
          options={(Object.keys(DISPLAY_LABEL) as Display[]).map((k) => ({ value: k, label: DISPLAY_LABEL[k] }))}
          selected={selectedDisplay}
          onToggle={(k) => setDisplayDraft((d) => ({ ...d, [k]: !d[k] }))}
        />
        {signedIn && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-surface-muted p-4 text-sm text-ink">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">Guardar mis respuestas de accesibilidad en mi cuenta</span>
              <span className="text-xs text-ink-muted">
                Pueden revelar información de salud, así que solo las guardamos si lo aceptas. Sin marcarlo se aplican solo en este
                dispositivo. Puedes retirar el permiso cuando quieras.
              </span>
            </span>
          </label>
        )}
      </section>

      <div className="sticky bottom-[calc(var(--mobile-nav)+env(safe-area-inset-bottom))] -mx-5 -mb-5 flex flex-col gap-2 rounded-b-2xl border-t border-stone bg-surface/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center md:bottom-0 md:-mx-7 md:-mb-7 md:px-7">
        <button type="submit" disabled={busy} className="btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold disabled:opacity-60">
          {busy ? "Guardando…" : "Guardar preferencias"}
        </button>
        <p aria-live="polite" className={`text-sm ${result && !result.ok ? "text-danger" : "text-ink-muted"}`}>
          {result?.message ?? "Si tu viaje ya tiene paradas, no cambia: podrás recalcularlo en Mi viaje."}
        </p>
      </div>
    </form>
  );
}
