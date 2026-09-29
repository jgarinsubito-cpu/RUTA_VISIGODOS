# Ruta Visigoda — web app

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Leaflet · Vitest. Project overview and docs: [../README.md](../README.md). Agent rules: [../CLAUDE.md](../CLAUDE.md) and [AGENTS.md](AGENTS.md).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run lint && npm run typecheck && npm run build
```

Optional: copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` to answer with Claude; without it the assistant uses the local composer.

Browser smoke test with screenshots: `scripts/smoke.py` (see `../.claude/skills/app-smoke-test/SKILL.md`).
