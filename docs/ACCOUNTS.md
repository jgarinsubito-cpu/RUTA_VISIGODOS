# Visitor accounts (Supabase)

Accounts are optional. Guests can use the whole app, and trips, saved places and chats always stay on the visitor's device. An account stores only:

- visit preferences: how the assistant explains (general / family / expert), usual transport, interests (catalog themes), pace and who they travel with;
- access needs (wheelchair, reduced mobility, stroller, avoid slopes, rest stops, low vision, hearing, quiet places) and display answers (larger text, less motion), **only while the visitor has ticked the consent box**. These can reveal health information (GDPR art. 9), so they are never sent without consent, and withdrawing consent clears them from the account.

What each choice does:
- Interests reorder Explorar (places and routes; nothing is hidden), mark matching cards ("Te interesa: …") and tip the assistant's route choice.
- Pace, group and access needs go to the assistant as data (`<preferencias>`). Most access data is unverified, so needs never make a place "accessible": the assistant and the local composer say what is unknown for each need.
- Wheelchair, reduced mobility and stroller switch on the planner's step-free check.

Guests get the same effect on their device. The sign-up invitation (after the 2nd question) asks for these preferences first, applies them at once, then offers an account. On a new account the interests, pace and group chosen as a guest are saved; access needs stay on the device until the visitor consents on `/cuenta`.

Staff of the content admin sign in with these same accounts; their role lives in `public.staff` ([ADMIN.md](ADMIN.md)).

## How it works

| Piece | Where |
| --- | --- |
| Browser client (URL + publishable key, PKCE) | `web/src/lib/supabase.ts` |
| Session, profile, display choices | `web/src/state/account.ts` |
| Account screen `/cuenta` | `web/src/app/cuenta/page.tsx`, `web/src/components/account/` |
| One-time sign-up invitation after the 2nd question | `web/src/components/account/SignupPrompt.tsx` |
| Table + row-level security | `web/supabase/migrations/20260929120000_profiles.sql` |

Signing in applies the saved preferences through `actions.setContext`, so a trip that already has stops is never rescheduled without review (product rule 3). Larger text and less motion also work for guests and are kept on the device (`html[data-text-size]`, `html[data-motion]`).

## Configuration

`web/.env.local` (never committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Both values reach the browser by design; row-level security protects each account's row. **Do not put the `sb_secret_` key in the app**: it bypasses row-level security and nothing here needs it. Without these variables the app is guest-only and `/cuenta` says accounts are unavailable.

## One-time setup in the Supabase dashboard

1. **Create the table**: SQL Editor → paste `web/supabase/migrations/20260929120000_profiles.sql` → Run. Until then, saving preferences shows "falta aplicar la migración de perfiles".
2. **Redirect URLs**: Authentication → URL Configuration. Set Site URL to the deployed origin, and add `http://localhost:3000/cuenta` (and any preview/deploy origins followed by `/cuenta`) to Redirect URLs. Email confirmation, password reset and Google all return to `/cuenta`.
3. **Email sign-up**: enabled by default, with email confirmation on. The default Supabase mailer is rate-limited; configure custom SMTP before real use.
4. **Google sign-in**:
   - Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
   - Authorised redirect URI: `https://<project>.supabase.co/auth/v1/callback`.
   - Supabase → Authentication → Sign In / Providers → Google → enable, and paste the client ID and secret.
   - The "Continuar con Google" button appears automatically once the provider is on; the app checks the public auth settings.

## Not done yet

- Deleting the login itself (not just the profile row) needs a server route using the secret key with the caller's verified JWT (JWKS). Until then, `/cuenta` deletes the stored preferences and says so.
- Trips, saved places and chats are not synced to accounts. Syncing them would change product rule 5 and needs its own design.
