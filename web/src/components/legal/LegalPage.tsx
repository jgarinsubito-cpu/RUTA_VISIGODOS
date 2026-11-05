/**
 * Frame of the legal and credits pages: title, date, draft notice while a lawyer has not reviewed
 * the texts, and links between the pages. Values still unknown ("[…]" in data/legal.ts) are
 * highlighted so nobody publishes them by mistake.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL, legalDate } from "@/data/legal";

export const LEGAL_PAGES = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies y almacenamiento" },
  { href: "/accesibilidad", label: "Accesibilidad" },
  { href: "/creditos", label: "Créditos" },
] as const;

/** Text with its "[…]" parts shown as pending values. */
export function Val({ children }: { children: string }) {
  const parts = children.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") ? (
          <mark key={i} className="rounded bg-warn-soft px-1 text-ink" title="Dato pendiente">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-2.5" aria-labelledby={id ? `${id}-h` : undefined}>
      <h2 id={id ? `${id}-h` : undefined} className="font-display text-xl text-ink">
        {title}
      </h2>
      <div className="flex flex-col gap-2.5 text-body leading-relaxed text-ink-muted [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:text-ink [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** Definition list of facts (owner data, a provider). */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 rounded-xl border border-stone bg-surface p-4 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-ink">{k}</dt>
          <dd className="mb-1.5 text-ink-muted sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LegalLinks({ current, className = "" }: { current?: string; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${className}`}>
      {LEGAL_PAGES.map((p) => (
        <li key={p.href}>
          <Link
            href={p.href}
            aria-current={current === p.href ? "page" : undefined}
            className={`inline-flex min-h-11 items-center underline-offset-4 hover:underline ${current === p.href ? "font-semibold text-ink" : "text-ink-muted"}`}
          >
            {p.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
  draft = !LEGAL.reviewedByLawyer,
}: {
  /** The page's own path (kept for callers; the footer links every legal page). */
  href: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  /** Show the "pending legal review" notice. */
  draft?: boolean;
}) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-5 text-ink md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        <p className="text-sm text-ink-muted">Actualizado el {legalDate()}</p>
        {draft && (
          <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm">
            Borrador pendiente de revisión jurídica. Los datos <mark className="rounded bg-surface px-1">[entre corchetes]</mark> faltan por
            completar.
          </p>
        )}
        {intro && <div className="text-lead leading-relaxed text-ink-muted">{intro}</div>}
      </header>
      {children}
    </article>
  );
}
