"use client";
/**
 * Form pieces for the admin: every control has a visible label, 44px targets, and its error tied to
 * it (aria-invalid + aria-describedby). Errors come from parseRecordData paths ("image.alt").
 */
import Link from "next/link";
import { createContext, useContext, useId, useState, type ReactNode } from "react";
import type { RecordStatus } from "@/domain/editorial/records";
import type { CatalogIssue } from "@/domain/editorial/validate";
import { IconInfo } from "@/components/shell/icons";
import { STATUS_LABEL } from "./model";

export const inputClass =
  "min-h-11 w-full rounded-xl border border-stone bg-surface px-3 text-base font-normal text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";
export const btnPrimary =
  "btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-60";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-60";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-danger/50 bg-surface px-4 text-sm font-semibold text-danger hover:bg-surface-muted disabled:opacity-60";

/* ---------- Errors ---------- */

const ErrorsContext = createContext<ReadonlyMap<string, string>>(new Map());

export function ErrorsProvider({ errors, children }: { errors: ReadonlyMap<string, string>; children: ReactNode }) {
  return <ErrorsContext.Provider value={errors}>{children}</ErrorsContext.Provider>;
}

/** The error for a field, or for anything inside it ("hours" catches "hours.weekly.2.0.open"). */
function useFieldError(path: string | undefined): string | undefined {
  const errors = useContext(ErrorsContext);
  if (!path) return undefined;
  const exact = errors.get(path);
  if (exact) return exact;
  for (const [p, message] of errors) if (p.startsWith(`${path}.`)) return message;
  return undefined;
}

interface ControlProps {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
}

export function Field({
  label,
  hint,
  path,
  children,
}: {
  label: string;
  hint?: ReactNode;
  path?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const error = useFieldError(path);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-xs text-danger">
          <IconInfo width={14} height={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  path,
  hint,
  optional = false,
  multiline = false,
  rows = 4,
  type = "text",
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string | undefined;
  /** Optional fields report an emptied value as undefined. */
  onChange: (value: string | undefined) => void;
  path?: string;
  hint?: ReactNode;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "url" | "tel" | "date";
  placeholder?: string;
  readOnly?: boolean;
}) {
  const set = (v: string) => onChange(optional && v.trim() === "" ? undefined : v);
  return (
    <Field label={optional ? `${label} (opcional)` : label} hint={hint} path={path}>
      {(control) =>
        multiline ? (
          <textarea
            {...control}
            rows={rows}
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`${inputClass} py-2.5 leading-relaxed`}
          />
        ) : (
          <input
            {...control}
            type={type}
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`${inputClass} ${readOnly ? "bg-surface-muted text-ink-muted" : ""}`}
          />
        )
      }
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  path,
  hint,
  step = "1",
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  path?: string;
  hint?: ReactNode;
  step?: string;
}) {
  // Keep what is typed ("39.", "-4.0") until it is a number.
  const [text, setText] = useState(value === undefined || Number.isNaN(value) ? "" : String(value));
  return (
    <Field label={label} hint={hint} path={path}>
      {(control) => (
        <input
          {...control}
          type="number"
          inputMode="decimal"
          step={step}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value.trim() === "" ? Number.NaN : Number(e.target.value));
          }}
          className={inputClass}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  path,
  hint,
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  path?: string;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} path={path}>
      {(control) => (
        <select {...control} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
          {value === "" && <option value="">Elige una opción</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-5 w-5 shrink-0 accent-primary"
        />
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="pl-8 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A list of short texts, one per line (prompts, aliases, keywords). */
export function LinesField({
  label,
  value,
  onChange,
  path,
  hint,
  optional = false,
  rows = 4,
}: {
  label: string;
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  path?: string;
  hint?: ReactNode;
  optional?: boolean;
  rows?: number;
}) {
  // Keep the raw text so empty lines can be typed; the value is the non-empty lines.
  const [text, setText] = useState((value ?? []).join("\n"));
  return (
    <Field label={optional ? `${label} (opcional)` : label} hint={hint ?? "Uno por línea."} path={path}>
      {(control) => (
        <textarea
          {...control}
          rows={rows}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const lines = e.target.value
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            onChange(optional && lines.length === 0 ? undefined : lines);
          }}
          className={`${inputClass} py-2.5 leading-relaxed`}
        />
      )}
    </Field>
  );
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-xl text-ink">
          {title}
        </h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* ---------- Status ---------- */

/** Workflow status as text with a distinct glyph, never colour alone. */
export function StatusBadge({ status, retire = false, live = false }: { status: RecordStatus; retire?: boolean; live?: boolean }) {
  const glyph = { draft: "○", review: "◐", published: "●", retired: "×" }[status];
  const tone =
    status === "review" ? "border-warn/40 bg-warn-soft text-warn" : status === "published" ? "border-ok/40 bg-ok-soft text-ok" : "border-stone text-ink-muted";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
        <span aria-hidden="true">{glyph}</span>
        {retire && status === "review" ? "Retirada en revisión" : STATUS_LABEL[status]}
      </span>
      {live && status !== "published" && <span className="text-xs text-ink-muted">· la web muestra otra versión</span>}
    </span>
  );
}

/* ---------- Feedback ---------- */

export function ResultMessage({ result }: { result: { ok: boolean; message?: string } | null }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-sm ${result && !result.ok ? "text-danger" : "text-ink-muted"}`}>
      {result?.message ?? ""}
    </p>
  );
}

/** Errors (block publishing) and warnings, each with a link to the record to fix. */
export function IssueList({ issues, linkFor }: { issues: readonly CatalogIssue[]; linkFor?: (issue: CatalogIssue) => { href: string; label: string } | null }) {
  if (issues.length === 0) return null;
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((issue, i) => {
        const link = linkFor?.(issue);
        return (
          <li
            key={`${issue.kind}:${issue.id}:${i}`}
            className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-sm ${
              issue.severity === "error" ? "border-danger/40 text-ink" : "border-warn/40 bg-warn-soft text-ink"
            }`}
          >
            <span className={`text-xs font-semibold uppercase tracking-wider ${issue.severity === "error" ? "text-danger" : "text-warn"}`}>
              {issue.severity === "error" ? "Error" : "Aviso"}
              {link ? (
                <>
                  {" · "}
                  <Link href={link.href} className="normal-case tracking-normal underline underline-offset-2">
                    {link.label}
                  </Link>
                </>
              ) : null}
            </span>
            <span>{issue.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
