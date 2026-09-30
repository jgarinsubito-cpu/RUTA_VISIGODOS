import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos guarda Ruta Visigoda, dónde y para qué.",
};

/** Plain-language data summary. A draft: the legal text must be reviewed before launch. */
export default function PrivacidadPage() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 text-ink md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Privacidad</p>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">Qué datos guardamos y para qué</h1>
        <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm">
          Borrador de demostración pendiente de revisión legal. Resume cómo funciona la app hoy.
        </p>
      </header>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Sin cuenta</h2>
        <p className="text-body leading-relaxed text-ink-muted">
          Tu viaje, tus lugares guardados, tus chats y tus preferencias se guardan solo en este dispositivo (almacenamiento del
          navegador). No los enviamos a ningún servidor, salvo el texto de cada pregunta al asistente, que se procesa para responderte.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Con cuenta</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body leading-relaxed text-ink-muted">
          <li>Datos de acceso: correo, nombre y, si lo indicas, país de residencia. Con Google, el nombre y el correo de tu cuenta de Google.</li>
          <li>Preferencias: intereses, ritmo, con quién viajas, cómo te desplazas y cómo quieres las explicaciones.</li>
          <li>
            Necesidades de accesibilidad y opciones de lectura, solo si lo aceptas expresamente: pueden revelar información de salud.
            Puedes retirar el permiso cuando quieras y se borran de la cuenta.
          </li>
          <li>Tu viaje, tus guardados y tus chats siguen solo en tu dispositivo.</li>
        </ul>
        <p className="text-body leading-relaxed text-ink-muted">
          Se usan únicamente para adaptar las recomendaciones de la app. Se alojan en Supabase y solo tú puedes leer tus datos.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Tus derechos</h2>
        <p className="text-body leading-relaxed text-ink-muted">
          Desde{" "}
          <Link href="/cuenta" className="font-semibold text-ink underline underline-offset-4">
            Tu cuenta
          </Link>{" "}
          puedes cambiar o borrar tus preferencias y respuestas de accesibilidad en cualquier momento.
        </p>
      </section>
    </article>
  );
}
