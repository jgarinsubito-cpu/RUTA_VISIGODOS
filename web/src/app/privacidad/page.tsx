import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LegalPage, Section, Val } from "@/components/legal/LegalPage";
import { assistantRecipient, LEGAL, RECIPIENTS, type DataRecipient } from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos trata Ruta Visigoda, dónde, para qué y cómo ejercer tus derechos.",
};

/** Lower-case the first letter, to follow a colon or a verb. */
const lc = (t: string) => (t.startsWith("[") ? t : t.charAt(0).toLowerCase() + t.slice(1));

function Recipient({ r }: { r: DataRecipient }) {
  return (
    <li>
      <strong>
        <Val>{r.name}</Val>
      </strong>{" "}
      ({r.kind === "encargado" ? "trata los datos por cuenta nuestra" : "responsable de sus propios datos"}). {r.role} Recibe {lc(r.data)}{" "}
      Dónde: <Val>{lc(r.location)}</Val>
      {r.policyUrl && (
        <>
          {" "}
          <a href={r.policyUrl} target="_blank" rel="noopener noreferrer">
            Su política
          </a>
          .
        </>
      )}
    </li>
  );
}

/** Information required by GDPR art. 13, in plain words, matching what the app does today. */
export default function PrivacidadPage() {
  const o = LEGAL.owner;
  const model = assistantRecipient();
  return (
    <LegalPage
      href="/privacidad"
      eyebrow="Privacidad"
      title="Qué datos tratamos y para qué"
      intro={
        <p>
          La app se usa sin cuenta y casi todo lo que haces se queda en tu dispositivo. Aquí explicamos qué sale de él, a quién llega y qué
          derechos tienes, según el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
        </p>
      }
    >
      <Section id="resumen" title="En resumen">
        <ul>
          <li>Sin cuenta, no sabemos quién eres. Tu viaje, tus guardados y tus chats se quedan en este dispositivo.</li>
          <li>Tu ubicación se usa solo en el dispositivo, para avisarte al llegar a cada parada. Nunca se envía.</li>
          <li>Las preguntas al asistente se envían para responderlas y no las guardamos.</li>
          <li>La cuenta es opcional y solo guarda tus preferencias de visita. Las de accesibilidad, solo si das tu permiso expreso.</li>
          <li>No hay publicidad, no vendemos datos y no usamos cookies de seguimiento.</li>
        </ul>
      </Section>

      <Section id="responsable" title="Responsable">
        <Facts
          rows={[
            ["Responsable", <Val key="n">{o.name}</Val>],
            ["NIF", <Val key="nif">{o.nif}</Val>],
            ["Domicilio", <Val key="a">{o.address}</Val>],
            ["Protección de datos", <Val key="e">{o.privacyEmail}</Val>],
            ...(o.dpo ? ([["Delegado de protección de datos", o.dpo]] as [string, string][]) : []),
          ]}
        />
      </Section>

      <Section id="dispositivo" title="Lo que se queda en tu dispositivo">
        <p>Esto se guarda en el almacenamiento de tu navegador y no nos llega:</p>
        <ul>
          <li>Tu viaje, los lugares guardados, las conversaciones con el asistente y tus ajustes de lectura.</li>
          <li>El avance de los recorridos guiados y los recorridos que descargas para usar sin conexión.</li>
          <li>
            Tu ubicación, si das permiso al navegador. La app la compara en el propio dispositivo con las zonas de llegada de cada parada.
            Puedes hacer los recorridos sin ella, eligiendo cada parada a mano.
          </li>
        </ul>
        <p>
          Se borra al borrar los datos del sitio en tu navegador. Más detalle en <Link href="/cookies">Cookies y almacenamiento</Link>.
        </p>
      </Section>

      <Section id="tratamientos" title="Qué datos tratamos, para qué y con qué base">
        <p>
          <strong>Funcionamiento de la app.</strong> Al abrirla, el servidor recibe tu dirección IP y datos técnicos del navegador, como
          cualquier web. Los usamos para servirte la app y protegerla de abusos: el asistente limita las preguntas por dirección IP en la
          memoria del servidor, que la olvida en minutos. Base: interés legítimo en prestar un servicio seguro (art. 6.1.f RGPD). Los
          registros técnicos del alojamiento se conservan <Val>[plazo de conservación de los registros del servidor]</Val>.
        </p>
        <p>
          <strong>Preguntas al asistente.</strong> Cuando preguntas, enviamos tu pregunta, los últimos mensajes de la conversación, el
          contexto del viaje (zona, fecha, horario, transporte, perfil) y, si los tienes, tus intereses, tu ritmo, con quién viajas y las
          necesidades de accesibilidad que hayas marcado, para que la respuesta se ajuste a ti. No enviamos tu nombre, tu correo ni tu
          ubicación. No guardamos las preguntas en nuestros servidores. Base: la prestación del servicio que pides (art. 6.1.b RGPD) y,
          para las necesidades de accesibilidad, tu consentimiento expreso (art. 9.2.a RGPD).{" "}
          {model ? (
            <>
              Las respuestas las redacta {model.name}, que trata estos datos por cuenta nuestra (ver «A quién llegan»).
            </>
          ) : (
            <>Ahora mismo el asistente responde sin un modelo externo: la pregunta no sale de nuestro servidor.</>
          )}{" "}
          No escribas en el chat datos personales que no hagan falta.
        </p>
        <p>
          <strong>Cuenta (opcional).</strong> Si creas una cuenta, tratamos tu correo, tu nombre, tu contraseña cifrada (o, si entras con
          Google, el nombre y el correo que Google nos facilita), tu país si lo indicas, y tus preferencias de visita: intereses, ritmo, con
          quién viajas y cómo te desplazas. Sirven para mantener tu sesión y adaptar las recomendaciones. Base: el contrato de uso de la
          cuenta que aceptas (art. 6.1.b RGPD). Tu viaje, tus guardados y tus chats siguen solo en tu dispositivo.
        </p>
        <p>
          <strong>Necesidades de accesibilidad.</strong> Solo si las indicas y das tu permiso expreso, guardamos en tu cuenta tus
          necesidades de accesibilidad y opciones de lectura. Pueden revelar datos de salud, por eso piden tu consentimiento explícito (art.
          9.2.a RGPD). Puedes retirarlo cuando quieras desde <Link href="/cuenta">Tu cuenta</Link>: se borran de inmediato, sin afectar a lo
          hecho antes.
        </p>
        <p>
          No usamos tus datos para publicidad, no hacemos perfiles comerciales y no tomamos decisiones automatizadas con efectos jurídicos
          sobre ti. Las recomendaciones del asistente y del planificador son sugerencias que tú aceptas o no.
        </p>
      </Section>

      <Section id="destinatarios" title="A quién llegan">
        <p>No cedemos tus datos a nadie salvo obligación legal. Estos servicios intervienen:</p>
        <ul>
          <Recipient r={RECIPIENTS.hosting} />
          <Recipient r={RECIPIENTS.supabase} />
          {model && <Recipient r={model} />}
          <Recipient r={RECIPIENTS.google} />
          <Recipient r={RECIPIENTS.tiles} />
        </ul>
        <p>
          Con los que tratan datos por cuenta nuestra tenemos un contrato de encargo (art. 28 RGPD). Si alguno los trata fuera del Espacio
          Económico Europeo, se indica arriba con qué garantía.
        </p>
      </Section>

      <Section id="conservacion" title="Cuánto tiempo">
        <ul>
          <li>Preguntas al asistente: no las guardamos; el proveedor del modelo las conserva según su contrato <Val>[confirmar plazo]</Val>.</li>
          <li>
            Cuenta: mientras la mantengas. Si no entras en {LEGAL.inactiveAccountMonths} meses, la borramos tras avisarte por correo{" "}
            <Val>[confirmar plazo y poner en marcha el borrado]</Val>.
          </li>
          <li>Necesidades de accesibilidad: hasta que retires el permiso o borres la cuenta.</li>
          <li>Después, solo lo que exija la ley, bloqueado, durante los plazos de prescripción.</li>
        </ul>
      </Section>

      <Section id="derechos" title="Tus derechos">
        <p>
          Puedes pedir acceso a tus datos, rectificarlos, suprimirlos, oponerte o limitar su tratamiento, llevártelos (portabilidad) y
          retirar tu consentimiento en cualquier momento. Desde <Link href="/cuenta">Tu cuenta</Link> puedes cambiar o borrar tus
          preferencias y respuestas de accesibilidad. Para lo demás, incluido borrar la cuenta entera, escribe a{" "}
          <Val>{o.privacyEmail}</Val>; te responderemos en un mes como máximo.
        </p>
        <p>
          Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la{" "}
          <a href={LEGAL.authority.url} target="_blank" rel="noopener noreferrer">
            {LEGAL.authority.name}
          </a>
          .
        </p>
      </Section>

      <Section id="menores" title="Menores">
        <p>
          La app se puede usar sin cuenta a cualquier edad. Para crear una cuenta hay que tener al menos 14 años (art. 7 LOPDGDD); por
          debajo, la crean los padres o tutores.
        </p>
      </Section>

      <Section id="seguridad" title="Seguridad">
        <p>
          La conexión va cifrada (HTTPS). En la base de datos, cada persona solo puede leer sus propios datos, y las claves de los
          servicios externos nunca llegan al navegador.
        </p>
      </Section>

      <Section id="cambios" title="Cambios">
        <p>Si cambiamos cómo tratamos los datos, actualizaremos esta página y su fecha; si el cambio es importante, te lo diremos antes de aplicarlo.</p>
      </Section>
    </LegalPage>
  );
}
