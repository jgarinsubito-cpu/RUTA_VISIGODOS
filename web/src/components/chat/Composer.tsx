"use client";
/**
 * Bottom composer: auto-growing textarea, Enter sends, Shift+Enter adds a line. The switch below it
 * picks the assistant mode: strict (published sources only) or open (adds labelled general knowledge).
 */
import { useEffect, useId, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { IconSend } from "@/components/shell/icons";
import { actions, useAppState } from "@/state/store";

const MAX_LENGTH = 1000;
const MAX_HEIGHT = 176;

export function Composer({
  value,
  onChange,
  onSend,
  sending,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  sending: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const id = useId();
  const canSend = value.trim().length > 0 && !sending;
  const open = useAppState((s) => s.assistantMode) === "open";

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, inputRef]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (canSend) onSend(value.trim());
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-stone bg-ivory px-3 pb-2 pt-2 md:px-6 md:pb-3">
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
        <div className="flex items-end gap-2 rounded-3xl border border-stone bg-surface p-1.5 pl-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
          <label htmlFor={id} className="sr-only">
            Tu pregunta para el asistente
          </label>
          <textarea
            id={id}
            ref={inputRef}
            rows={1}
            value={value}
            maxLength={MAX_LENGTH}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pregunta sobre la ruta…"
            enterKeyHint="send"
            aria-describedby={`${id}-hint`}
            className="max-h-44 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={sending ? "Enviando pregunta…" : "Enviar pregunta"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSend />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 text-xs leading-snug text-ink-muted">
          <button
            type="button"
            role="switch"
            aria-checked={open}
            aria-describedby={`${id}-mode`}
            onClick={() => actions.setAssistantMode(open ? "strict" : "open")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-ink hover:bg-surface-muted"
          >
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${open ? "border-primary bg-primary" : "border-stone bg-surface"}`}
            >
              <span
                className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left] motion-reduce:transition-none ${open ? "left-[1.125rem] bg-on-primary" : "left-0.5 bg-ink-muted"}`}
              />
            </span>
            Modo abierto
          </button>
          <p id={`${id}-mode`}>
            {open ? "Puede añadir contexto general, marcado como no verificado." : "Solo fuentes aprobadas de la ruta."}
          </p>
        </div>
        <p id={`${id}-hint`} className="text-center text-xs leading-snug text-ink-muted">
          Puede equivocarse. Comprueba horarios antes de ir.
          <span className="sr-only"> Pulsa Intro para enviar y Mayúsculas más Intro para una nueva línea.</span>
        </p>
      </form>
    </div>
  );
}
