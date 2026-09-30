import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLAIMS, ROUTES, SHOWCASE, SITES, STORIES } from "./catalog";
import { PUBLISHED_CLAIMS } from "./content";
import { EDITORIAL_CLAIMS } from "./editorial";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("catalog evidence safety", () => {
  it("ships only published claims in the client-importable catalog", () => {
    expect(CLAIMS.every((c) => c.status === "published")).toBe(true);
    expect(PUBLISHED_CLAIMS).toEqual(CLAIMS);
  });

  it("keeps editorial (unpublished) claims out of every app module", () => {
    expect(EDITORIAL_CLAIMS.every((c) => c.status !== "published")).toBe(true);
    const root = join(__dirname, "..");
    const importers = sourceFiles(root).filter(
      (f) => !f.endsWith(join("data", "editorial.ts")) && /data\/editorial|["']\.\/editorial["']/.test(readFileSync(f, "utf8")),
    );
    expect(importers).toEqual([]);
    const catalogSource = readFileSync(join(__dirname, "catalog.ts"), "utf8");
    for (const c of EDITORIAL_CLAIMS) expect(catalogSource).not.toContain(c.id);
  });

  it("links every story only to published claims of its own site", () => {
    for (const story of STORIES) {
      for (const id of story.claimIds) {
        const claim = PUBLISHED_CLAIMS.find((c) => c.id === id);
        expect(claim, `${story.id} -> ${id}`).toBeDefined();
        expect(claim!.siteId).toBe(story.siteId);
      }
    }
  });
});

describe("catalog references", () => {
  const siteIds = new Set(SITES.map((s) => s.id));

  it("is read by app code only through ./content", () => {
    const root = join(__dirname, "..");
    const importers = sourceFiles(root).filter(
      (f) =>
        !f.endsWith(join("data", "content.ts")) &&
        !f.endsWith(join("data", "editorial.ts")) &&
        /data\/catalog["']|["']\.\/catalog["']/.test(readFileSync(f, "utf8")),
    );
    expect(importers).toEqual([]);
  });

  it("has unique ids and slugs", () => {
    for (const list of [SITES, ROUTES, CLAIMS, STORIES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size, ids.join(",")).toBe(ids.length);
    }
    for (const list of [SITES, ROUTES]) {
      const slugs = list.map((x) => x.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("links sites, claims and stories both ways", () => {
    for (const site of SITES) {
      for (const id of site.claimIds) expect(CLAIMS.find((c) => c.id === id)?.siteId, `${site.id} -> ${id}`).toBe(site.id);
      for (const id of site.storyIds) expect(STORIES.find((s) => s.id === id)?.siteId, `${site.id} -> ${id}`).toBe(site.id);
    }
    for (const claim of CLAIMS) expect(SITES.find((s) => s.id === claim.siteId)?.claimIds, claim.id).toContain(claim.id);
    for (const story of STORIES) expect(SITES.find((s) => s.id === story.siteId)?.storyIds, story.id).toContain(story.id);
  });

  it("points routes and the showcase at existing places", () => {
    for (const route of ROUTES) for (const id of route.stopIds) expect(siteIds.has(id), `${route.id} -> ${id}`).toBe(true);
    expect(siteIds.has(SHOWCASE.heroSiteId)).toBe(true);
    for (const ex of SHOWCASE.assistantExamples) expect(siteIds.has(ex.siteId), ex.siteId).toBe(true);
  });

  it("writes aliases the way retrieval matches them (lowercase, unaccented)", () => {
    for (const site of SITES) {
      for (const alias of site.aliases ?? []) {
        expect(alias, site.id).toBe(alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
      }
    }
  });
});
