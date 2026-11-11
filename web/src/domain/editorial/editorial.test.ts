import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/data/content";
import type { Catalog } from "@/domain/types";
import { parseCatalog, parseRecordData } from "./schema";
import { hasErrors, validateCatalog, type CatalogIssue } from "./validate";
import {
  buildCatalog,
  newRecordId,
  recordKey,
  recordsFromCatalog,
  slugify,
  statusesAfterPublish,
  statusesAfterRestore,
  type AnyRecord,
  type RecordStatus,
} from "./records";

const DEMO = demoCatalog();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorsFor(catalog: Catalog, id?: string): string[] {
  return validateCatalog(catalog)
    .filter((i: CatalogIssue) => i.severity === "error" && (id === undefined || i.id === id))
    .map((i) => i.message);
}

/** The demo catalog as stored records, all with the given status. */
function demoRecords(status: RecordStatus = "published"): AnyRecord[] {
  return recordsFromCatalog(DEMO).map(
    (r) =>
      ({ ...r, status, retire: false, rev: 1, reviewNote: null, firstPublishedAt: null, updatedAt: "2026-10-15T10:00:00Z" }) as AnyRecord,
  );
}

function edit(records: AnyRecord[], kind: AnyRecord["kind"], id: string, patch: Partial<AnyRecord>): AnyRecord[] {
  return records.map((r) => (r.kind === kind && r.id === id ? ({ ...r, ...patch } as AnyRecord) : r));
}

