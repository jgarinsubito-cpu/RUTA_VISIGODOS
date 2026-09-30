"use client";
/**
 * Contextual place detail (Mindtrip's right-hand detail panel adapted to heritage).
 * "panel": fills its container (chat/map side panel) with its own scroll and a bottom action bar.
 * "page": full page on /lugares/[slug]; the action bar sticks above the mobile bottom nav.
 * Only published claims are shown; scheduling always goes through a planner proposal.
 */
import Link from "next/link";
import { useId, ViewTransition, type ReactNode } from "react";
import type { Site } from "@/domain/types";
import { claimsForSite, getSite, storiesForSite } from "@/data/content";
import { proposeAdd } from "@/domain/planner";
import { formatClock } from "@/domain/time";
import { actions, getAppState, useAppState } from "@/state/store";
import { directionsUrl } from "@/lib/directions";
import { accessLabel } from "@/lib/hours";
import { formatDuration, KIND_LABEL } from "@/lib/labels";
import {
  IconChat,
  IconChevronLeft,
  IconClose,
  IconDirections,
  IconGlobe,
  IconHeart,
  IconInfo,
  IconPhone,
  IconPin,
  IconPlus,
  IconTrip,
} from "@/components/shell/icons";
import { DemoBadge, NonVisigothicBadge } from "@/components/shared/DemoBadge";
import { ClaimCard, StoryEvidence } from "@/components/shared/Claim";
import { EvidenceLegend } from "@/components/shared/EvidenceBadge";
import { HoursLabel } from "@/components/shared/HoursLabel";
import { SiteImage } from "@/components/shared/SiteImage";

export interface PlacePanelProps {
  siteId: string;
  onClose?: () => void;
  variant: "panel" | "page";
}

function addToTrip(siteId: string) {
  try {
    const proposal = proposeAdd(getAppState().trip, siteId);
    actions.propose(proposal);
  } catch {
    actions.notify("No se pudo calcular el cambio en tu viaje. Inténtalo de nuevo.");
  }
}

function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

const quickAction =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted";

/** Directions, website and phone, as on a map place card. External links open in a new tab. */
function QuickActions({ site }: { site: Site }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Acciones rápidas">
      <li>
        <a href={directionsUrl(site)} target="_blank" rel="noreferrer" className={quickAction}>
          <IconDirections width={18} height={18} />
          Cómo llegar
          <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
        </a>
      </li>
      {site.officialUrl && (
        <li>
          <a href={site.officialUrl} target="_blank" rel="noreferrer" className={quickAction}>
            <IconGlobe width={18} height={18} />
            Sitio web
            <span className="sr-only"> (abre en otra pestaña)</span>
          </a>
        </li>
      )}
      {site.phone && (
        <li>
          <a href={telHref(site.phone)} className={quickAction}>
            <IconPhone width={18} height={18} />
            Llamar
          </a>
        </li>
      )}
    </ul>
  );
}

function PhotoCredit({ site }: { site: Site }) {
  if (!site.image) return <p className="text-xs text-ink-muted">Galería pendiente de fotografías con licencia.</p>;
  const { caption, author, license, sourceUrl } = site.image;
  return (
    <p className="text-xs text-ink-muted">
      {caption && <span className="block text-ink">{caption}</span>}
      Foto:{" "}
      <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {author}
      </a>{" "}
      · {license} · Wikimedia Commons
    </p>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-stone py-3 last:border-b-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

function ActionBar({ site, variant }: { site: Site; variant: PlacePanelProps["variant"] }) {
  const saved = useAppState((s) => s.savedSiteIds.includes(site.id));
  const stop = useAppState((s) => s.trip.stops.find((st) => st.siteId === site.id));
  const pending = useAppState((s) => s.pendingProposal !== null);

  return (
    <div
      className={`border-t border-stone bg-surface/90 px-4 py-3 backdrop-blur-md ${
        variant === "page" ? "sticky bottom-0 z-20 pb-[calc(var(--mobile-nav)+0.75rem+env(safe-area-inset-bottom))] md:pb-3" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => actions.toggleSaved(site.id)}
          aria-pressed={saved}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
            saved ? "border-ink text-ink" : "border-stone text-ink hover:bg-surface-muted"
          }`}
        >
          <IconHeart
            key={saved ? "on" : "off"}
            width={18}
            fill={saved ? "currentColor" : "none"}
            className={saved ? "heart-pop text-granate" : ""}
          />
          {saved ? "Guardado" : "Guardar"}
        </button>

        {stop ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
              <IconTrip width={18} height={18} />
              En tu viaje · {formatClock(stop.visitStart ?? stop.arrival)}
              {stop.status === "provisional" && <span className="font-medium text-warn">(provisional)</span>}
            </p>
            <Link
              href="/mi-viaje"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              Ver en Mi viaje
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToTrip(site.id)}
            disabled={pending}
            className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold sm:flex-none"
          >
            <IconPlus width={18} height={18} />
            Añadir a mi viaje
          </button>
        )}
      </div>
    </div>
  );
}

