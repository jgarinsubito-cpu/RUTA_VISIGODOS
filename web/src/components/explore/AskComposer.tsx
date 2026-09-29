"use client";
/**
 * Inline mini-composer on Explorar. Sends the visitor to /asistente?q=<text> (marked as an in-app
 * hand-off so it is sent automatically); with no text it just opens the assistant. Suggestion chips give low-readiness visitors a starting point.
 */
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { IconChat, IconSend } from "@/components/shell/icons";
import { markAskHandoff } from "@/components/chat/askHandoff";

const SUGGESTIONS = [
  "¿Por qué Toledo fue capital visigoda?",
  "¿Dónde apareció el Tesoro de Guarrazar?",
  "Planifica una mañana a pie por Toledo",
];

export function assistantHref(text: string): string {
  const q = text.trim();
  return q ? `/asistente?q=${encodeURIComponent(q)}` : "/asistente";
}

export function AskComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const inputId = useId();
  const headingId = useId();

  function ask(value: string) {
    const q = value.trim();
    if (q) markAskHandoff(q);
    router.push(assistantHref(q));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(text);
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-stone bg-surface p-4 shadow-sm md:p-5">
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-ink">
        <IconChat className="text-gold" />
        Preguntar al asistente
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Responde con fuentes y nivel de evidencia. Si no consta en las fichas, te lo dirá.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Tu pregunta para el asistente
        </label>
        <input
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pregunta sobre la ruta o tu viaje…"
          enterKeyHint="send"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-stone bg-ivory px-4 text-base text-ink placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-olive text-on-olive hover:bg-olive-hover"
          aria-label={text.trim() ? "Enviar pregunta al asistente" : "Abrir el asistente"}
        >
          <IconSend />
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Preguntas sugeridas">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => ask(s)}
              className="min-h-11 rounded-full border border-stone bg-surface px-3.5 text-left text-sm text-ink hover:bg-surface-muted"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
