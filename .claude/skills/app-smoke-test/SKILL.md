---
name: app-smoke-test
description: Run the Ruta Visigoda browser smoke test — build, start, drive the main flows with Playwright and capture 1440px and 390px screenshots into docs/evidence/app-screens. Use after UI changes or before sharing a build.
---

# App smoke test

Script: `web/scripts/smoke.py` (Python + Playwright, installed Chrome channel).

## Setup (once)

Playwright is kept outside the project, in `%TEMP%/visigoths-browser-tools`:

```powershell
pip install --target "$env:TEMP\visigoths-browser-tools" playwright
```

It uses the installed Google Chrome (`channel='chrome'`), so no browser download is needed.

## Run

```bash
cd web
npm run build
npx next start -p 3107      # in the background
python scripts/smoke.py     # optional arg: one step name only
```

`SMOKE_BASE` overrides the URL (default `http://localhost:3107`). Stop the server afterwards.

The script goes through Explorar, the empty assistant, a heritage question with the place panel, a plan question → route proposal → accept, then Mi viaje, Mapa, a place and a route, at 1440×1000 and 390×844. It prints `FAIL`, `OVERFLOW` and console errors, and writes `FAIL-*.png` on failure.

## Review

Open every screenshot in `docs/evidence/app-screens/` and check for horizontal overflow, clipped text, contrast in light and dark mode, missing demo/evidence labels, and dialogs or sheets covering controls. Fix, rebuild and re-run.
