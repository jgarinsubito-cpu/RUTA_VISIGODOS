import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/data/content";
import { assistantRecipient, isPending, LEGAL, pendingLegalFields, RECIPIENTS } from "@/data/legal";
import { collectCredits } from "./credits";
import type { Catalog, PlaceImage, Stop } from "./types";

const DEMO = demoCatalog();
const GUARRAZAR = DEMO.sites.find((s) => s.id === "site-guarrazar")!;

const img = (src: string, author: string, license = "CC BY 4.0"): PlaceImage => ({
  src,
  width: 800,
  height: 600,
  alt: `Foto ${src}`,
  author,
  license,
  sourceUrl: `https://example.org${src}`,
});

function withStops(stops: Stop[], extra: Partial<Catalog> = {}): Catalog {
  return { ...DEMO, stops, ...extra };
}

describe("collectCredits", () => {
  it("credits every image once, grouped by author and licence", () => {
    const shared = img("/a.jpg", "Ana");
    const catalog = withStops([
      { id: "s1", siteId: GUARRAZAR.id, order: 1, name: "Basílica", gallery: [shared, img("/b.jpg", "Ana")], storyIds: [] },
      { id: "s2", siteId: GUARRAZAR.id, order: 2, name: "Hospital", gallery: [shared, img("/c.jpg", "Beto", "CC0")], storyIds: [] },
    ]);
    const credits = collectCredits(catalog);
    const ana = credits.images.find((g) => g.author === "Ana" && g.license === "CC BY 4.0")!;
    expect(ana.items.map((i) => i.sourceUrl)).toEqual(["https://example.org/a.jpg", "https://example.org/b.jpg"]);
    expect(ana.items[0].where).toBe(`${GUARRAZAR.name} · Basílica`);
    expect(credits.images.some((g) => g.author === "Beto" && g.license === "CC0")).toBe(true);
    const total = credits.images.reduce((n, g) => n + g.items.length, 0);
    const unique = new Set([...DEMO.sites.flatMap((s) => (s.image ? [s.image.src] : [])), "/a.jpg", "/b.jpg", "/c.jpg"]);
    expect(total).toBe(unique.size);
  });

  it("lists narrations, flags the ones without a credit, and lists models and maps", () => {
    const catalog = withStops([
      {
        id: "s1",
        siteId: GUARRAZAR.id,
        order: 1,
        name: "Basílica",
        gallery: [],
        storyIds: [],
        audio: { src: "/1.mp3", durationSeconds: 60, label: "Locución", transcript: "Texto", credit: "Voz: Marta" },
        models: [{ src: "/b.glb", name: "Basílica", certainty: "hypothesis", description: "Propuesta", source: "Panel del yacimiento" }],
        videos360: [{ src: "/media/360/b-4k.mp4", name: "La basílica en 360°", description: "Vista", durationSeconds: 60, credit: "Grabación: Equipo" }],
      },
      {
        id: "s2",
        siteId: GUARRAZAR.id,
        order: 2,
        name: "Hospital",
        gallery: [],
        storyIds: [],
        audio: { src: "/2.mp3", durationSeconds: 60, label: "Locución", transcript: "Texto" },
        models: [{ src: "/b.glb", name: "Basílica", certainty: "hypothesis", description: "Propuesta" }],
      },
    ]);
    const credits = collectCredits(catalog);
    expect(credits.audio).toEqual([
      { where: `${GUARRAZAR.name} · Basílica`, credit: "Voz: Marta" },
      { where: `${GUARRAZAR.name} · Hospital`, credit: undefined },
    ]);
    expect(credits.missingAudioCredits).toBe(1);
    expect(credits.videos360).toEqual([{ where: `${GUARRAZAR.name} · Basílica`, name: "La basílica en 360°", credit: "Grabación: Equipo" }]);
    expect(credits.models).toEqual([
      { where: `${GUARRAZAR.name} · Basílica; ${GUARRAZAR.name} · Hospital`, name: "Basílica", source: "Panel del yacimiento" },
    ]);
  });

  it("lists each source of a published claim once, with its count, and ignores drafts", () => {
    const base = DEMO.claims[0];
    const catalog = withStops([], {
      claims: [
        { ...base, id: "c1", source: { title: "Balmaseda 1996" }, status: "published" },
        { ...base, id: "c2", source: { title: "Balmaseda 1996 ", url: "https://example.org/b" }, status: "published" },
        { ...base, id: "c3", source: { title: "Acta inédita" }, status: "draft" },
        { ...base, id: "c4", source: { title: "Arbeiter 2000" }, status: "published" },
      ],
    });
    expect(collectCredits(catalog).sources).toEqual([
      { title: "Arbeiter 2000", url: undefined, claims: 1 },
      { title: "Balmaseda 1996", url: "https://example.org/b", claims: 2 },
    ]);
  });
});

describe("legal data", () => {
  it("marks unknown values as pending, and blocks v1.0 until they are filled and reviewed", () => {
    expect(isPending("[NIF]")).toBe(true);
    expect(isPending("Supabase")).toBe(false);
    const pending = pendingLegalFields();
    expect(pending).toContain("owner.nif");
    expect(pending.includes("reviewedByLawyer")).toBe(!LEGAL.reviewedByLawyer);
  });

  it("names the assistant provider the server actually uses", () => {
    expect(assistantRecipient({ ANTHROPIC_API_KEY: "k", DEEPSEEK_API_KEY: "k" })).toBe(RECIPIENTS.anthropic);
    expect(assistantRecipient({ DEEPSEEK_API_KEY: "k" })).toBe(RECIPIENTS.deepseek);
    expect(assistantRecipient({})).toBeNull();
  });
});
