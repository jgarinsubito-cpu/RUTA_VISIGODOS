"use client";
/**
 * Probar el asistente: ask the deterministic assistant a question against the published version or
 * against every working copy (drafts and reviews), to check aliases, keywords, claims and prompts
 * before sending them to review. Runs in the browser; nothing is published or stored.
 */
import { useId, useMemo, useState, type FormEvent } from "react";
import { demoCatalog, withCatalog } from "@/data/content";
import { answerLocally, prepare } from "@/domain/assistant/local";
import type { AssistantAnswer, AssistantRequest, Catalog, VisitorProfile } from "@/domain/types";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { PROFILE_LABEL, paragraphs, plainText } from "@/components/chat/format";
import { useAdmin } from "@/state/admin";
import { previewCatalog } from "./model";
import { Section, SelectField, btnPrimary, btnSecondary, inputClass } from "./ui";

const INTENT_LABEL: Record<AssistantAnswer["intent"], string> = {
  heritage: "Pregunta histórica",
  travel: "Pregunta práctica",
  mixed: "Histórica y práctica",
  unknown: "Sin clasificar",
};

interface Run {
  question: string;
  answer: AssistantAnswer;
  mentioned: string[];
}

function ask(catalog: Catalog, question: string, profile: VisitorProfile): Run {
  const req: AssistantRequest = {
    message: question,
    history: [],
    context: { area: catalog.showcase.regionName, date: null, startTime: "10:00", endTime: "18:00", profile, transport: "walk", stepFreeRequired: false },
    selectedSiteId: null,
    tripSiteIds: [],
  };
  return withCatalog(catalog, () => ({
    question,
    answer: answerLocally(req),
    mentioned: prepare(req).sites.mentioned.map((s) => s.name),
  }));
}

export function AssistantPreview() {
  const records = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const [source, setSource] = useState<"drafts" | "live">("drafts");
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<VisitorProfile>("general");
  const [run, setRun] = useState<Run | null>(null);
  const inputId = useId();
  const sourceName = useId();

  const catalog = useMemo(
    () => (source === "drafts" && records.length > 0 ? previewCatalog(records, live?.catalog ?? null) : (live?.catalog ?? demoCatalog())),
    [source, records, live],
  );
  const nameOf = (id: string) => catalog.sites.find((s) => s.id === id)?.name;
  const routeName = (id: string) => catalog.routes.find((r) => r.id === id)?.name ?? id;

  function submit(text: string) {
    const q = text.trim();
    if (!q) return;
    setQuestion(q);
    setRun(ask(catalog, q, profile));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(question);
  }

  const answer = run?.answer;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink md:text-4xl">Probar el asistente</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Pregunta como lo haría un visitante y comprueba qué lugares reconoce, qué fichas cita y qué preguntas sugiere. Es el asistente sin
          modelo de lenguaje; con modelo, la redacción cambia pero usa las mismas fichas y reglas. Nada de lo que preguntes se guarda.
        </p>
      </header>

      <Section title="Pregunta">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Contenido</legend>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-5">
            {(
              [
                ["drafts", "Con borradores y revisiones"],
                ["live", "Solo lo publicado"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                <input
                  type="radio"
                  name={sourceName}
                  checked={source === value}
                  onChange={() => {
                    setSource(value);
                    setRun(null);
                  }}
                  className="h-5 w-5 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor={inputId} className="text-sm font-semibold text-ink">
            Pregunta del visitante
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id={inputId} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000} className={inputClass} placeholder="¿Qué es el Tesoro de Guarrazar?" />
            <button type="submit" disabled={!question.trim()} className={btnPrimary}>
              Preguntar
            </button>
          </div>
          <div className="max-w-xs">
            <SelectField<VisitorProfile>
              label="Cómo explica"
              value={profile}
              options={(Object.keys(PROFILE_LABEL) as VisitorProfile[]).map((p) => ({ value: p, label: PROFILE_LABEL[p] }))}
              onChange={setProfile}
            />
          </div>
        </form>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">Preguntas de inicio</p>
          <ul className="flex flex-wrap gap-2">
            {catalog.showcase.starterPrompts.map((p) => (
              <li key={p}>
                <button type="button" onClick={() => submit(p)} className={btnSecondary}>
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {run && answer && (
        <Section title="Respuesta">
          <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="font-semibold text-ink">Pregunta</dt>
            <dd className="text-ink">{run.question}</dd>
            <dt className="font-semibold text-ink">Tipo</dt>
            <dd className="text-ink">
              {INTENT_LABEL[answer.intent]}
              {answer.abstained ? " · sin respuesta en las fichas" : ""}
            </dd>
            <dt className="font-semibold text-ink">Lugares reconocidos</dt>
            <dd className="text-ink">{run.mentioned.length > 0 ? run.mentioned.join(", ") : "Ninguno por su nombre"}</dd>
          </dl>
          <div aria-live="polite" className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4 text-body text-ink">
            {paragraphs(answer.text).map((p, i) => (
              <p key={i}>{plainText(p, nameOf)}</p>
            ))}
          </div>
          {answer.citations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-ink">Fichas citadas</h3>
              <ul className="flex flex-col gap-2">
                {answer.citations.map((c) => (
                  <li key={c.claimId} className="flex flex-col gap-1 rounded-xl border border-stone p-3 text-sm">
                    <EvidenceBadge level={c.evidence} attribution={c.evidence === "I" ? c.attribution : undefined} />
                    <span className="text-ink">{catalog.claims.find((cl) => cl.id === c.claimId)?.text ?? c.claimId}</span>
                    <span className="text-xs text-ink-muted">
                      Fuente: {c.sourceTitle}
                      {c.page ? ` · p. ${c.page}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {answer.suggestedAction && (
            <p className="text-sm text-ink">
              <span className="font-semibold">Botón que ofrece: </span>
              {answer.suggestedAction.type === "use-route"
                ? `Usar la ruta «${routeName(answer.suggestedAction.routeId)}»`
                : `Añadir ${nameOf(answer.suggestedAction.siteId) ?? answer.suggestedAction.siteId} a mi viaje`}
            </p>
          )}
          {answer.suggestedPrompts.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-ink">Preguntas que sugiere</h3>
              <ul className="flex flex-wrap gap-2">
                {answer.suggestedPrompts.map((p) => (
                  <li key={p}>
                    <button type="button" onClick={() => submit(p)} className={btnSecondary}>
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
