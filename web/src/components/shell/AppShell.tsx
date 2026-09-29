"use client";
/**
 * Global layout. Desktop: labelled left rail (Mindtrip /chat reference, Urbs Regia palette).
 * Mobile: five labelled bottom destinations (PLAN.md, "Navigation and principal screens").
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { actions, getAppState, useAppState } from "@/state/store";
import { NoticeToast } from "@/components/shared/NoticeToast";
import { ProposalReview } from "@/components/trip/ProposalReview";
import {
  IconChat,
  IconChevronLeft,
  IconHeart,
  IconHome,
  IconMap,
  IconPlus,
  IconRoute,
  IconTrip,
} from "./icons";

const NAV = [
  { href: "/", label: "Explorar", icon: IconHome, mobile: true },
  { href: "/asistente", label: "Asistente", icon: IconChat, mobile: true },
  { href: "/mi-viaje", label: "Mi viaje", icon: IconTrip, mobile: true },
  { href: "/mapa", label: "Mapa", icon: IconMap, mobile: true },
  { href: "/rutas", label: "Rutas", icon: IconRoute, mobile: false },
  { href: "/guardados", label: "Guardados", icon: IconHeart, mobile: true },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const stopCount = useAppState((s) => s.trip.stops.length);
  const conversations = useAppState((s) => s.conversations);
  const recent = conversations.filter((c) => c.messages.length > 0);
  const activeConversationId = useAppState((s) => s.activeConversationId);

  // A place selected on one screen must not pop up as a panel or modal sheet on the next. Layout
  // effects run before the new page's passive effects, so pages that select on arrival
  // (/asistente?site=…) still win.
  useLayoutEffect(() => {
    if (getAppState().selectedSiteId !== null) actions.selectSite(null);
  }, [pathname]);

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
          collapsed ? "w-[72px]" : "w-60"
        } transition-[width]`}
        aria-label="Navegación principal"
      >
        <div className={`flex items-center justify-between pb-2 pt-4 ${collapsed ? "flex-col gap-2 px-2" : "px-4"}`}>
          <Link href="/" className="flex items-center gap-2" aria-label="Ruta Visigoda, inicio">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-olive font-display text-sm text-on-olive">
              RV
            </span>
            {!collapsed && (
              <span className="leading-tight">
                <span className="block font-display text-base">Ruta Visigoda</span>
                <span className="block text-[11px] uppercase tracking-[0.14em] text-gold">Toledo</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`grid h-11 w-11 ${collapsed ? "" : "-mr-1.5"} shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted`}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
          >
            <IconChevronLeft className={collapsed ? "rotate-180" : ""} />
          </button>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                  active ? "bg-gold-soft text-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <Icon />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && href === "/mi-viaje" && stopCount > 0 && (
                  <span className="rounded-full bg-olive px-2 text-xs text-on-olive" aria-label={`${stopCount} paradas`}>
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
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-muted text-sm font-semibold hover:bg-stone"
          >
            <IconPlus />
            {!collapsed && "Nuevo chat"}
          </button>
        </div>

        {!collapsed && recent.length > 0 && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Chats recientes</p>
            <ul>
              {recent.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      actions.openConversation(c.id);
                      router.push("/asistente");
                    }}
                    className={`flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm ${
                      c.id === activeConversationId && pathname === "/asistente"
                        ? "bg-surface-muted text-ink"
                        : "text-ink-muted hover:bg-surface-muted"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto border-t border-stone px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
          {!collapsed ? (
            <>
              <p className="font-medium text-warn">Versión de demostración</p>
              <p>Contenido pendiente de validación por Urbs Regia. Guardado solo en este dispositivo.</p>
            </>
          ) : (
            <span className="font-medium text-warn" title="Versión de demostración">
              Demo
            </span>
          )}
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
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
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-olive" : "text-ink-muted"
              }`}
            >
              <Icon />
              {label}
              {href === "/mi-viaje" && stopCount > 0 && (
                <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-gold" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>

      <NoticeToast />
      <ProposalReview />
    </div>
  );
}
