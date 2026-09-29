import Link from "next/link";

export default function PlaceNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-3 px-4 py-12 md:px-8">
      <h1 className="font-display text-2xl text-ink">No encontramos este lugar</h1>
      <p className="text-sm text-ink-muted">Puede que el enlace sea antiguo o que el lugar ya no forme parte de la demo.</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-olive px-5 text-sm font-semibold text-on-olive hover:bg-olive-hover"
      >
        Volver a Explorar
      </Link>
    </div>
  );
}
