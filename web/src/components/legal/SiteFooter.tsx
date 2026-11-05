/**
 * Site footer: who validates the content (Urbs Regia), the Ministry of Culture grant mark (text
 * and logo required by the grant) and the legal pages. Shown under the content pages; the
 * full-screen ones (assistant, map, guided tours) leave it out — see AppShell.
 */
import Image from "next/image";
import { FUNDING, LEGAL, VALIDATOR } from "@/data/legal";
import { LegalLinks } from "./LegalPage";

/** The required grant mark: the Ministry's logo, then the exact required sentence. */
export function FundingMark() {
  const logo = FUNDING.logo;
  return (
    <figure className="flex flex-col items-start gap-2">
      {logo ? (
        // Official logos are drawn for a white background: keep it white in dark mode too.
        <span className="inline-block rounded-md bg-white p-2">
          <Image src={logo.src} width={logo.width} height={logo.height} alt={FUNDING.logoAlt} className="h-14 w-auto" />
        </span>
      ) : (
        <span
          className="grid h-16 w-56 place-items-center rounded-md border border-dashed border-warn bg-warn-soft px-3 text-center text-xs text-ink"
          title="Dato pendiente"
        >
          [Logotipo oficial del Ministerio de Cultura]
        </span>
      )}
      <figcaption className="text-sm font-semibold text-ink">{FUNDING.text}</figcaption>
    </figure>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-stone bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:px-8">
        <section aria-labelledby="footer-validator" className="flex flex-col gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Validación científica</p>
          <h2 id="footer-validator" className="font-display text-xl text-ink">
            {VALIDATOR.name}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">{VALIDATOR.summary}</p>
          <p className="text-sm leading-relaxed text-ink-muted">{VALIDATOR.role}</p>
          <a
            href={VALIDATOR.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-ink underline underline-offset-4"
          >
            urbsregia.eu
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </section>

        <section aria-label="Financiación" className="flex flex-col gap-3">
          <FundingMark />
          <p className="text-xs leading-relaxed text-ink-muted">{FUNDING.project}</p>
        </section>
      </div>
      <div className="border-t border-stone">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2 md:flex-row md:items-center md:justify-between md:px-8">
          <nav aria-label="Información legal">
            <LegalLinks />
          </nav>
          <p className="pb-2 text-xs text-ink-muted md:pb-0">{LEGAL.product} · Destino Plus</p>
        </div>
      </div>
    </footer>
  );
}
