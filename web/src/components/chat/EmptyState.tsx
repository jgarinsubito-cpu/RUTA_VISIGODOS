/** Centered welcome for a new conversation (Mindtrip "¿Adónde vamos hoy?" adapted). */
import { IconSpark } from "@/components/shell/icons";

export const STARTER_PROMPTS = [
  "Medio día en Toledo a pie",
  "¿Qué es el Tesoro de Guarrazar?",
  "¿Por qué Toledo fue capital?",
  "Plan en familia con coche",
];

/** Stylised horseshoe arch framing a hanging votive crown, drawn with palette tokens only. */
function CrownIllustration() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 140"
      className="h-28 w-32 text-gold md:h-32 md:w-36"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* horseshoe arch with voussoirs */}
      <path d="M22 136V66a58 58 0 0 1 116 0v70" strokeWidth={2} />
      <path d="M36 136V68a44 44 0 0 1 88 0v68" strokeWidth={1.4} opacity={0.6} />
      {[-60, -40, -20, 0, 20, 40, 60].map((deg) => (
        <line
          key={deg}
          x1={80 + 44 * Math.sin((deg * Math.PI) / 180)}
          y1={68 - 44 * Math.cos((deg * Math.PI) / 180)}
          x2={80 + 58 * Math.sin((deg * Math.PI) / 180)}
          y2={66 - 58 * Math.cos((deg * Math.PI) / 180)}
          strokeWidth={1.2}
          opacity={0.6}
        />
      ))}
      {/* chains */}
      <path d="M80 26v18M80 44 62 58M80 44l18 14M80 44v14" strokeWidth={1.2} strokeDasharray="2 2.5" />
      {/* crown band */}
      <ellipse cx="80" cy="60" rx="20" ry="4" fill="var(--gold-soft)" strokeWidth={1.6} />
      <path d="M60 60v14a20 4 0 0 0 40 0V60" fill="var(--gold-soft)" strokeWidth={1.6} />
      {[66, 73, 80, 87, 94].map((x) => (
        <circle key={x} cx={x} cy={68} r={1.8} fill="currentColor" stroke="none" />
      ))}
      {/* hanging pendants */}
      {[64, 72, 80, 88, 96].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={77} x2={x} y2={i % 2 ? 90 : 96} strokeWidth={1} />
          <path d={`M${x} ${i % 2 ? 90 : 96}l-2.5 4 2.5 4 2.5-4z`} fill="currentColor" stroke="none" />
        </g>
      ))}
      {/* central cross */}
      <path d="M80 102v18M73 108h14" strokeWidth={1.8} />
    </svg>
  );
}

export function EmptyState({
  onPrompt,
  onConfigure,
  disabled,
}: {
  onPrompt: (text: string) => void;
  onConfigure: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <CrownIllustration />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">¿Qué quieres descubrir hoy?</h1>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-ink-muted">
          Soy el asistente de la ruta. Te respondo con fuentes aprobadas y te ayudo a organizar tu visita a Toledo y
          Guadamur.
        </p>
      </div>
      <button
        type="button"
        onClick={onConfigure}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink shadow-sm hover:bg-surface-muted"
      >
        <IconSpark width={18} height={18} className="text-gold" />
        Configurar mi asistente
      </button>
      <div className="w-full">
        <h2 className="sr-only">Preguntas sugeridas</h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {STARTER_PROMPTS.map((p) => (
            <li key={p}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPrompt(p)}
                className="min-h-11 rounded-full border border-stone bg-surface px-4 text-sm text-ink hover:border-gold hover:bg-gold-soft disabled:opacity-60"
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-ink-muted">
        Contenido de demostración, pendiente de validación. Tus chats se guardan solo en este dispositivo.
      </p>
    </div>
  );
}
