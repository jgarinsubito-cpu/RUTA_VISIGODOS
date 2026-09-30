/** Centered welcome for a new conversation (Mindtrip "¿Adónde vamos hoy?" adapted). */
import { IconSpark } from "@/components/shell/icons";
import { CrownArch } from "@/components/shared/CrownArch";
import { SHOWCASE } from "@/data/content";

export const STARTER_PROMPTS = SHOWCASE.starterPrompts;

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
      <CrownArch />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">¿Qué quieres descubrir hoy?</h1>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-ink-muted">
          Pregúntame por la ruta o pídeme que organice tu visita a Toledo y Guadamur.
        </p>
      </div>
      <button
        type="button"
        onClick={onConfigure}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink shadow-sm hover:bg-surface-muted"
      >
        <IconSpark width={18} height={18} className="text-accent" />
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
                className="min-h-11 rounded-full border border-stone bg-surface px-4 text-sm text-ink hover:border-accent hover:bg-accent-soft disabled:opacity-60"
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
