import { describe, expect, it } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import { authMessage, NO_ACCESSIBILITY, profileFromRow } from "./account";

describe("account", () => {
  it("never reads accessibility answers back without recorded consent", () => {
    const base = { id: "u1", visitor_profile: "family" as const, transport: "car" as const, interests: ["tesoro"], pace: "relaxed" as const, travel_group: null };
    const withoutConsent = profileFromRow({ ...base, accessibility: { needs: ["wheelchair"], largerText: true }, accessibility_consent_at: null });
    expect(withoutConsent.accessibilityConsent).toBe(false);
    expect(withoutConsent.accessibility).toEqual(NO_ACCESSIBILITY);
    const withConsent = profileFromRow({ ...base, accessibility: { needs: ["wheelchair", "not-a-need" as never] }, accessibility_consent_at: "2026-09-29T10:00:00Z" });
    expect(withConsent.accessibility).toEqual({ needs: ["wheelchair"], largerText: false, reduceMotion: false });
    expect(withConsent.interests).toEqual(["tesoro"]);
    expect(withConsent.pace).toBe("relaxed");
    expect(withConsent.visitorProfile).toBe("family");
  });

  it("explains auth errors in Spanish and falls back to a generic message", () => {
    expect(authMessage({ code: "invalid_credentials" } as AuthError)).toBe("Correo o contraseña incorrectos.");
    expect(authMessage({ code: "something_new" } as AuthError)).toMatch(/Inténtalo de nuevo/);
    expect(authMessage(null)).toMatch(/Inténtalo de nuevo/);
  });
});
