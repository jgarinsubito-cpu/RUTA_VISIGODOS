"use client";
/**
 * Frame of the content admin (/admin): its own header and section navigation instead of the
 * visitor navigation, and the access checks every admin page needs (configured, signed in, staff).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthPanel } from "@/components/account/AuthForms";
import { CrownArch } from "@/components/shared/CrownArch";
import { IconInfo } from "@/components/shell/icons";
import { accountActions, useAccount } from "@/state/account";
import { adminActions, useAdmin } from "@/state/admin";
import { KIND_INFO } from "./model";
import { btnPrimary, btnSecondary } from "./ui";

const SECTIONS = [
  { href: "/admin", label: "Resumen" },
  { href: KIND_INFO.site.path, label: KIND_INFO.site.many },
  { href: KIND_INFO.stop.path, label: KIND_INFO.stop.many },
  { href: KIND_INFO.claim.path, label: KIND_INFO.claim.many },
  { href: KIND_INFO.story.path, label: KIND_INFO.story.many },
  { href: KIND_INFO.route.path, label: KIND_INFO.route.many },
  { href: KIND_INFO.piece.path, label: KIND_INFO.piece.many },
  { href: KIND_INFO.service.path, label: KIND_INFO.service.many },
  { href: KIND_INFO.showcase.path, label: KIND_INFO.showcase.many },
  { href: "/admin/probar", label: "Probar el asistente" },
  { href: "/admin/publicar", label: "Publicar" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-stone bg-surface p-5 md:p-6">
      <h1 className="font-display text-2xl text-ink">{title}</h1>
      {children}
    </section>
  );
}

function Gate() {
  const status = useAdmin((s) => s.status);
  const error = useAdmin((s) => s.error);
  const email = useAccount((s) => s.email);
  switch (status) {
    case "unavailable":
      return (
        <Notice title="Gestor de contenidos no disponible">
          <p className="text-sm text-ink-muted">
            Esta instalación no está conectada al almacén de contenidos (Supabase). La web muestra el catálogo de demostración
            incluido en la app. Para activar el gestor, configura las variables de Supabase y aplica la migración del gestor
            (docs/ADMIN.md).
          </p>
        </Notice>
      );
    case "loading":
      return (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Comprobando tu acceso…
        </p>
      );
    case "signed-out":
      return (
        <Notice title="Entra con tu cuenta del equipo">
          <p className="text-sm text-ink-muted">El gestor es solo para el equipo editorial. Usa la cuenta con la que te dieron acceso.</p>
          <AuthPanel initialMode="signin" />
        </Notice>
      );
    case "not-staff":
      return (
        <Notice title="Tu cuenta no tiene acceso">
          <p className="text-sm text-ink-muted">
            {email ? `${email} no` : "Esta cuenta no"} forma parte del equipo editorial. Pide a quien administra el proyecto que te añada
            (docs/ADMIN.md, «Quién puede editar»).
          </p>
          <button type="button" onClick={() => void accountActions.signOut()} className={`${btnSecondary} self-start`}>
            Cerrar sesión
          </button>
        </Notice>
      );
    case "error":
      return (
        <Notice title="No se pudo cargar el gestor">
          <p className="flex items-start gap-2 text-sm text-danger">
            <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
          <button type="button" onClick={() => void adminActions.reload()} className={`${btnPrimary} self-start`}>
            Reintentar
          </button>
        </Notice>
      );
    default:
      return null;
  }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useAdmin((s) => s.status);
  const role = useAdmin((s) => s.role);
  const inReview = useAdmin((s) => s.records.filter((r) => r.status === "review").length);
  const ready = status === "ready";

  return (
    <div className="min-h-dvh bg-ivory">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-stone bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/admin" className="flex min-h-11 items-center gap-2.5 rounded-lg">
            <CrownArch className="h-8 w-9 shrink-0" />
            <span className="leading-tight">
              <span className="block font-display text-lg text-ink">Gestor de contenidos</span>
              <span className="block text-2xs text-ink-muted">Ruta Visigoda</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {ready && role && (
              <span className="rounded-full border border-stone px-2.5 py-1 text-xs font-semibold text-ink-muted">
                {role === "validator" ? "Validación" : "Edición"}
              </span>
            )}
            <Link href="/" className={btnSecondary}>
              Ver la web
            </Link>
            {ready && (
              <button type="button" onClick={() => void accountActions.signOut()} className={btnSecondary}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
        {ready && (
          <nav aria-label="Secciones del gestor" className="mx-auto w-full max-w-6xl px-2 md:px-6">
            <ul className="flex flex-wrap gap-1 pb-2">
              {SECTIONS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
                        active ? "bg-surface-muted font-semibold text-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      {label}
                      {href === "/admin/publicar" && inReview > 0 && (
                        <span className="rounded-full bg-warn-soft px-1.5 text-xs font-semibold tabular-nums text-warn">
                          {inReview}
                          <span className="sr-only"> en revisión</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>
      <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 focus:outline-none md:px-8 md:py-8">
        {ready ? children : <Gate />}
      </main>
    </div>
  );
}
