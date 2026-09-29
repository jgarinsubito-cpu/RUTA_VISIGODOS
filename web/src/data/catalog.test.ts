import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLAIMS, PUBLISHED_CLAIMS, STORIES } from "./catalog";
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
