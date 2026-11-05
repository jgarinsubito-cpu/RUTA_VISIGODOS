/**
 * Evalúa el asistente con el banco de preguntas (contenidos/evaluacion/preguntas.json), como pide
 * el documento de definición de Destino Plus (§7): preguntas normales, en debate, engañosas, sin
 * respuesta, prácticas y de seguridad.
 *
 * Uso (desde web/):
 *   npx tsx scripts/evaluar-asistente.ts --catalogo <catalogo.json> [--preguntas <preguntas.json>]
 *     [--salida <carpeta>] [--modelo]
 *
 * Sin --modelo usa el asistente local (determinista, sin red). Con --modelo usa el mismo camino que
 * la app (Claude con ANTHROPIC_API_KEY o DeepSeek con DEEPSEEK_API_KEY), que da respuestas más
 * naturales pero variables: conviene repetirlo antes de cada publicación.
 *
 * Criterios por pregunta:
 *   espera     responde (cita al menos una afirmación) / se abstiene (no afirma nada con cita) / cualquiera
 *   citas      si responde, cita al menos una de las afirmaciones esperadas
 *   matiz      se apoya en una interpretación, hipótesis o tradición (I/H/T), no solo en datos
 *   prohibido  la respuesta no contiene esos textos (errores conocidos, horarios dados como ciertos…)
 * Y en todas: cada cita existe, está publicada y su nivel coincide con el de la afirmación.
 */
import fs from "node:fs";
import path from "node:path";
import { setCatalog, getPublishedClaim } from "@/data/content";
import { answerLocally, answerQuestion } from "@/domain/assistant";
import { parseCatalog } from "@/domain/editorial/schema";
import type { AssistantAnswer, AssistantRequest, Catalog, TripContext } from "@/domain/types";

interface Pregunta {
  id: string;
  tipo: string;
  pregunta: string;
  espera: "responde" | "abstiene" | "cualquiera";
  citas: string[];
  prohibido: string[];
  matiz: boolean;
  lugar: string | null;
  nota?: string;
}

interface Resultado {
  id: string;
  tipo: string;
  pregunta: string;
  ok: boolean;
  fallos: string[];
  intent: AssistantAnswer["intent"];
  abstiene: boolean;
  citas: string[];
  niveles: string[];
  respuesta: string;
}

const args = process.argv.slice(2);
const option = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const webDir = path.resolve(__dirname, "..");
const catalogPath = option("catalogo");
if (!catalogPath) {
  console.error("Falta --catalogo <catalogo.json> (la salida del importador).");
  process.exit(1);
}
const preguntasPath = path.resolve(option("preguntas", path.join(webDir, "../contenidos/evaluacion/preguntas.json"))!);
const salida = path.resolve(option("salida", path.join(webDir, "../contenidos/evaluacion/resultados"))!);
const conModelo = args.includes("--modelo");

const parsed = parseCatalog(JSON.parse(fs.readFileSync(catalogPath, "utf8")));
if (!parsed.ok) {
  console.error("El catálogo no es válido:", parsed.errors.slice(0, 5));
  process.exit(1);
}
const catalog: Catalog = parsed.value;
setCatalog(catalog, 1);
const preguntas = JSON.parse(fs.readFileSync(preguntasPath, "utf8")) as Pregunta[];

const context: TripContext = {
  area: catalog.showcase.regionName,
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "car",
  stepFreeRequired: false,
};

/** Sin tildes, minúsculas y espacios simples, para comparar textos. */
const fold = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

async function ask(p: Pregunta): Promise<AssistantAnswer> {
  const req: AssistantRequest = { message: p.pregunta, history: [], context, selectedSiteId: p.lugar, tripSiteIds: [], mode: "strict" };
  return conModelo ? answerQuestion(req) : answerLocally(req);
}

