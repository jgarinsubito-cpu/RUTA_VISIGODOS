import type { Metadata } from "next";
import { FundingMark } from "@/components/legal/SiteFooter";
import { LegalPage, Section, Val } from "@/components/legal/LegalPage";
import { currentCatalog } from "@/data/content";
import { FUNDING, PROJECT_CREDITS } from "@/data/legal";
import { loadPublishedCatalog } from "@/data/published";
import { collectCredits } from "@/domain/credits";

export const metadata: Metadata = {
  title: "Créditos",
  description: "Quién hace Ruta Visigoda de Toledo: equipo, validación científica, fuentes, fotografías, locuciones y reconstrucciones.",
};

const SOFTWARE: { name: string; license: string; url: string }[] = [
  { name: "Next.js y React", license: "MIT", url: "https://nextjs.org" },
  { name: "Leaflet", license: "BSD-2-Clause", url: "https://leafletjs.com" },
  { name: "model-viewer (Google)", license: "Apache 2.0", url: "https://modelviewer.dev" },
  { name: "three.js", license: "MIT", url: "https://threejs.org" },
  { name: "Supabase", license: "Apache 2.0", url: "https://supabase.com" },
];

function Count({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <span className="text-ink-muted">
      {n} {n === 1 ? one : many}
    </span>
  );
}

/** Generated from the published catalog: a new photo, recording or source is credited when it is published. */
export default async function CreditosPage() {
  await loadPublishedCatalog();
  const credits = collectCredits(currentCatalog());

  return (
    <LegalPage
      href="/creditos"
      eyebrow="Créditos"
      title="Quién hace esta ruta"
      draft={false}
      intro={<p>Investigación, validación, imagen, voz y código: las personas, instituciones y fuentes detrás de cada parada.</p>}
    >
      {PROJECT_CREDITS.map((group) => (
        <Section key={group.heading} title={group.heading}>
          <ul className="list-none! pl-0!">
            {group.entries.map((e) => (
              <li key={e.name} className="pl-0!">
                <strong>
                  <Val>{e.name}</Val>
                </strong>
                <span className="block text-sm">
                  <Val>{e.role}</Val>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Section id="financiacion" title="Financiación">
        <FundingMark />
        <p className="text-sm">{FUNDING.project}</p>
      </Section>

      <Section id="fuentes" title="Fuentes">
        <p>
          Cada dato histórico de la app cita su fuente y su nivel de evidencia. Estas son las fuentes de las afirmaciones publicadas (
          <Count n={credits.sources.length} one="fuente" many="fuentes" />
          ):
        </p>
        {credits.sources.length > 0 ? (
          <ul>
            {credits.sources.map((s) => (
              <li key={s.title}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}{" "}
                <span className="text-sm">· {s.claims === 1 ? "1 afirmación" : `${s.claims} afirmaciones`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Todavía no hay afirmaciones publicadas.</p>
        )}
      </Section>

      <Section id="imagenes" title="Fotografías e ilustraciones">
        {credits.images.length > 0 ? (
          <ul className="list-none! pl-0!">
            {credits.images.map((g) => (
              <li key={`${g.author}|${g.license}`} className="pl-0!">
                <details className="group rounded-xl border border-stone bg-surface">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                    <span>
                      <strong>{g.author}</strong> · {g.license}
                    </span>
                    <Count n={g.items.length} one="imagen" many="imágenes" />
                  </summary>
                  <ul className="border-t border-stone px-4 py-3 text-sm">
                    {g.items.map((it) => (
                      <li key={it.sourceUrl + it.where}>
                        {it.where}:{" "}
                        <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {it.alt}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin imágenes publicadas.</p>
        )}
        {credits.maps.map((m) => (
          <p key={m.where}>
            Mapa ilustrado de «{m.where}»: {m.credit}
          </p>
        ))}
      </Section>

      {credits.audio.length > 0 && (
        <Section id="locuciones" title="Locuciones">
          {(() => {
            const lines = [...new Set(credits.audio.flatMap((a) => (a.credit ? [a.credit] : [])))];
            return (
              <>
                <p>
                  <Count n={credits.audio.length} one="locución" many="locuciones" /> en los recorridos guiados.
                </p>
                {lines.length > 0 && (
                  <ul>
                    {lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
                {credits.missingAudioCredits > 0 && (
                  <p>
                    <Val>{`[Crédito de voz, guion y producción pendiente en ${credits.missingAudioCredits} locuciones]`}</Val>
                  </p>
                )}
              </>
            );
          })()}
        </Section>
      )}

      {credits.models.length > 0 && (
        <Section id="modelos" title="Reconstrucciones 3D">
          <p>
            Las reconstrucciones distinguen lo excavado de lo propuesto con un sello en cada modelo. Están basadas en las fuentes
            indicadas y las revisa el director del yacimiento.
          </p>
          <ul>
            {credits.models.map((m) => (
              <li key={m.where + m.name}>
                <strong>{m.name}</strong> ({m.where}){m.source ? `. Basada en: ${m.source}` : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="mapas" title="Cartografía">
        <p>
          Mapa base ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            colaboradores de OpenStreetMap
          </a>
          , con licencia ODbL.
        </p>
      </Section>

      <Section id="software" title="Software">
        <p>La app está hecha con software libre:</p>
        <ul>
          {SOFTWARE.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>{" "}
              · {s.license}
            </li>
          ))}
        </ul>
      </Section>
    </LegalPage>
  );
}