describe("validateCatalog", () => {
  it("accepts the demo catalog", () => {
    expect(errorsFor(DEMO)).toEqual([]);
  });

  it("asks every 360° video for a description, and warns without a credit or a phone version", () => {
    const c = clone(DEMO);
    const video = { src: "/media/360/patio-4k.mp4", name: "El patio", description: "Patio.", durationSeconds: 90 };
    c.stops = [{ id: "stop-prueba", siteId: c.sites[0].id, order: 1, name: "Patio", indoor: true, gallery: [], storyIds: [], videos360: [video] }];
    expect(errorsFor(c, "stop-prueba").join()).toContain("descripción");
    const issues = validateCatalog(c).filter((i) => i.id === "stop-prueba" && i.severity === "warning").map((i) => i.message).join();
    expect(issues).toContain("crédito");
    expect(issues).toContain("móvil");
    c.stops[0].videos360 = [{ ...video, description: "El patio de armas visto desde el centro, con la torre del homenaje al fondo." }];
    expect(errorsFor(c, "stop-prueba")).toEqual([]);
    expect(parseCatalog({ ...c, stops: [{ ...c.stops[0], videos360: [{ ...video, src: "ftp://x/v.mp4" }] }] }).ok).toBe(false);
  });

  it("checks museum pieces: real places and claims, and photos only with permission", () => {
    const c = clone(DEMO);
    const piece = {
      id: "piece-prueba",
      slug: "pieza-prueba",
      name: "Trientes de prueba",
      museum: { name: "Museo de prueba", siteId: c.sites[0].id },
      originSiteId: c.sites[1].id,
      provenance: "Vega Baja (Toledo)",
      material: "Oro",
      date: "Siglo VII",
      description: "Monedas de oro.",
      images: [{ src: "/media/piezas/x.jpg", width: 10, height: 10, alt: "Monedas", credit: "Foto: prueba", permission: "pending" as const }],
      claimIds: [c.claims[0].id],
      demo: false,
    };
    c.pieces = [piece];
    expect(errorsFor(c, "piece-prueba")).toEqual([]);
    expect(validateCatalog(c).some((i) => i.id === "piece-prueba" && i.severity === "warning" && i.message.includes("permiso"))).toBe(true);
    c.pieces = [{ ...piece, originSiteId: "site-no-existe", claimIds: ["claim-no-existe"] }];
    expect(errorsFor(c, "piece-prueba").join()).toContain("no existe");
    expect(parseCatalog({ ...c, pieces: [{ ...piece, images: [{ ...piece.images[0], permission: "maybe" }] }] }).ok).toBe(false);
  });

  it("rejects broken links, unknown towns and unattributed interpretations", () => {
    const c = clone(DEMO);
    c.sites[0].locality = "Recópolis";
    c.claims.find((x) => x.id === "claim-vega-baja-palatino")!.attribution = undefined;
    c.stories[0].claimIds = ["claim-guarrazar-hallazgo"];
    c.routes[0].stopIds = [...c.routes[0].stopIds, "site-inventado"];
    c.showcase.heroSiteId = "site-inventado";
    expect(errorsFor(c, c.sites[0].id).join()).toContain("Recópolis");
    expect(errorsFor(c, "claim-vega-baja-palatino").join()).toContain("atribución");
    expect(errorsFor(c, c.stories[0].id).join()).toContain("otro lugar");
    expect(errorsFor(c, c.routes[0].id).join()).toContain("site-inventado");
    expect(errorsFor(c, "showcase").join()).toContain("portada");
  });

  it("rejects aliases that are a town or name two places", () => {
    const c = clone(DEMO);
    const alcazar = c.sites.find((s) => s.id === "site-alcazar")!;
    alcazar.aliases = ["toledo"];
    const catedral = c.sites.find((s) => s.id === "site-catedral")!;
    catedral.aliases = [...(catedral.aliases ?? []), "san roman"];
    expect(errorsFor(c, "site-alcazar").join()).toContain("localidad");
    expect(errorsFor(c, "site-catedral").join()).toContain("más de un lugar");
    expect(errorsFor(c, "site-san-roman").join()).toContain("más de un lugar");
  });

  it("warns when an alias is also assistant vocabulary or part of another place's name", () => {
    const c = clone(DEMO);
    c.sites.find((s) => s.id === "site-alcazar")!.aliases = ["plan"];
    c.sites.find((s) => s.id === "site-catedral")!.aliases = ["cristo"];
    const warnings = validateCatalog(c).filter((i) => i.severity === "warning").map((i) => `${i.id}: ${i.message}`);
    expect(warnings.some((w) => w.startsWith("site-alcazar") && w.includes("palabra"))).toBe(true);
    expect(warnings.some((w) => w.startsWith("site-catedral") && w.includes("Mezquita del Cristo de la Luz"))).toBe(true);
  });

  it("needs keywords written the way the assistant matches them, and how to reach every town", () => {
    const c = clone(DEMO);
    c.showcase.heritageKeywords = [...c.showcase.heritageKeywords, "Recesvinto"];
    c.routes[0].keywords = ["corona*", "Tesóro"];
    c.showcase.localities = [...c.showcase.localities, "Recópolis"];
    expect(errorsFor(c, "showcase").join()).toContain("Recesvinto");
    expect(errorsFor(c, "showcase").join()).toContain("Recópolis");
    expect(errorsFor(c, c.routes[0].id).join()).toContain("Tesóro");
  });

  it("warns about changed addresses and retired places compared with the previous version", () => {
    const c = clone(DEMO);
    c.sites[0].slug = "otro-slug";
    const retired = c.sites.pop()!;
    const warnings = validateCatalog(c, DEMO).filter((i) => i.severity === "warning").map((i) => i.message);
    expect(warnings.some((w) => w.includes("otro-slug"))).toBe(true);
    expect(warnings.some((w) => w.includes(retired.id))).toBe(true);
  });
});

