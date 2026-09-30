"use client";
/**
 * Optional visitor account (Supabase Auth + public.profiles). Guest use stays the default: trips,
 * saved places and chats remain on this device whether or not the visitor signs in.
 *
 * What an account stores: visit preferences (explanation profile, transport, interests, pace,
 * who they travel with) and, only with explicit consent, accessibility needs and display answers. Signing in applies them to the trip context through actions.setContext,
 * which never reschedules a trip that has stops (product rule 3).
 *
 * Display answers (larger text, less motion) also work without an account: they are kept on this
 * device and applied to <html> as data attributes (globals.css).
 */
import { useSyncExternalStore } from "react";
import type { AuthError, PostgrestError, Session } from "@supabase/supabase-js";
import { ACCESS_NEEDS, type AccessNeed, type TransportMode, type TravelGroup, type TravelPace, type VisitorPreferences, type VisitorProfile } from "@/domain/types";
import { enabledProviders, supabase, supabaseConfigured } from "@/lib/supabase";
import { actions as appActions, getAppState } from "./store";

export interface AccessibilityAnswers {
  /** Access needs to consider in recommendations (step-free ones switch on the planner check). */
  needs: AccessNeed[];
  /** Larger text across the app. */
  largerText: boolean;
  /** Fewer animations, whatever the system setting says. */
  reduceMotion: boolean;
}

export interface AccountProfile {
  visitorProfile: VisitorProfile;
  transport: TransportMode;
  interests: string[];
  pace: TravelPace | null;
  group: TravelGroup | null;
  accessibility: AccessibilityAnswers;
  /** Accessibility answers are stored in the account only while this is true. */
  accessibilityConsent: boolean;
}

export type AccountStatus = "unavailable" | "loading" | "signed-out" | "signed-in";

export interface AccountState {
  status: AccountStatus;
  email: string | null;
  /** Name given at sign-up (or by Google). */
  name: string | null;
  userId: string | null;
  /** Null until loaded, or when the visitor has not saved preferences yet. */
  profile: AccountProfile | null;
  /** Display answers on this device (applied for guests too). */
  display: Pick<AccessibilityAnswers, "largerText" | "reduceMotion">;
  /** The visitor arrived from a password-reset link and must choose a new password. */
  recovering: boolean;
  /** Google sign-in is switched on in the project (the button is hidden otherwise). */
  googleEnabled: boolean;
}

export const NO_ACCESSIBILITY: AccessibilityAnswers = { needs: [], largerText: false, reduceMotion: false };

const DISPLAY_KEY = "ruta-visigoda:display";

let state: AccountState = {
  status: supabaseConfigured() ? "loading" : "unavailable",
  email: null,
  name: null,
  userId: null,
  profile: null,
  display: { largerText: false, reduceMotion: false },
  recovering: false,
  googleEnabled: false,
};
const serverSnapshot = state;
const listeners = new Set<() => void>();
let started = false;

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function applyDisplay(display: AccountState["display"]) {
  const root = document.documentElement;
  if (display.largerText) root.dataset.textSize = "large";
  else delete root.dataset.textSize;
  if (display.reduceMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
}

function readDisplay(): AccountState["display"] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DISPLAY_KEY) ?? "null") as Partial<AccountState["display"]> | null;
    return { largerText: raw?.largerText === true, reduceMotion: raw?.reduceMotion === true };
  } catch {
    return { largerText: false, reduceMotion: false };
  }
}

function setDisplayLocal(display: AccountState["display"]) {
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  applyDisplay(display);
  set({ display });
}

/* ---------- Supabase rows ---------- */

export interface ProfileRow {
  id: string;
  visitor_profile: VisitorProfile;
  transport: TransportMode;
  interests: string[] | null;
  pace: TravelPace | null;
  travel_group: TravelGroup | null;
  accessibility: Partial<AccessibilityAnswers> | null;
  accessibility_consent_at: string | null;
}

const PROFILE_COLUMNS = "id, visitor_profile, transport, interests, pace, travel_group, accessibility, accessibility_consent_at";

/** Accessibility answers are read back only while consent is recorded. */
export function profileFromRow(row: ProfileRow): AccountProfile {
  const consent = row.accessibility_consent_at !== null;
  const a = row.accessibility ?? {};
  return {
    visitorProfile: row.visitor_profile,
    transport: row.transport,
    interests: row.interests ?? [],
    pace: row.pace,
    group: row.travel_group,
    accessibilityConsent: consent,
    accessibility: consent
      ? {
          needs: Array.isArray(a.needs) ? a.needs.filter((n): n is AccessNeed => (ACCESS_NEEDS as readonly string[]).includes(n)) : [],
          largerText: a.largerText === true,
          reduceMotion: a.reduceMotion === true,
        }
      : NO_ACCESSIBILITY,
  };
}

