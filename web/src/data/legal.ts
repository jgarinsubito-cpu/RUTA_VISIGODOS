/**
 * Facts the legal pages (aviso legal, privacidad, cookies, accesibilidad, créditos) are built from.
 * One place, so the texts never disagree with each other.
 *
 * Values in square brackets are still unknown: the pages show them highlighted as "pendiente" and
 * the app must not be published as v1.0 while any is left (see `pendingLegalFields`). Do not
 * invent them. The texts are a draft until a lawyer has reviewed them (`reviewedByLawyer`).
 */

export interface LegalOwner {
  /** Company name (razón social). */
  name: string;
  nif: string;
  address: string;
  /** Registro Mercantil entry: tomo, folio, hoja, inscripción. */
  registry: string;
  email: string;
  /** Address for data protection requests (may be the same as `email`). */
  privacyEmail: string;
  /** Data protection officer, if appointed (not mandatory for this processing). */
  dpo?: string;
}

/** A service that receives visitor data, as the privacy page explains it. */
export interface DataRecipient {
  id: string;
  name: string;
  /** What it does for the app. */
  role: string;
  /** What it receives. */
  data: string;
  /** Where it processes the data, and the safeguard if it is outside the EEA. */
  location: string;
  /** "encargado": processes on our behalf; "responsable": its own controller (the visitor deals with it directly). */
  kind: "encargado" | "responsable";
  policyUrl?: string;
}

export const LEGAL = {
  /** Date of the texts, shown on every page (update it whenever a text changes). */
  updated: "2026-11-05",
  /** false while the texts are a draft. The pages say so at the top. */
  reviewedByLawyer: false,
  product: "Ruta Visigoda de Toledo",
  domain: "[dominio de la app, p. ej. rutavisigoda.es]",
  /**
   * The company that runs the app and decides on the visitor data. The project documents name
   * Súbito Red Desarrollos (operates the platform) and SNEO Mestizaje Projects (grant applicant,
   * receives rights assignments): which one is the titular is a decision still to take.
   */
  owner: {
    name: "[Razón social del titular]",
    nif: "[NIF]",
    address: "[Domicilio social]",
    registry: "[Datos de inscripción en el Registro Mercantil]",
    email: "[correo de contacto]",
    privacyEmail: "[correo para protección de datos]",
  } satisfies LegalOwner as LegalOwner,
  /** Months an account with no sign-in is kept before it is deleted. */
  inactiveAccountMonths: 24,
  /** Who reads the accessibility feedback, and how soon it is answered. */
  accessibilityReplyDays: 20,
  /** Supervisory authority. */
  authority: { name: "Agencia Española de Protección de Datos (AEPD)", url: "https://www.aepd.es" },
} as const;

/** Every service that can receive visitor data. Which assistant provider applies is decided at run time. */
export const RECIPIENTS: Record<string, DataRecipient> = {
  hosting: {
    id: "hosting",
    name: "[Proveedor de alojamiento de la app]",
    role: "Sirve la app y ejecuta el asistente.",
    data: "Dirección IP y datos técnicos de cada petición, y el texto de las preguntas al asistente mientras se responden.",
    location: "[Ubicación de los servidores y garantía si está fuera del Espacio Económico Europeo]",
    kind: "encargado",
  },
  supabase: {
    id: "supabase",
    name: "Supabase",
    role: "Base de datos de las cuentas y de los contenidos publicados.",
    data: "Solo si creas una cuenta: correo, nombre, país si lo indicas, preferencias de visita y, con tu permiso expreso, necesidades de accesibilidad.",
    location: "[Región del proyecto de Supabase, p. ej. UE (Fráncfort)]",
    kind: "encargado",
    policyUrl: "https://supabase.com/privacy",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (modelo Claude)",
    role: "Redacta las respuestas del asistente a partir de las fuentes validadas.",
    data: "Tu pregunta, los últimos mensajes de la conversación, el contexto del viaje (zona, fecha, horario, transporte) y tus preferencias, incluidas las necesidades de accesibilidad que hayas indicado. No recibe tu nombre, tu correo ni tu IP.",
    location: "Estados Unidos, con cláusulas contractuales tipo de la Comisión Europea [confirmar en el contrato con el proveedor].",
    kind: "encargado",
    policyUrl: "https://www.anthropic.com/legal/privacy",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    role: "Redacta las respuestas del asistente a partir de las fuentes validadas.",
    data: "Tu pregunta, los últimos mensajes de la conversación, el contexto del viaje y tus preferencias, incluidas las necesidades de accesibilidad que hayas indicado. No recibe tu nombre, tu correo ni tu IP.",
    location: "República Popular China, país sin decisión de adecuación de la Comisión Europea [requiere garantías del art. 46 RGPD; no recomendado en producción].",
    kind: "encargado",
    policyUrl: "https://platform.deepseek.com/downloads/DeepSeek%20Privacy%20Policy.html",
  },
  google: {
    id: "google",
    name: "Google",
    role: "Inicio de sesión con Google (si lo eliges) y el enlace «Cómo llegar», que abre Google Maps.",
    data: "tu nombre y tu correo cuando entras con Google, y el destino y tus datos de navegación cuando abres «Cómo llegar».",
    location: "Según la política de Google.",
    kind: "responsable",
    policyUrl: "https://policies.google.com/privacy",
  },
  tiles: {
    id: "tiles",
    name: "[Proveedor de mapas base] (hoy, servidores de teselas de OpenStreetMap)",
    role: "Dibuja el mapa de fondo.",
    data: "Tu dirección IP y la zona del mapa que miras, al cargar cada tesela. No recibe tu ubicación.",
    location: "[Ubicación del proveedor de mapas elegido para producción]",
    kind: "responsable",
    policyUrl: "https://osmfoundation.org/wiki/Privacy_Policy",
  },
};

