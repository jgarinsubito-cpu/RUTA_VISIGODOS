import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LegalPage, Section, Val } from "@/components/legal/LegalPage";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Quién ofrece Ruta Visigoda de Toledo, condiciones de uso y propiedad intelectual.",
};

export default function AvisoLegalPage() {
  const o = LEGAL.owner;
  return (
    <LegalPage href="/aviso-legal" eyebrow="Aviso legal" title="Quién está detrás de la app y en qué condiciones se usa">
      <Section id="titular" title="Titular">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico
          (LSSI), estos son los datos del titular de {LEGAL.product} (<Val>{LEGAL.domain}</Val>):
        </p>
        <Facts
          rows={[
            ["Titular", <Val key="n">{o.name}</Val>],
            ["NIF", <Val key="nif">{o.nif}</Val>],
            ["Domicilio", <Val key="a">{o.address}</Val>],
            ["Registro", <Val key="r">{o.registry}</Val>],
            ["Contacto", <Val key="e">{o.email}</Val>],
          ]}
        />
      </Section>

      <Section id="objeto" title="Qué es la app">
        <p>
          {LEGAL.product} es una guía digital gratuita del patrimonio visigodo de Toledo y su territorio, sobre la plataforma Destino Plus.
          Ofrece fichas de lugares, recorridos guiados con audio, reconstrucciones 3D, un planificador de visitas y un asistente que responde
          con fuentes validadas. Se puede usar sin cuenta.
        </p>
      </Section>

      <Section id="contenidos" title="Rigor de los contenidos">
        <ul>
          <li>
            Los contenidos históricos se apoyan en fuentes científicas y los valida la Asociación Urbs Regia. Cada afirmación indica su
            nivel: <strong>documentado</strong>, <strong>interpretación</strong> (de quién), <strong>hipótesis</strong> o{" "}
            <strong>tradición</strong>, y su fuente.
          </li>
          <li>
            Las reconstrucciones 3D muestran con un sello qué está excavado y qué es propuesta. Una reconstrucción no es una prueba de cómo
            era el edificio.
          </li>
          <li>
            Las respuestas del asistente las redacta un sistema automático a partir de las afirmaciones validadas. Puede equivocarse: ante
            una duda, prevalece la ficha con su fuente.
          </li>
          <li>
            Horarios, precios y condiciones de acceso pueden cambiar. La app indica cuándo no están verificados; confírmalos con cada lugar
            antes de ir.
          </li>
        </ul>
      </Section>

      <Section id="uso" title="Condiciones de uso">
        <ul>
          <li>Usa la app para fines personales y no comerciales, de forma respetuosa con la ley y con los demás.</li>
          <li>
            Muchos lugares son yacimientos protegidos o fincas privadas. Sigue las indicaciones de cada sitio, no entres donde no está
            permitido y no recojas ni muevas nada. La app indica qué paradas se ven solo desde el camino.
          </li>
          <li>
            La ubicación sirve para avisarte al llegar a cada parada y, si lo activas, cuando pasas cerca de un lugar de la ruta. Atiende al
            tráfico y al terreno, no a la pantalla, mientras caminas o conduces: un aviso puede esperar a que pares.
          </li>
          <li>No intentes alterar el funcionamiento de la app ni del asistente, ni extraer sus contenidos de forma automatizada.</li>
        </ul>
      </Section>

      <Section id="propiedad" title="Propiedad intelectual">
        <p>
          Los textos, locuciones, ilustraciones, reconstrucciones 3D, mapas, diseño y software de la app pertenecen a su titular o a sus
          autores, que han cedido los derechos necesarios o los han licenciado. Las imágenes de terceros se usan con su licencia y se
          acreditan en cada imagen y en <Link href="/creditos">Créditos</Link>.
        </p>
        <p>
          Puedes citar fragmentos breves indicando la fuente. Cualquier otra reproducción, distribución o transformación necesita
          autorización. Si crees que algún contenido vulnera tus derechos, escríbenos a <Val>{o.email}</Val> y lo revisaremos.
        </p>
      </Section>

      <Section id="enlaces" title="Enlaces a otros sitios">
        <p>
          La app enlaza a páginas oficiales de los lugares, a Google Maps para llegar y a las fuentes citadas. No controlamos esos sitios
          ni respondemos de sus contenidos.
        </p>
      </Section>

      <Section id="responsabilidad" title="Responsabilidad">
        <p>
          Cuidamos que la información sea exacta y la app funcione, pero no podemos garantizar que esté siempre disponible ni libre de
          errores. El titular no responde de los daños derivados del uso de la información práctica sin confirmarla, ni de las
          interrupciones del servicio ajenas a su control, en la medida en que la ley lo permita.
        </p>
      </Section>

      <Section id="datos" title="Datos personales">
        <p>
          Cómo tratamos tus datos se explica en <Link href="/privacidad">Privacidad</Link>, y lo que la app guarda en tu dispositivo, en{" "}
          <Link href="/cookies">Cookies y almacenamiento</Link>.
        </p>
      </Section>

      <Section id="ley" title="Ley aplicable">
        <p>
          Estas condiciones se rigen por la ley española. Si eres consumidor, puedes acudir a los tribunales de tu domicilio.
        </p>
      </Section>
    </LegalPage>
  );
}