function check(p: Pregunta, a: AssistantAnswer): string[] {
  const fallos: string[] = [];
  const cited = a.citations.map((c) => c.claimId);
  const answered = !a.abstained && cited.length > 0;
  const text = fold(a.text);

  if (p.espera === "responde" && !answered) fallos.push(a.abstained ? "Se abstiene y debía responder." : "Responde sin citar ninguna afirmación.");
  // Abstenerse bien es decir que no consta; ofrecer después lo que sí consta está permitido
  // (documento de definición, §2: «decir qué no se sabe y ofrecer material documentado relacionado»).
  const saysNotInSources = a.abstained || /no consta|no todo lo que preguntas consta/.test(text);
  if (p.espera === "abstiene" && !saysNotInSources) {
    fallos.push("Responde como si lo supiera; debía decir que no consta en las fuentes.");
  }
  if (p.espera !== "abstiene" && p.citas.length > 0 && answered && !p.citas.some((id) => cited.includes(id))) {
    fallos.push(`No cita ninguna de las afirmaciones esperadas (${p.citas.join(", ")}).`);
  }
  // Matiz: una interpretación, hipótesis o tradición, o un dato que recoge lecturas enfrentadas
  // («la cartela dice X; otras publicaciones, Y»).
  const readings = (id: string) => /otras publicaciones|otros autores|otra interpretacion|otra hipotesis|debate/.test(fold(getPublishedClaim(id)?.text ?? ""));
  if (p.matiz && answered && !a.citations.some((c) => c.evidence !== "D" || readings(c.claimId))) {
    fallos.push("Presenta un tema en debate solo con datos (D): falta la interpretación o la hipótesis.");
  }
  for (const phrase of p.prohibido) {
    if (text.includes(fold(phrase))) fallos.push(`Contiene un texto prohibido: «${phrase}».`);
  }
  // Integridad de las citas: existen, están publicadas y con su nivel.
  for (const c of a.citations) {
    const claim = getPublishedClaim(c.claimId);
    if (!claim) fallos.push(`Cita una afirmación que no está publicada (${c.claimId}).`);
    else if (claim.evidence !== c.evidence) fallos.push(`Cita ${c.claimId} con nivel ${c.evidence}; es ${claim.evidence}.`);
  }
  if (a.generalKnowledge) fallos.push("Usa conocimiento general en modo estricto.");
  return fallos;
}

async function main() {
  const resultados: Resultado[] = [];
  for (const p of preguntas) {
    let a: AssistantAnswer;
    try {
      a = await ask(p);
    } catch (e) {
      resultados.push({ id: p.id, tipo: p.tipo, pregunta: p.pregunta, ok: false, fallos: [`Error: ${(e as Error).message}`], intent: "unknown", abstiene: false, citas: [], niveles: [], respuesta: "" });
      continue;
    }
    const fallos = check(p, a);
    resultados.push({
      id: p.id,
      tipo: p.tipo,
      pregunta: p.pregunta,
      ok: fallos.length === 0,
      fallos,
      intent: a.intent,
      abstiene: a.abstained,
      citas: a.citations.map((c) => c.claimId),
      niveles: a.citations.map((c) => c.evidence),
      respuesta: a.text,
    });
  }

  const tipos = [...new Set(resultados.map((r) => r.tipo))];
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : "—");
  const ok = resultados.filter((r) => r.ok).length;
  const fecha = new Date().toISOString().slice(0, 16).replace("T", " ");
  const lineas = [
    `# Evaluación del asistente`,
    ``,
    `${fecha} UTC · ${conModelo ? "asistente con modelo" : "asistente local (sin modelo)"} · catálogo \`${path.basename(catalogPath!)}\` · ${preguntas.length} preguntas.`,
    ``,
    `**Superadas: ${ok} de ${resultados.length} (${pct(ok, resultados.length)}).**`,
    ``,
    `| Tipo | Preguntas | Superadas | % |`,
    `| --- | --- | --- | --- |`,
    ...tipos.map((t) => {
      const r = resultados.filter((x) => x.tipo === t);
      const k = r.filter((x) => x.ok).length;
      return `| ${t} | ${r.length} | ${k} | ${pct(k, r.length)} |`;
    }),
    ``,
    `## Fallos`,
    ``,
    ...resultados
      .filter((r) => !r.ok)
      .flatMap((r) => [
        `### ${r.id} · ${r.tipo} · ${r.pregunta}`,
        ``,
        ...r.fallos.map((f) => `- ${f}`),
        `- Citas: ${r.citas.length ? r.citas.map((c, i) => `${c} (${r.niveles[i]})`).join(", ") : "ninguna"}${r.abstiene ? " · se abstiene" : ""}`,
        ``,
        `> ${r.respuesta.replace(/\n+/g, " ").slice(0, 400)}${r.respuesta.length > 400 ? "…" : ""}`,
        ``,
      ]),
  ];
  fs.mkdirSync(salida, { recursive: true });
  const base = conModelo ? "evaluacion-modelo" : "evaluacion-local";
  fs.writeFileSync(path.join(salida, `${base}.md`), lineas.join("\n"));
  fs.writeFileSync(path.join(salida, `${base}.json`), JSON.stringify(resultados, null, 2));
  console.log(`Superadas ${ok} de ${resultados.length} (${pct(ok, resultados.length)}). Informe: ${path.join(salida, `${base}.md`)}`);
  for (const t of tipos) {
    const r = resultados.filter((x) => x.tipo === t);
    console.log(`  ${t}: ${r.filter((x) => x.ok).length}/${r.length}`);
  }
}

void main();
