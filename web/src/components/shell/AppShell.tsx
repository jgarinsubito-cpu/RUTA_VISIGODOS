"use client";
/**
 * Global layout. Desktop: labelled left rail (Mindtrip /chat reference). Mobile: five labelled
 * bottom destinations (PLAN.md, "Navigation and principal screens"). Route changes animate
 * with React ViewTransition.
 */
import Link from "next/link";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, ViewTransition, type ReactNode } from "react";
import { actions, getAppState, useAppState } from "@/state/store";
import { accountActions, useAccount } from "@/state/account";
import { localities } from "@/data/content";
import { NoticeToast } from "@/components/shared/NoticeToast";
import { CrownArch } from "@/components/shared/CrownArch";
import { ProposalReview } from "@/components/trip/ProposalReview";
import { NearbyAlertCard } from "@/components/nearby/NearbyAlertCard";
import { NearbyWatcher } from "@/components/nearby/NearbyWatcher";
import {
  IconChat,
  IconChevronLeft,
  IconHeart,
  IconHome,
  IconMap,
  IconPlus,
  IconRoute,
  IconSpark,
  IconPin,
  IconTrip,
  IconUser,
} from "./icons";

const NAV = [
  { href: "/", label: "Explorar", icon: IconHome, mobile: true },
  { href: "/asistente", label: "Asistente", icon: IconChat, mobile: true },
  { href: "/mi-viaje", label: "Mi viaje", icon: IconTrip, mobile: true },
  { href: "/mapa", label: "Mapa", icon: IconMap, mobile: true },
  { href: "/planificar", label: "Planificar", icon: IconSpark, mobile: false },
  { href: "/rutas", label: "Rutas", icon: IconRoute, mobile: false },
  { href: "/servicios", label: "Servicios", icon: IconPin, mobile: false },
  { href: "/guardados", label: "Guardados", icon: IconHeart, mobile: true },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Full-screen pages (assistant, map, guided tours) have no room for the footer; the rail links the legal pages there. */
function withFooter(pathname: string): boolean {
  if (pathname === "/asistente" || pathname === "/mapa") return false;
  return !/\/(recorrido|visita)$/.test(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const stopCount = useAppState((s) => s.trip.stops.length);
  const conversations = useAppState((s) => s.conversations);
  const recent = conversations.filter((c) => c.messages.length > 0);
  const activeConversationId = useAppState((s) => s.activeConversationId);
  const accountStatus = useAccount((s) => s.status);
  const accountEmail = useAccount((s) => s.email);

  // Session and display choices (larger text, less motion) apply on every screen.
  useEffect(() => accountActions.start(), []);

  // A place selected on one screen must not pop up as a panel or modal sheet on the next. Layout
  // effects run before the new page's passive effects, so pages that select on arrival
  // (/asistente?site=…) still win.
  useLayoutEffect(() => {
    if (getAppState().selectedSiteId !== null) actions.selectSite(null);
  }, [pathname]);

  // The content admin has its own frame (components/admin/AdminShell), without visitor navigation.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <div className="min-h-dvh">{children}</div>;
  }

  function startChat() {
    // The conversation is created on the first message, so empty chats never pile up.
    actions.openConversation(null);
    router.push("/asistente");
  }

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      {/* Desktop rail */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-stone bg-surface md:flex ${
          collapsed ? "w-[76px]" : "w-64"
        } transition-[width] duration-300`}
        aria-label="Navegación principal"
      >
        <div className={`flex items-center justify-between pb-2 pt-5 ${collapsed ? "flex-col gap-3 px-2" : "px-5"}`}>
          <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Ruta Visigoda, inicio">
            <CrownArch className="h-9 w-10 shrink-0" />
            {!collapsed && (
              <span className="leading-tight">
                <span className="block whitespace-nowrap font-display text-lg text-ink">Ruta Visigoda</span>
                <span className="block whitespace-nowrap text-2xs text-ink-muted">{localities().join(" · ")}</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`grid h-11 w-11 ${collapsed ? "" : "-mr-2"} shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink`}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
          >
            <IconChevronLeft width={18} className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
                  active ? "bg-surface-muted font-semibold text-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <Icon width={19} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && href === "/mi-viaje" && stopCount > 0 && (
                  <span className="text-xs font-semibold tabular-nums text-ink-muted" aria-label={`${stopCount} paradas`}>
                    {stopCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 px-3">
          <button
            type="button"
            onClick={startChat}
            aria-label={collapsed ? "Nuevo chat" : undefined}
            title={collapsed ? "Nuevo chat" : undefined}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            <IconPlus width={16} />
            {!collapsed && "Nuevo chat"}
          </button>
        </div>

        {!collapsed && recent.length > 0 && (
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
            <p className="px-3 pb-1.5 text-2xs font-medium text-ink-muted">Chats recientes</p>
            <ul className="flex flex-col">
              {recent.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      actions.openConversation(c.id);
                      router.push("/asistente");
                    }}
                    className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm transition-colors ${
                      c.id === activeConversationId && pathname === "/asistente"
                        ? "bg-surface-muted text-ink"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {accountStatus !== "unavailable" && (
          <div className="mt-auto px-3 pt-3">
            <Link
              href="/cuenta"
              aria-current={isActive(pathname, "/cuenta") ? "page" : undefined}
              title={collapsed ? "Cuenta" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
                isActive(pathname, "/cuenta") ? "bg-surface-muted font-semibold text-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <IconUser width={19} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate">
                  {accountStatus === "signed-in" && accountEmail ? accountEmail : "Entrar o crear cuenta"}
                </span>
              )}
            </Link>
          </div>
        )}

        <div className={`${accountStatus === "unavailable" ? "mt-auto" : ""} px-5 py-4 text-xs leading-relaxed text-ink-muted`}>
          {!collapsed ? (
            <>
              <p className="font-semibold text-warn" title="Contenido pendiente de validación por Urbs Regia">
                Versión demo
              </p>
              <Link href="/aviso-legal" className="-mx-1 inline-flex min-h-11 items-center px-1 underline-offset-4 hover:text-ink hover:underline">
                Aviso legal, privacidad y créditos
              </Link>
            </>
          ) : (
            <span className="font-semibold text-warn" title="Versión de demostración">
              Demo
            </span>
          )}
        </div>
      </aside>

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 flex-1 pb-[calc(var(--mobile-nav)+env(safe-area-inset-bottom))] focus:outline-none md:pb-0"
      >
        {/* Route change: the old page fades out, the new one fades in (React ViewTransition). */}
        <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
          {/* The footer goes inside the page box: outside it, main's height ignores it and the rail stops sticking. */}
          <div className="min-h-full">
            {children}
            {withFooter(pathname) && <SiteFooter />}
          </div>
        </ViewTransition>
      </main>

      {/* Mobile bottom navigation, anchored to the screen edge */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-stone bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-2xs transition-colors duration-150 ${
                active ? "font-semibold text-ink" : "text-ink-muted"
              }`}
            >
              <Icon width={20} />
              {label}
              {href === "/mi-viaje" && stopCount > 0 && (
                <span className="absolute right-[calc(50%-16px)] top-2 h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>

      <NoticeToast />
      <NearbyWatcher />
      <NearbyAlertCard />
      <ProposalReview />
    </div>
  );
}
