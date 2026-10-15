import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getRouteBySlug, getSite, routes } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import type { Site } from "@/domain/types";
import { estimateRoute } from "@/domain/planner";
import { formatDuration, TRANSPORT_LABEL, travelLegText } from "@/lib/labels";
import { IconChevronLeft, IconClock, IconInfo, IconPin, IconRoute } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { HoursLabel } from "@/components/shared/HoursLabel";
import { SiteCard } from "@/components/shared/SiteCard";
import { RouteActions } from "@/components/explore/RouteActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  await loadPublishedCatalog();
  return routes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await loadPublishedCatalog();
  const route = getRouteBySlug(slug);
  if (!route) return { title: "Ruta no encontrada" };
  return { title: route.name, description: route.summary };
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone bg-surface px-4 py-3">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div className="flex flex-col">
        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

export default async function RouteDetailPage({ params }: Props) {
  const { slug } = await params;
  await loadPublishedCatalog();
  const route = getRouteBySlug(slug);
  if (!route) notFound();

  const stops = route.stopIds.map((id) => getSite(id)).filter((s): s is Site => s !== undefined);
  const localities = Array.from(new Set(stops.map((s) => s.locality)));
  const approximate = stops.some((s) => s.coordinates.approximate);
  const estimate = estimateRoute(route);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-4 md:px-8 md:pt-8">
      <Link
        href="/rutas"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        <IconChevronLeft width={18} height={18} />
        Todas las rutas
      </Link>

      <header className="flex flex-col gap-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">Ruta · {localities.join(" y ")}</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{route.name}</h1>
        <p className="text-base font-medium text-ink">{route.theme}</p>
        {route.demo && <DemoBadge className="self-start" />}
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">{route.summary}</p>
        <RouteActions routeId={route.id} />
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact icon={<IconClock width={18} height={18} />} label="Duración estimada">
          Aprox. {formatDuration(estimate.minutes)}
        </Fact>
        <Fact icon={<IconRoute width={18} height={18} />} label="Transporte">
          {TRANSPORT_LABEL[route.transport]}
        </Fact>
        <Fact icon={<IconPin width={18} height={18} />} label="Paradas">
          {stops.length} {stops.length === 1 ? "parada" : "paradas"}
        </Fact>
      </dl>

      <section aria-labelledby="route-stops" className="flex flex-col gap-4">
        <h2 id="route-stops" className="font-display text-2xl text-ink">
          Paradas en orden
        </h2>
        <p className="text-sm text-ink-muted">
          Duración y trayectos son estimaciones; las horas exactas se calculan al adaptar la ruta a tu día.
          {approximate && " Coordenadas aproximadas, pendientes de verificación."}
        </p>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stops.map((s, i) => {
            const leg = estimate.stops.find((st) => st.siteId === s.id)?.travelMinutesFromPrevious ?? 0;
            return (
            <li key={s.id} className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-on-primary"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-ink">Parada {i + 1}</span>
                  {" · "}
                  {i === 0 ? "Inicio" : `≈ ${travelLegText(leg, route.transport)} desde la anterior`}
                </span>
              </p>
              <SiteCard site={s} />
              <HoursLabel hours={s.hours} />
            </li>
            );
          })}
        </ol>
        {stops.some((s) => s.image) && <p className="text-xs text-ink-muted">Fotos: Wikimedia Commons (créditos en cada ficha).</p>}
      </section>

      {route.limitations.length > 0 && (
        <section aria-labelledby="route-limits" className="rounded-2xl border border-stone bg-surface p-4 md:p-5">
          <h2 id="route-limits" className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconInfo className="text-warn" />
            Limitaciones a tener en cuenta
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink">
            {route.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
