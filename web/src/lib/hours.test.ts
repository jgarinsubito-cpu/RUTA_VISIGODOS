import { describe, expect, it } from "vitest";
import type { OpeningInfo } from "@/domain/types";
import { accessLabel, dayHoursText, describeHours, hoursStatusLabel, isoWeekday, weeklyRows } from "./hours";
import { formatDuration } from "./labels";

const split = [
  { open: "10:00", close: "14:30" },
  { open: "16:00", close: "18:30" },
];
const example: OpeningInfo = {
  status: "example",
  weekly: { 2: split, 3: split, 4: split, 5: split, 6: [{ open: "10:00", close: "18:30" }], 7: [{ open: "10:00", close: "14:30" }] },
};

describe("hours", () => {
  it("labels status honestly", () => {
    expect(hoursStatusLabel(example)).toBe("Horario de ejemplo (no verificado)");
    expect(hoursStatusLabel({ status: "unknown" })).toBe("Sin verificar");
    expect(hoursStatusLabel({ status: "verified", verifiedAt: "2026-09-01" })).toBe("Horario verificado el 01/09/2026");
  });

  it("computes ISO weekdays independent of timezone", () => {
    expect(isoWeekday("2026-09-28")).toBe(1);
    expect(isoWeekday("2026-09-29")).toBe(2);
    expect(isoWeekday("2026-10-04")).toBe(7);
  });

  it("groups consecutive days with equal windows", () => {
    expect(weeklyRows(example)).toEqual([
      { days: "Lun", text: "Cerrado" },
      { days: "Mar–Vie", text: "10:00–14:30 y 16:00–18:30" },
      { days: "Sáb", text: "10:00–18:30" },
      { days: "Dom", text: "10:00–14:30" },
    ]);
  });

  it("never renders unknown hours as open", () => {
    const unknown: OpeningInfo = { status: "unknown", weekly: { 1: [{ open: "09:00", close: "20:00" }] } };
    expect(weeklyRows(unknown)).toEqual([]);
    expect(dayHoursText(unknown, "2026-09-28")).toBe("Sin verificar");
  });

  it("describes a given date", () => {
    expect(dayHoursText(example, "2026-09-28")).toBe("Cerrado");
    expect(describeHours(example, "2026-09-29").day).toEqual({ label: "martes 29/09/2026", text: "10:00–14:30 y 16:00–18:30" });
    expect(describeHours({ status: "example", alwaysOpen: true }).rows[0].text).toBe("Acceso libre (espacio exterior)");
  });

  it("labels access and durations", () => {
    expect(accessLabel({ status: "unknown", stepFree: true })).toBe("Sin verificar");
    expect(accessLabel({ status: "verified", stepFree: true })).toBe("Accesible sin escalones (verificado)");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(210)).toBe("3 h 30 min");
  });
});
