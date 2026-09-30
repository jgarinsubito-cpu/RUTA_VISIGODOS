"use client";
/** Bottom composer: auto-growing textarea, Enter sends, Shift+Enter adds a line. */
import { useEffect, useId, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { IconSend } from "@/components/shell/icons";

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
        <p id={`${id}-hint`} className="mt-1.5 text-center text-xs leading-snug text-ink-muted">
          Puede equivocarse. Comprueba horarios antes de ir.
          <span className="sr-only"> Pulsa Intro para enviar y Mayúsculas más Intro para una nueva línea.</span>
        </p>
      </form>
    </div>
  );
}
