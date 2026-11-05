import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/data/content";
import type { Stop } from "@/domain/types";
import { toTourStop } from "@/domain/tour";
import { formatBytes, tourFiles } from "./offline";

const SITE = demoCatalog().sites.find((s) => s.id === "site-guarrazar")!;

describe("tour download", () => {
  it("lists each page and media file once: audio, gallery and place photo", () => {
    const image = { src: "/images/ruta/A.jpg", width: 10, height: 10, alt: "a", author: "b", license: "c", sourceUrl: "https://example.org" };
    const audio = { src: "/media/audio/g1.mp3", durationSeconds: 60, label: "Locución", transcript: "Texto completo de la locución de la parada." };
    const stops: Stop[] = [
      { id: "stop-a", siteId: SITE.id, order: 1, name: "A", audio, gallery: [image], storyIds: [] },
      { id: "stop-b", siteId: SITE.id, order: 2, name: "B", gallery: [image], storyIds: [] },
    ];
    const files = tourFiles("/lugares/x/visita", ["/lugares/x", "/lugares/x"], stops.map((s) => toTourStop(SITE, s, 2)));
    expect(files).toEqual(["/lugares/x/visita", "/lugares/x", "/media/audio/g1.mp3", "/images/ruta/A.jpg", SITE.image!.src]);
  });

  it("formats sizes for people", () => {
    expect(formatBytes(500)).toBe("1 KB");
    expect(formatBytes(13.1 * 1024 * 1024)).toBe("13,1 MB");
  });
});
