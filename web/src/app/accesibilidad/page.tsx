import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Val } from "@/components/legal/LegalPage";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = {
  title: "Accesibilidad",
  description: "Cómo hacemos accesible Ruta Visigoda, qué limitaciones conocemos y cómo avisarnos.",
};

export default function AccesibilidadPage() {
  return (
    <LegalPage
      href="/accesibilidad"
      eyebrow="Accesibilidad"
      title="Una ruta para todo el mundo"
      intro={
        <p>
          Queremos que cualquier persona pueda usar la app, también con lector de pantalla, solo con teclado, con baja visión, sin oír el
          audio o sin poder caminar hasta cada punto. Esta es una declaración voluntaria de cómo lo hacemos.
        </p>
      }
    >
      <Section id="objetivo" title="Objetivo y estado">
        <p>
          Nuestro objetivo es el nivel AA de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2, que recoge la norma europea EN
          301 549. La app se ha diseñado y revisado internamente con ese criterio, pero <strong>aún no ha pasado una auditoría externa</strong>
          , así que no podemos declararla conforme. Está prevista para <Val>[fecha de la auditoría]</Val>.
        </p>
      </Section>

      <Section id="medidas" title="Qué hemos hecho">
        <ul>
          <li>Todos los controles tienen nombre para lectores de pantalla, se usan con teclado y miden al menos 44 píxeles.</li>
          <li>El estado nunca se indica solo con color: siempre hay texto o icono.</li>
          <li>Se puede agrandar el texto y reducir el movimiento desde la app, y se respetan los ajustes del sistema.</li>
          <li>Funciona desde pantallas de 320 píxeles de ancho y con zoom del 200 %.</li>
          <li>Cada locución tiene su transcripción completa, para personas sordas o lugares con ruido.</li>
          <li>Las imágenes tienen texto alternativo, y cada reconstrucción 3D, una descripción de lo que muestra y de qué es hipótesis.</li>
          <li>
            Los recorridos se pueden hacer sin ubicación, eligiendo cada parada a mano, y en modo virtual desde casa, sin desplazarse.
          </li>
          <li>El mapa ilustrado tiene, además, la lista de paradas en texto.</li>
        </ul>
      </Section>

      <Section id="limitaciones" title="Limitaciones conocidas">
        <ul>
          <li>
            El mapa interactivo es difícil de usar con lector de pantalla. Toda su información está también en las listas de lugares y en
            cada ficha.
          </li>
          <li>Los modelos 3D y la realidad aumentada son visuales; su contenido se explica en la descripción que los acompaña.</li>
          <li>Algunas imágenes históricas de terceros pueden tener poco contraste.</li>
          <li>Los contenidos están, de momento, solo en español.</li>
        </ul>
      </Section>

      <Section id="lugares" title="Accesibilidad de los lugares">
        <p>
          La app indica el acceso de cada lugar solo cuando está verificado; si no, lo marca como «Sin verificar». Muchos yacimientos son
          terrenos al aire libre, con caminos de tierra y desniveles. Consulta con cada lugar antes de ir. Si tienes una cuenta, puedes
          indicarnos tus necesidades (con tu permiso expreso) para que el planificador las tenga en cuenta; ver{" "}
          <Link href="/privacidad">Privacidad</Link>.
        </p>
      </Section>

      <Section id="contacto" title="Avísanos">
        <p>
          Si encuentras una barrera, o necesitas un contenido en otro formato, escríbenos a <Val>{LEGAL.owner.email}</Val> indicando la
          página y qué ocurre. Te responderemos en un plazo máximo de {LEGAL.accessibilityReplyDays} días hábiles y corregiremos lo que
          podamos en la siguiente versión.
        </p>
      </Section>
    </LegalPage>
  );
}
