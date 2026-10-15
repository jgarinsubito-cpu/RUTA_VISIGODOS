# Content admin (`/admin`)

The *Gestor de contenidos* is where the editorial team creates and curates everything visitors and the assistant see: places, claims (with evidence level and source), stories, routes, and the home page and assistant settings (towns, themes, hero, starter questions, assistant vocabulary). Nothing reaches the web until a validator publishes it.

## How it works

```
editor ──► content_records (drafts, review)        visitors & assistant
                │                                         ▲
validator ──► /api/admin/publish ──► catalog_snapshots ───┘  (latest version only)
               rebuilds + checks          (immutable versions)
```

- **Records.** Each place, claim, story or route, plus one `showcase` record (home page and assistant settings), is a row in `public.content_records`. Its status says where its working copy stands: `draft` (being edited), `review` (sent to a validator), `published` (the web shows exactly this), `retired` (off the web).
- **Publishing** builds one complete catalog from the records the validator selects (in review) plus what the web already shows for everything else, checks it, and stores it as a new numbered version in `public.catalog_snapshots`. A draft never rides along with someone else's publication.
- **The visitor app** reads only the latest version (`web/src/data/published.ts`), cached and tagged `catalog`. Publishing revalidates the tag, so the next request shows the new version; otherwise the cache refreshes every 5 minutes. Without Supabase configured, before the first publication, or if the store is down or a version fails its checks, the app keeps the bundled demo catalog (`web/src/data/catalog.ts`) or the last good version. The visitor app never depends on the store being up.
- **Restoring** an earlier version publishes a copy of it as a new version (history is never rewritten). Records whose working copy no longer matches the web go back to draft, so they are not silently re-released.
- **Checks.** The same rules run in the editor as you type, on the publish page, on the server before storing a version, and when the app installs one (`web/src/domain/editorial/validate.ts`). Errors block publishing; warnings are shown to the validator:
  - unique ids and web addresses; claims, stories and route stops point to published records; stories cite only published claims of their own place;
  - every place's town is in the town list, and every town says how to get there;
  - interpretations (I) carry an attribution; verified hours carry a verification date;
  - a place's names and aliases name only that place, and never a town ("toledo") — the assistant would otherwise answer about the wrong place;
  - keywords and aliases are written the way the assistant matches them (lowercase, no accents; the editor normalises them on save);
  - warnings: themes missing from the theme list, aliases that are also assistant vocabulary or part of another place's name, Visigothic places without claims, places without a photo, changed web addresses, retired places.

Roles are enforced by the database (row-level security and a trigger in `web/supabase/migrations/20261015120000_content_admin.sql`), not only by the interface. The app uses the staff member's own session and the publishable key; no secret key is involved.

| Role | Can |
| --- | --- |
| `editor` | Create and edit drafts, send them to review, propose retiring a published record, delete drafts that were never published, upload photos |
| `validator` | Everything an editor can, plus publish, return a record to draft with a note, and restore an earlier version |

Changing a record's content always makes it a draft again, for everyone, so an unreviewed change can never be published by accident.

## Setup

1. Configure Supabase as in [ACCOUNTS.md](ACCOUNTS.md) (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Staff sign in with the same accounts as visitors.
2. **Apply the migration**: SQL Editor → paste `web/supabase/migrations/20261015120000_content_admin.sql` → Run (after the profiles migration). It creates the tables, policies, the `publish_catalog` function and the public `place-images` bucket (JPG/PNG/WebP, up to 5 MB).
3. **Add staff** (SQL Editor; the app cannot add staff). The person must have signed up first:

   ```sql
   insert into public.staff (user_id, role, display_name)
   select id, 'validator', 'Nombre Apellido' from auth.users where email = 'persona@example.org';
   ```

   Use `'editor'` for editors. To remove someone: `delete from public.staff where user_id = (select id from auth.users where email = '…');`
4. Restart or redeploy the app so `next.config.ts` allows photos from the project's storage URL.

## First use

1. A validator opens `/admin`, signs in, and chooses **Importar el catálogo de demostración**: the bundled demo catalog becomes records in review. (Unpublished demo claims in `web/src/data/editorial.ts` are not imported; recreate them as drafts if needed.)
2. **Publicar** → check → **Publicar N cambios**. The web now serves version 1 from the store.

## Day to day

- **Edit** a place, claim, story or route, or *Portada y asistente*. **Guardar borrador** keeps working; **Enviar a revisión** hands it to a validator. The panel *Reglas de publicación* shows what would block it.
- **Probar el asistente** asks the deterministic assistant against the published version or against every working copy, showing which places it recognised, which claims it cited and which follow-ups it offers. Use it after changing aliases, keywords, claims or prompts.
- **Publicar** (validators) lists what is in review with what changes, the result of the checks and the version history with **Restaurar**.
- **Retire** a published record with *Proponer retirada*; it leaves the web when a validator publishes that request. Fix what depends on it first (routes, stories), or publishing will be blocked. Records that were never published can simply be deleted.
- **Claims:** correct typos or the source in place (the published version number goes up). If what a claim states changes, create a new claim and retire the old one.
- **Order** of places and routes (arrows in the lists) is the order on the web, applied at the next publication.

## Limits (not done yet)

- No per-organisation scopes yet (PLAN.md: museums, municipalities, businesses each editing their own records). Today a staff member is an editor or validator for everything.
- No field-level diff or comments thread; the review note is a single message back to the editor.
- Uploaded photos are not deleted when replaced; clean the `place-images` bucket by hand if needed.
- Page titles and descriptions in `web/src/app/**/layout.tsx` and the product name stay in code.
- An open visitor tab keeps the version it loaded until it is reloaded.
- Spanish only, like the rest of the pilot.

## Code map

| Piece | Where |
| --- | --- |
| Catalog types | `web/src/domain/types.ts` (`Catalog`, `Showcase`) |
| Record shapes, Spanish errors | `web/src/domain/editorial/schema.ts` |
| Publication rules | `web/src/domain/editorial/validate.ts` |
| Workflow: build a version, statuses after publish/restore | `web/src/domain/editorial/records.ts` |
| Current catalog for app code | `web/src/data/content.ts` (sync accessors, `setCatalog`, `withCatalog`) |
| Load the latest version (server) | `web/src/data/published.ts`, installed in the browser by `components/shell/CatalogProvider.tsx` |
| Publish / restore routes | `web/src/app/api/admin/publish`, `web/src/app/api/admin/restore`, `web/src/lib/admin-server.ts` |
| Admin state and actions | `web/src/state/admin.ts` |
| Admin screens | `web/src/app/admin/**`, `web/src/components/admin/**` |
| Database | `web/supabase/migrations/20261015120000_content_admin.sql` |
