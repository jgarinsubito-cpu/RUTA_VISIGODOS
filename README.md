# Ruta Visigoda de Toledo

Compañero cultural de viaje, *mobile-first*, para descubrir la ruta visigoda de Toledo y Guadamur, planificar una visita viable y preguntar a un asistente que responde con fuentes aprobadas. El espacio del asistente sigue el patrón de Mindtrip (`/chat`) con la identidad visual de Urbs Regia.

> **Versión de demostración.** Todo el contenido (lugares, claims, historias, horarios, coordenadas) es un *fixture* de demo pendiente de validación por Urbs Regia. Nada debe presentarse como dato verificado.

## Estructura

```
.
├── README.md          este índice
├── CLAUDE.md          reglas del proyecto para agentes de código
├── .claude/skills/    skills propias del proyecto (ver docs/skills.md)
├── docs/
│   ├── PLAN.md        plan de producto y entrega (documento principal)
│   ├── skills.md      skills recomendadas y estado de cada una
│   ├── brief/         PDF de definición Destino Plus v0.1
│   ├── research/      estudio de mercado y análisis del flujo de Mindtrip
│   └── evidence/      capturas y material de referencia (no redistribuir)
│       ├── app-screens/   capturas de nuestra app (390 y 1440 px)
│       ├── mindtrip/      capturas públicas de Mindtrip
│       ├── competitors/   imágenes promocionales de Wanderlog y VoiceMap
│       └── tools/         script de captura de Mindtrip y sus recetas
└── web/               la aplicación (Next.js 16 · React 19 · TypeScript · Tailwind 4)
```

## Arrancar la app

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm test` | Tests (Vitest): planificador, asistente, seguridad de fuentes, store |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript |

El asistente funciona sin claves con respuestas locales deterministas. Para usar Claude, crea `web/.env.local` a partir de [`web/.env.example`](web/.env.example) con `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`). La clave se usa solo en el servidor.

## Pantallas

| Ruta | Contenido |
| --- | --- |
| `/` | Explorar: búsqueda, temas, rutas y lugares |
| `/asistente` | Chat con barra de contexto Dónde · Cuándo · Quién · Transporte y ficha del lugar al lado |
| `/mi-viaje` | Itinerario validado, reordenar/quitar, deshacer, mapa |
| `/mapa` | Mapa con filtros y lista sincronizada |
| `/rutas`, `/rutas/[slug]` | Rutas curadas y «Adaptar esta ruta» |
| `/lugares/[slug]` | Ficha del lugar con evidencia D/I/H/T y fuentes |
| `/guardados` | Ideas guardadas (distinto de «añadido al viaje») |

Los datos se guardan solo en el navegador del visitante.

## Documentación

Empieza por [docs/PLAN.md](docs/PLAN.md). Después: [análisis de Mindtrip](docs/research/MINDTRIP-FLOW-ANALYSIS.md), [estudio de mercado](docs/research/MARKET-STUDY.md) y [skills](docs/skills.md).
