"use client";
/**
 * Inline mini-composer on Explorar. Sends the visitor to /asistente?q=<text> (marked as an in-app
 * hand-off so it is sent automatically); with no text it just opens the assistant. Suggestion chips give low-readiness visitors a starting point.
 */
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { IconSend } from "@/components/shell/icons";
import { markAskHandoff } from "@/components/chat/askHandoff";
import { showcase } from "@/data/content";

export function assistantHref(text: string): string {
  const q = text.trim();
  return q ? `/asistente?q=${encodeURIComponent(q)}` : "/asistente";
}

export function AskComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const inputId = useId();
  const headingId = useId();
  const suggestions = showcase().starterPrompts.slice(0, 3);

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
    <section aria-labelledby={headingId} className="rounded-3xl border border-stone bg-surface p-5 md:p-6">
      <h2 id={headingId} className="font-display text-2xl text-ink">
        Preguntar al asistente
      </h2>
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
          className="min-h-12 min-w-0 flex-1 rounded-full border border-stone bg-ivory px-5 text-base text-ink transition-colors placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          className="btn-primary grid h-12 w-12 shrink-0 place-items-center rounded-full"
          aria-label={text.trim() ? "Enviar pregunta al asistente" : "Abrir el asistente"}
        >
          <IconSend />
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Preguntas sugeridas">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => ask(s)}
              className="min-h-11 rounded-full border border-stone px-4 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