describe("buildCatalog", () => {
  it("rebuilds the demo catalog from its records", () => {
    const records = demoRecords("review");
    const built = buildCatalog(records, null, { mode: "publish", selected: new Set(records.map(recordKey)) });
    expect(hasErrors(validateCatalog(built))).toBe(false);
    expect(built.sites.map((s) => s.id)).toEqual(DEMO.sites.map((s) => s.id));
    expect(built.claims.map((c) => c.id)).toEqual(DEMO.claims.map((c) => c.id));
    expect(built.routes).toEqual(DEMO.routes);
    expect(built.showcase).toEqual(DEMO.showcase);
    expect(parseCatalog(clone(built)).ok).toBe(true);
  });

  it("publishes only the selected records and keeps the web version of other drafts", () => {
    let records = demoRecords();
    const vega = DEMO.sites.find((s) => s.id === "site-vega-baja")!;
    records = edit(records, "site", "site-vega-baja", { status: "draft", data: { ...vega, tagline: "Borrador sin revisar" } });
    const roman = DEMO.sites.find((s) => s.id === "site-san-roman")!;
    records = edit(records, "site", "site-san-roman", { status: "review", data: { ...roman, tagline: "Nueva entradilla" } });
    const built = buildCatalog(records, DEMO, { mode: "publish", selected: new Set(["site:site-san-roman"]) });
    expect(built.sites.find((s) => s.id === "site-san-roman")!.tagline).toBe("Nueva entradilla");
    expect(built.sites.find((s) => s.id === "site-vega-baja")!.tagline).toBe(vega.tagline);
  });

  it("leaves out new drafts and records asking for retirement", () => {
    let records = demoRecords();
    const extra = { ...DEMO.sites[0], id: "site-nuevo", slug: "nuevo", name: "Lugar nuevo", aliases: [] };
    records = [...records, { ...records[0], id: "site-nuevo", data: extra, status: "draft", position: 99 } as AnyRecord];
    records = edit(records, "site", "site-mirador-valle", { status: "review", retire: true });
    const built = buildCatalog(records, DEMO, { mode: "publish", selected: new Set(["site:site-mirador-valle"]) });
    expect(built.sites.some((s) => s.id === "site-nuevo")).toBe(false);
    expect(built.sites.some((s) => s.id === "site-mirador-valle")).toBe(false);
    const preview = buildCatalog(records, DEMO, { mode: "preview" });
    expect(preview.sites.some((s) => s.id === "site-nuevo")).toBe(true);
    expect(preview.sites.some((s) => s.id === "site-mirador-valle")).toBe(false);
  });

  it("raises a claim's version when its content changes and derives each place's claims", () => {
    let records = demoRecords();
    const claim = DEMO.claims.find((c) => c.id === "claim-guarrazar-hallazgo")!;
    records = edit(records, "claim", claim.id, { status: "review", data: { ...claim, text: `${claim.text} (corregido)` } });
    const built = buildCatalog(records, DEMO, { mode: "publish", selected: new Set([`claim:${claim.id}`]) });
    expect(built.claims.find((c) => c.id === claim.id)!.version).toBe(claim.version + 1);
    expect(built.claims.find((c) => c.id === "claim-concilios")!.version).toBe(1);
    expect(built.sites.find((s) => s.id === "site-guarrazar")!.claimIds).toContain(claim.id);
  });
});

describe("statuses", () => {
  it("marks published records, and retired ones when asked", () => {
    let records = demoRecords();
    records = edit(records, "site", "site-alcazar", { status: "review", rev: 4 });
    records = edit(records, "site", "site-catedral", { status: "review", retire: true, rev: 7 });
    expect(statusesAfterPublish(records, new Set(["site:site-alcazar", "site:site-catedral"]))).toEqual([
      { kind: "site", id: "site-alcazar", rev: 4, status: "published" },
      { kind: "site", id: "site-catedral", rev: 7, status: "retired" },
    ]);
  });

  it("after a restore, only working copies the web shows stay published", () => {
    let records = demoRecords();
    const roman = DEMO.sites.find((s) => s.id === "site-san-roman")!;
    records = edit(records, "site", "site-san-roman", { data: { ...roman, tagline: "Cambiada después" } });
    records = edit(records, "site", "site-alcazar", { status: "retired" });
    records = edit(records, "site", "site-catedral", { status: "draft" });
    const updates = statusesAfterRestore(records, DEMO);
    expect(updates).toEqual([
      { kind: "site", id: "site-san-roman", rev: 1, status: "draft" },
      { kind: "site", id: "site-alcazar", rev: 1, status: "published" },
      { kind: "site", id: "site-catedral", rev: 1, status: "published" },
    ]);
  });
});

describe("record data", () => {
  it("reports missing fields in Spanish and refuses unsafe links", () => {
    const site = { ...recordsFromCatalog(DEMO)[0].data, name: "", officialUrl: "javascript:alert(1)" };
    const result = parseRecordData("site", site);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.path)).toEqual(expect.arrayContaining(["name", "officialUrl"]));
    expect(result.errors.find((e) => e.path === "officialUrl")!.message).toContain("https");
  });

  it("makes readable, unused ids", () => {
    expect(slugify("Museo de Santa Cruz")).toBe("museo-de-santa-cruz");
    expect(newRecordId("site", "Recópolis", new Set())).toBe("site-recopolis");
    expect(newRecordId("site", "Recópolis", new Set(["site-recopolis"]))).toBe("site-recopolis-2");
    expect(newRecordId("claim", "Leovigildo fundó Recópolis hacia el año 578 en honor", new Set())).toBe("claim-leovigildo-fundo-recopolis-hacia-el-ano");
  });
});
