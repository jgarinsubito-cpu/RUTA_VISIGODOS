import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateCatalog } from "@/domain/editorial/validate";
import { parseCatalog } from "@/domain/editorial/schema";
import { DEMO_CATALOG } from "./catalog";
import { publishedClaims } from "./content";
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
    expect(DEMO_CATALOG.claims.every((c) => c.status === "published")).toBe(true);
    expect(publishedClaims()).toEqual(DEMO_CATALOG.claims);
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
});

describe("demo catalog", () => {
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

  it("has the shape a published snapshot must have", () => {
    const parsed = parseCatalog(JSON.parse(JSON.stringify(DEMO_CATALOG)));
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });

  // The same rules the admin applies before publishing (unique ids, links both ways, stories on
  // published claims of their own place, known towns, aliases that name only one place).
  it("passes the publication rules without errors", () => {
    const errors = validateCatalog(DEMO_CATALOG).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });
});