/** Put the account's answers to work on this device. Needs kept only here survive without consent. */
function applyProfile(profile: AccountProfile) {
  appActions.setContext({ profile: profile.visitorProfile, transport: profile.transport });
  const device = getAppState().preferences;
  appActions.setPreferences({
    interests: profile.interests,
    pace: profile.pace,
    group: profile.group,
    accessNeeds: profile.accessibilityConsent ? profile.accessibility.needs : device.accessNeeds,
  });
  if (profile.accessibilityConsent) {
    setDisplayLocal({ largerText: profile.accessibility.largerText, reduceMotion: profile.accessibility.reduceMotion });
  }
}

function hasPreferences(p: VisitorPreferences): boolean {
  return p.interests.length > 0 || p.pace !== null || p.group !== null;
}

/* ---------- Errors in plain Spanish ---------- */

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  user_already_exists: "Ya existe una cuenta con este correo. Prueba a entrar.",
  email_exists: "Ya existe una cuenta con este correo. Prueba a entrar.",
  email_not_confirmed: "Confirma tu correo antes de entrar: revisa tu bandeja de entrada.",
  weak_password: "La contraseña es demasiado débil: usa al menos 8 caracteres.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento y vuelve a probar.",
  over_email_send_rate_limit: "Se han enviado demasiados correos. Espera unos minutos.",
  validation_failed: "Revisa el correo y la contraseña.",
  signup_disabled: "El registro de cuentas está desactivado ahora mismo.",
};

export function authMessage(error: AuthError | null | undefined): string {
  if (!error) return "No se pudo completar. Inténtalo de nuevo.";
  return (error.code && AUTH_MESSAGES[error.code]) || "No se pudo completar. Inténtalo de nuevo.";
}

function dbMessage(error: PostgrestError): string {
  // Table missing: the migration in supabase/migrations has not been applied yet.
  if (error.code === "PGRST205" || error.code === "42P01") {
    return "Las cuentas aún no están preparadas en el servidor (falta aplicar la migración de perfiles).";
  }
  return "No se pudieron guardar tus preferencias. Inténtalo de nuevo.";
}

export type Result = { ok: true; message?: string } | { ok: false; message: string };

/* ---------- Session ---------- */

async function loadProfile(userId: string) {
  const db = supabase();
  if (!db) return;
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error || state.userId !== userId) return;
  if (!data) {
    // New account: keep what the visitor chose before signing up (interests, pace, group).
    // Access needs stay on this device until the visitor consents on /cuenta.
    const { context, preferences } = getAppState();
    if (hasPreferences(preferences)) {
      await accountActions.saveProfile({
        visitorProfile: context.profile,
        transport: context.transport,
        interests: preferences.interests,
        pace: preferences.pace,
        group: preferences.group,
        accessibility: NO_ACCESSIBILITY,
        accessibilityConsent: false,
      });
    }
    return;
  }
  const profile = profileFromRow(data);
  set({ profile });
  applyProfile(profile);
}

function displayName(session: Session | null): string | null {
  const meta = session?.user.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  const name = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : null;
  return name?.trim() || null;
}

/** What the sign-up form asks besides email and password (kept in the auth user's metadata). */
export interface SignUpDetails {
  fullName: string;
  /** ISO 3166-1 alpha-2, or null when not given. */
  country: string | null;
  /** When the visitor accepted the privacy information. */
  privacyAcceptedAt: string;
}

