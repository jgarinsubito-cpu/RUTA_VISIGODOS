import { describe, expect, it } from "vitest";
import { groupPoints } from "./cluster";

describe("groupPoints", () => {
  it("groups markers that would overlap and leaves distant ones alone", () => {
    const groups = groupPoints(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 10, y: 10 },
        { id: "c", x: 200, y: 0 },
        { id: "d", x: 20, y: -20 },
      ],
      36,
    );
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([["a", "b", "d"], ["c"]]);
  });

  it("keeps every marker separate once zoomed in far enough", () => {
    const groups = groupPoints([
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 0 },
    ]);
    expect(groups).toHaveLength(2);
  });
});