/** Which model provider answers, as the assistant chooses it (domain/assistant/index.ts): Claude first, then DeepSeek. Server only. */
export function assistantRecipient(env: Record<string, string | undefined> = process.env): DataRecipient | null {
  if (env.ANTHROPIC_API_KEY) return RECIPIENTS.anthropic;
  if (env.DEEPSEEK_API_KEY) return RECIPIENTS.deepseek;
  return null;
}

/** A value still to be filled in (written as "[…]"). */
export function isPending(value: string): boolean {
  return /\[[^\]]+\]/.test(value);
}

/** Every pending value, by where it is: the checklist before publishing v1.0. */
export function pendingLegalFields(): string[] {
  const out: string[] = [];
  if (isPending(LEGAL.domain)) out.push("domain");
  for (const [k, v] of Object.entries(LEGAL.owner)) if (typeof v === "string" && isPending(v)) out.push(`owner.${k}`);
  for (const r of Object.values(RECIPIENTS)) {
    for (const [k, v] of Object.entries(r)) if (typeof v === "string" && isPending(v)) out.push(`${r.id}.${k}`);
  }
  if (!LEGAL.reviewedByLawyer) out.push("reviewedByLawyer");
  return out;
}

/** "5 de noviembre de 2026" */
export function legalDate(iso: string = LEGAL.updated): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * People and organisations credited on /creditos besides what the catalog credits item by item.
 * Roles marked "[confirmar]" must be confirmed by each person before publishing.
 */
export const PROJECT_CREDITS: { heading: string; entries: { name: string; role: string }[] }[] = [
  {
    heading: "Un proyecto de",
    entries: [
      { name: "Súbito Red Desarrollos", role: "Desarrollo y operación de la plataforma Destino Plus" },
      { name: "SNEO Mestizaje Projects", role: "Socio estratégico del proyecto «Del tesoro al territorio»" },
    ],
  },
  {
    heading: "Validación científica",
    entries: [
      { name: "Asociación Urbs Regia", role: "Validación de los contenidos" },
      { name: "Juan Manuel Rojas Rodríguez-Malo", role: "Director del yacimiento de Guarrazar; validación de los contenidos y de las reconstrucciones 3D" },
    ],
  },
  {
    heading: "Colaboran",
    entries: [
      { name: "Amador Cuartero", role: "Reconstrucciones 3D de la basílica de Guarrazar" },
      { name: "Federico García Alva", role: "Fotografía [confirmar]" },
      { name: "Pilar Tormo", role: "[confirmar función]" },
      { name: "Inma [apellidos]", role: "[confirmar función]" },
      { name: "arqueotravel", role: "[confirmar función]" },
    ],
  },
  {
    heading: "Desarrollo de la app",
    entries: [{ name: "Luis Fleitas", role: "Arquitectura y desarrollo de la aplicación [confirmar]" }],
  },
];

/** Grant publicity. The exact wording and logos come from the grant resolution: do not change them freely. */
export const FUNDING = {
  text: "Proyecto «Del tesoro al territorio: plataforma inteligente de interpretación del legado visigodo en Toledo», [beneficiario], con el apoyo del Ministerio de Cultura (Ayudas para el fomento de la innovación en las industrias culturales y creativas, convocatoria 2026).",
  /** The resolution's own required sentence and logo, once checked. */
  note: "[Texto y logotipo exactos que exige la resolución de concesión]",
};