function onSession(session: Session | null) {
  const userId = session?.user.id ?? null;
  const changed = userId !== state.userId;
  set({
    status: session ? "signed-in" : "signed-out",
    email: session?.user.email ?? null,
    name: displayName(session),
    userId,
    ...(changed ? { profile: null } : {}),
  });
  if (session && changed) void loadProfile(session.user.id);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const display = readDisplay();
  applyDisplay(display);
  state = { ...state, display };
  const db = supabase();
  if (!db) return;
  void enabledProviders().then((p) => set({ googleEnabled: p.google }));
  void db.auth.getSession().then(({ data }) => onSession(data.session));
  db.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") set({ recovering: true });
    // Supabase advises against awaiting other calls inside this callback.
    setTimeout(() => onSession(session), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount<T>(selector: (s: AccountState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      start();
      return selector(state);
    },
    () => selector(serverSnapshot),
  );
}

/* ---------- Actions ---------- */

export const accountActions = {
  /** Start listening for the session (the shell calls this so display choices apply everywhere). */
  start,

  async signUp(email: string, password: string, details: SignUpDetails): Promise<Result> {
    const db = supabase();
    if (!db) return { ok: false, message: "Las cuentas no están disponibles en esta versión." };
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/cuenta`,
        data: { full_name: details.fullName, country: details.country, privacy_accepted_at: details.privacyAcceptedAt },
      },
    });
    if (error) return { ok: false, message: authMessage(error) };
    if (!data.session) {
      return { ok: true, message: "Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí para entrar." };
    }
    return { ok: true };
  },

  async signIn(email: string, password: string): Promise<Result> {
    const db = supabase();
    if (!db) return { ok: false, message: "Las cuentas no están disponibles en esta versión." };
    const { error } = await db.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: authMessage(error) } : { ok: true };
  },

  /**
   * Google sign-in (Supabase OAuth). Leaves the page for Google and comes back to /cuenta.
   * Needs the Google provider enabled in the Supabase project (see docs/ACCOUNTS.md).
   */
  async signInWithGoogle(): Promise<Result> {
    const db = supabase();
    if (!db) return { ok: false, message: "Las cuentas no están disponibles en esta versión." };
    // Check first: with the provider off, Supabase would show visitors a raw error page.
    if (!(await enabledProviders()).google) return { ok: false, message: "El acceso con Google aún no está activado." };
    const { data, error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/cuenta`, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { ok: false, message: authMessage(error) };
    window.location.assign(data.url);
    return { ok: true };
  },

  async sendPasswordReset(email: string): Promise<Result> {
    const db = supabase();
    if (!db) return { ok: false, message: "Las cuentas no están disponibles en esta versión." };
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/cuenta` });
    if (error) return { ok: false, message: authMessage(error) };
    return { ok: true, message: "Si existe una cuenta con ese correo, te llegará un enlace para cambiar la contraseña." };
  },

  async updatePassword(password: string): Promise<Result> {
    const db = supabase();
    if (!db) return { ok: false, message: "Las cuentas no están disponibles en esta versión." };
    const { error } = await db.auth.updateUser({ password });
    if (error) return { ok: false, message: authMessage(error) };
    set({ recovering: false });
    return { ok: true, message: "Contraseña actualizada." };
  },

  async signOut(): Promise<void> {
    await supabase()?.auth.signOut();
  },

  /**
   * Save preferences to the account and apply them here. Without consent the accessibility answers
   * are not sent at all (and any stored ones are cleared); display choices still apply locally.
   */
  async saveProfile(profile: AccountProfile): Promise<Result> {
    const db = supabase();
    const userId = state.userId;
    if (!db || !userId) return { ok: false, message: "Entra en tu cuenta para guardar tus preferencias." };
    const { data, error } = await db
      .from("profiles")
      .upsert({
        id: userId,
        visitor_profile: profile.visitorProfile,
        transport: profile.transport,
        interests: profile.interests,
        pace: profile.pace,
        travel_group: profile.group,
        accessibility: profile.accessibilityConsent ? profile.accessibility : {},
        accessibility_consent_at: profile.accessibilityConsent ? new Date().toISOString() : null,
      })
      .select(PROFILE_COLUMNS)
      .single<ProfileRow>();
    if (error) return { ok: false, message: dbMessage(error) };
    const saved = profileFromRow(data);
    set({ profile: saved });
    applyProfile(saved);
    return { ok: true, message: "Preferencias guardadas en tu cuenta." };
  },

  /** Remove everything the account stores about the visitor's preferences. */
  async deleteProfile(): Promise<Result> {
    const db = supabase();
    const userId = state.userId;
    if (!db || !userId) return { ok: false, message: "Entra en tu cuenta para borrar tus datos." };
    const { error } = await db.from("profiles").delete().eq("id", userId);
    if (error) return { ok: false, message: dbMessage(error) };
    set({ profile: null });
    return { ok: true, message: "Hemos borrado tus preferencias y respuestas de accesibilidad de la cuenta." };
  },

  /** Display choices on this device (guests included). */
  setDisplay(display: AccountState["display"]) {
    setDisplayLocal(display);
  },
};