export function PlacePanel({ siteId, onClose, variant }: PlacePanelProps) {
  const site = getSite(siteId);
  const headingId = useId();
  const isPage = variant === "page";
  const H1 = isPage ? "h1" : "h2";
  const H2 = isPage ? "h2" : "h3";
  const H3 = isPage ? "h3" : "h4";

  if (!site) {
    return (
      <div className="p-6 text-sm text-ink-muted">
        <p>No encontramos este lugar en el catálogo.</p>
        {onClose && (
          <button type="button" onClick={onClose} className="mt-3 min-h-11 font-semibold text-ink underline">
            Cerrar
          </button>
        )}
      </div>
    );
  }

  const claims = claimsForSite(site.id);
  const stories = storiesForSite(site.id);
  const sectionTitle = "font-display text-lg text-ink";

  const content = (
    <div className={`flex flex-col gap-6 ${isPage ? "px-4 py-5 md:px-8 md:py-8" : "px-4 py-4 md:px-5"}`}>
      <div className="flex flex-col gap-2">
        {isPage ? (
          <ViewTransition name={`place-${site.id}`} share="place-morph" default="none">
            <div>
              <SiteImage site={site} aspect="aspect-[16/10]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 768px, 100vw" />
            </div>
          </ViewTransition>
        ) : (
          <SiteImage site={site} aspect="aspect-[16/10]" priority sizes="(min-width: 768px) 420px, 100vw" />
        )}
        <PhotoCredit site={site} />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs text-ink-muted">
          {site.locality} · {site.category ?? KIND_LABEL[site.kind]}
        </p>
        <H1 id={headingId} className={`font-display leading-tight text-ink ${isPage ? "text-3xl md:text-4xl" : "text-2xl"}`}>
          {site.name}
        </H1>
        <div className="flex flex-wrap gap-1.5">
          {!site.visigothic && <NonVisigothicBadge />}
          {site.demo && <DemoBadge />}
        </div>
        <p className="text-base text-ink">{site.tagline}</p>
        <p className="text-sm leading-relaxed text-ink-muted">{site.summary}</p>
        <Link
          href={`/asistente?site=${encodeURIComponent(site.id)}`}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          <IconChat width={18} height={18} />
          Preguntar sobre este lugar
        </Link>
        <QuickActions site={site} />
      </header>

      <section aria-labelledby={`${headingId}-visit`} className="rounded-2xl border border-stone bg-surface px-4 py-1">
        <H2 id={`${headingId}-visit`} className={`${sectionTitle} pt-3`}>
          Datos de visita
        </H2>
        <dl>
          <Fact label="Duración de la visita">Aprox. {formatDuration(site.visitMinutes)}</Fact>
          <Fact label="Horario">
            <HoursLabel hours={site.hours} variant="full" />
          </Fact>
          <Fact label="Accesibilidad">
            <span className={site.access.status === "verified" ? "font-medium" : "font-medium text-ink-muted"}>
              {accessLabel(site.access)}
            </span>
            {site.access.note && <span className="mt-0.5 block text-xs text-ink-muted">{site.access.note}</span>}
          </Fact>
          <Fact label="Dirección">
            <span className="inline-flex items-start gap-1.5">
              <IconPin width={16} height={16} className="mt-0.5 shrink-0 text-ink-muted" />
              <span>
                {site.address ?? site.locality}
                {site.coordinates.approximate && (
                  <span className="block text-xs text-ink-muted">
                    Ubicación aproximada, pendiente de verificación sobre el terreno.
                  </span>
                )}
              </span>
            </span>
          </Fact>
          {site.phone && (
            <Fact label="Teléfono">
              <a href={telHref(site.phone)} className="font-medium text-ink underline underline-offset-4">
                {site.phone}
              </a>
            </Fact>
          )}
          <Fact label="Web oficial">
            {site.officialUrl ? (
              <a href={site.officialUrl} target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4">
                {hostname(site.officialUrl)}
              </a>
            ) : (
              <span className="text-ink-muted">Enlace oficial pendiente. Confirma horarios y accesos antes de ir.</span>
            )}
          </Fact>
        </dl>
      </section>

      {stories.length > 0 && (
        <section aria-labelledby={`${headingId}-stories`} className="flex flex-col gap-3">
          <H2 id={`${headingId}-stories`} className={sectionTitle}>
            Historias del lugar
          </H2>
          {stories.map((story) => (
            <article key={story.id} className="rounded-2xl border border-stone bg-surface-muted p-4">
              <H3 className="font-display text-base text-ink">{story.title}</H3>
              <p className="mt-0.5 text-xs text-ink-muted">Lectura de {story.minutes} min</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{story.body}</p>
              <StoryEvidence story={story} className="mt-3" />
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby={`${headingId}-claims`} className="flex flex-col gap-3">
        <H2 id={`${headingId}-claims`} className={sectionTitle}>
          Lo que sabemos
        </H2>
        {claims.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
            Aún no hay afirmaciones validadas para este lugar.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claims.map((c) => (
              <ClaimCard key={c.id} claim={c} />
            ))}
          </ul>
        )}
        <EvidenceLegend />
      </section>

      {site.sources && site.sources.length > 0 && (
        <section aria-labelledby={`${headingId}-sources`} className="flex flex-col gap-2">
          <H2 id={`${headingId}-sources`} className={sectionTitle}>
            Fuentes de esta ficha
          </H2>
          <ul className="flex flex-col gap-1 text-sm">
            {site.sources.map((source) => (
              <li key={source.title}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                    {source.title}
                  </a>
                ) : (
                  source.title
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  if (isPage) {
    return (
      <article aria-labelledby={headingId} className="mx-auto w-full max-w-3xl">
        {onClose && (
          <div className="px-4 pt-3 md:px-8">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-ink-muted hover:text-ink"
            >
              <IconChevronLeft width={18} height={18} />
              Volver
            </button>
          </div>
        )}
        {content}
        <ActionBar site={site} variant={variant} />
      </article>
    );
  }

  return (
    <article aria-labelledby={headingId} className="slide-in-right flex h-full min-h-0 flex-col bg-ivory">
      <div className="flex items-center justify-between border-b border-stone bg-surface px-4 py-1.5">
        <p className="text-xs font-medium text-ink-muted">Ficha del lugar</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha del lugar"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
          >
            <IconClose />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      <ActionBar site={site} variant={variant} />
    </article>
  );
}
