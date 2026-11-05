import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookies y almacenamiento",
  description: "Qué guarda Ruta Visigoda en tu dispositivo y por qué no necesita un aviso de cookies.",
};

/** What the app keeps in the browser. Keep this table in step with the storage keys in the code. */
const STORAGE: { name: string; kind: string; what: string; lasts: string }[] = [
  {
    name: "ruta-visigoda:v2",
    kind: "Almacenamiento local",
    what: "Tu viaje, lugares guardados, conversaciones con el asistente, contexto de la visita y avance de los recorridos guiados.",
    lasts: "Hasta que lo borres",
  },
  {
    name: "ruta-visigoda:display",
    kind: "Almacenamiento local",
    what: "Ajustes de lectura: tamaño del texto y reducción de movimiento.",
    lasts: "Hasta que lo borres",
  },
  {
    name: "ruta-visigoda:signup-prompt",
    kind: "Almacenamiento local",
    what: "Que ya cerraste la invitación a crear una cuenta, para no repetirla.",
    lasts: "Hasta que lo borres",
  },
  {
    name: "ruta-visigoda:auth",
    kind: "Almacenamiento local",
    what: "Solo con cuenta: la sesión iniciada, para no pedirte la contraseña en cada visita.",
    lasts: "Hasta que cierres la sesión",
  },
  {
    name: "Pregunta pendiente",
    kind: "Almacenamiento de sesión",
    what: "La pregunta que lanzas desde una ficha mientras se abre el chat.",
    lasts: "Se borra al leerla o al cerrar la pestaña",
  },
  {
    name: "rv-shell-…",
    kind: "Caché de la app",
    what: "Páginas y archivos ya vistos, para que la app abra rápido y funcione con mala cobertura.",
    lasts: "Se renueva con cada versión",
  },
  {
    name: "rv-packs-v1",
    kind: "Caché de la app",
    what: "Los recorridos que descargas para usar sin conexión (textos, audios, imágenes y modelos 3D).",
    lasts: "Hasta que borres la descarga",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      href="/cookies"
      eyebrow="Cookies y almacenamiento"
      title="Lo que la app guarda en tu dispositivo"
      intro={
        <p>
          La app no usa cookies de publicidad, de analítica ni de seguimiento, y no comparte con nadie lo que guarda en tu dispositivo.
          Por eso no te pedimos que aceptes cookies.
        </p>
      }
    >
      <Section id="que" title="Qué guarda y para qué">
        <p>
          Para funcionar, la app usa el almacenamiento de tu navegador. Todo es necesario para darte el servicio que pides: guardar tu
          viaje, mantener tu sesión o hacer un recorrido sin conexión. Estos usos están exentos de consentimiento según el artículo 22.2
          de la LSSI y la guía sobre cookies de la Agencia Española de Protección de Datos.
        </p>
        {/* Phones: one card per item; wider screens: the table. */}
        <ul className="list-none! pl-0! sm:hidden">
          {STORAGE.map((s) => (
            <li key={s.name} className="pl-0! rounded-xl border border-stone bg-surface p-3 text-sm">
              <p className="font-mono text-xs text-ink">{s.name}</p>
              <p>{s.what}</p>
              <p className="mt-1 text-xs">
                {s.kind} · {s.lasts}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-stone sm:block">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="sr-only">Datos que la app guarda en el navegador</caption>
            <thead className="bg-surface-muted text-ink">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Nombre
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Para qué
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Duración
                </th>
              </tr>
            </thead>
            <tbody>
              {STORAGE.map((s) => (
                <tr key={s.name} className="border-t border-stone align-top">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-normal text-ink">
                    {s.name}
                  </th>
                  <td className="px-3 py-2">{s.kind}</td>
                  <td className="px-3 py-2">{s.what}</td>
                  <td className="px-3 py-2">{s.lasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="terceros" title="Servicios de terceros">
        <ul>
          <li>
            <strong>Mapa.</strong> Las imágenes del mapa de fondo se piden al proveedor de mapas, que recibe tu dirección IP como al abrir
            cualquier web. No instala cookies desde la app.
          </li>
          <li>
            <strong>Cómo llegar.</strong> El enlace abre Google Maps. A partir de ahí se aplican las cookies y la política de Google.
          </li>
          <li>
            <strong>Entrar con Google.</strong> Si eliges esta opción, el inicio de sesión ocurre en las páginas de Google, con sus propias
            cookies.
          </li>
        </ul>
      </Section>

      <Section id="borrar" title="Cómo borrarlo">
        <ul>
          <li>Una descarga sin conexión: desde el recorrido, con «Borrar descarga».</li>
          <li>La sesión: cerrándola en <Link href="/cuenta">Tu cuenta</Link>.</li>
          <li>Todo: borrando los datos de este sitio en los ajustes de tu navegador. Perderás el viaje, los guardados y los chats.</li>
        </ul>
      </Section>

      <Section id="cambios" title="Si esto cambia">
        <p>
          Si algún día la app incorpora analítica u otra herramienta que no sea estrictamente necesaria, te pediremos antes tu
          consentimiento y podrás rechazarla tan fácilmente como aceptarla. Más información en <Link href="/privacidad">Privacidad</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
