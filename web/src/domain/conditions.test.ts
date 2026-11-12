import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { getSite } from "@/data/content";
import { schedule } from "./planner";
import type { Trip, TripContext } from "./types";
import {
  mergeWeather,
  parseAemetDaily,
  parseAemetHourly,
  parseDatexIncidents,
  parsePeriod,
  proposeForWeather,
  rainExposure,
  trafficAdvisories,
  weatherAdvisories,
  type WeatherDay,
} from "./conditions";

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: "2026-11-14",
  startTime: "10:00",
  endTime: "19:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

function trip(ids: string[], context: TripContext = CONTEXT): Trip {
  return { id: "t", revision: 1, context, stops: schedule(ids, context).stops, updatedAt: "2026-11-12T10:00:00Z" };
}

const day = (windows: WeatherDay["windows"], extra: Partial<WeatherDay> = {}): WeatherDay => ({
  locality: "Toledo",
  date: "2026-11-14",
  windows,
  issuedAt: "2026-11-12T08:22:53",
  ...extra,
});

describe("AEMET forecasts", () => {
  it("reads daily and hourly periods", () => {
    expect(parsePeriod("00-12")).toEqual({ from: 0, to: 720 });
    expect(parsePeriod("0713")).toEqual({ from: 420, to: 780 });
    expect(parsePeriod("1901")).toEqual({ from: 1140, to: 1440 });
    expect(parsePeriod("x")).toBeNull();
  });

  it("keeps the finest windows of the daily forecast, with temperatures and gusts", () => {
    const json = [
      {
        elaborado: "2026-11-12T08:22:53",
        prediccion: {
          dia: [
            {
              fecha: "2026-11-14T00:00:00",
              probPrecipitacion: [
                { value: 70, periodo: "00-24" },
                { value: 20, periodo: "00-12" },
                { value: 70, periodo: "12-24" },
              ],
              rachaMax: [{ value: "", periodo: "00-24" }, { value: "45", periodo: "12-24" }],
              temperatura: { maxima: 16, minima: 4 },
            },
          ],
        },
      },
    ];
    const [d] = parseAemetDaily(json, "Toledo");
    expect(d.windows).toEqual([
      { from: 0, to: 720, precipProb: 20 },
      { from: 720, to: 1440, precipProb: 70 },
    ]);
    expect([d.tMax, d.tMin, d.gustMax, d.issuedAt]).toEqual([16, 4, 45, "2026-11-12T08:22:53"]);
  });

  it("takes storm odds from the hourly forecast and merges it over the daily one", () => {
    const hourly = parseAemetHourly(
      [
        {
          prediccion: {
            dia: [
              {
                fecha: "2026-11-14T00:00:00",
                probPrecipitacion: [{ value: "10", periodo: "0713" }, { value: "65", periodo: "1319" }],
                probTormenta: [{ value: "40", periodo: "1319" }],
                temperatura: [{ value: "9", periodo: "08" }, { value: "15", periodo: "15" }],
              },
            ],
          },
        },
      ],
      "Toledo",
    );
    expect(hourly[0].windows[1]).toEqual({ from: 780, to: 1140, precipProb: 65, stormProb: 40 });
    const merged = mergeWeather(hourly, [day([], { tMax: 17, tMin: 3 })]);
    expect(merged[0].tMax).toBe(17);
    expect(merged[0].windows).toHaveLength(2);
  });
});

describe("DGT incidents (DATEX II)", () => {
  it("reads records with a point, a road and validity, whatever the namespaces", () => {
    const xml = `<?xml version="1.0"?>
      <d2:payload xmlns:d2="x" xmlns:sit="y" xmlns:loc="z" xmlns:com="w" xmlns:xsi="v">
        <sit:situation id="S1">
          <sit:situationRecord id="R1" xsi:type="sit:MaintenanceWorks">
            <sit:validity><com:validityTimeSpecification><com:overallStartTime>2026-11-10T08:00:00+01:00</com:overallStartTime><com:overallEndTime>2026-11-20T18:00:00+01:00</com:overallEndTime></com:validityTimeSpecification></sit:validity>
            <sit:locationReference><loc:supplementaryPositionalDescription><loc:roadInformation><loc:roadNumber>CM-401</loc:roadNumber></loc:roadInformation></loc:supplementaryPositionalDescription>
              <loc:pointByCoordinates><loc:pointCoordinates><loc:latitude>39.81</loc:latitude><loc:longitude>-4.14</loc:longitude></loc:pointCoordinates></loc:pointByCoordinates>
            </sit:locationReference>
          </sit:situationRecord>
          <sit:situationRecord id="R2" xsi:type="sit:Accident"><sit:validity/></sit:situationRecord>
        </sit:situation>
      </d2:payload>`;
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false }).parse(xml);
    expect(parseDatexIncidents(parsed)).toEqual([
      { id: "R1", label: "Obras", road: "CM-401", lat: 39.81, lng: -4.14, start: "2026-11-10T08:00:00+01:00", end: "2026-11-20T18:00:00+01:00", comment: undefined },
    ]);
  });
});

describe("advice", () => {
  const t = trip(["site-cristo-luz", "site-santa-maria-blanca", "site-san-roman", "site-transito"]);

  it("warns of rain at the hours spent outdoors, naming the places, and ignores museums", () => {
    const morningRain = day([
      { from: 0, to: 720, precipProb: 80 },
      { from: 720, to: 1440, precipProb: 5 },
    ]);
    const advisories = weatherAdvisories(t, getSite, [morningRain]);
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toMatchObject({ kind: "rain", severity: "warning", day: 0 });
    expect(advisories[0].detail).toContain("Cristo de la Luz");
    expect(advisories[0].siteIds).not.toContain("site-san-roman");
    expect(advisories[0].source).toBe("Fuente: AEMET, previsión de las 08:22");
    expect(weatherAdvisories(t, getSite, [day([{ from: 0, to: 1440, precipProb: 10 }])])).toEqual([]);
  });

  it("proposes an order that keeps the outdoor places drier, only when it clearly helps", () => {
    const morningRain = [day([{ from: 0, to: 720, precipProb: 80 }, { from: 720, to: 1440, precipProb: 5 }])];
    const proposal = proposeForWeather(t, getSite, morningRain);
    expect(proposal?.ok).toBe(true);
    expect(rainExposure({ context: proposal!.context, stops: proposal!.after }, getSite, morningRain)).toBeLessThan(rainExposure(t, getSite, morningRain));
    expect(proposal!.warnings.some((w) => w.startsWith("Para evitar la lluvia"))).toBe(true);
    // Rain all day: no order helps, so nothing is proposed.
    expect(proposeForWeather(t, getSite, [day([{ from: 0, to: 1440, precipProb: 90 }])])).toBeNull();
  });

  it("reports traffic incidents near the trip's places on its days, with the source", () => {
    const castle = getSite("site-castillo-guadamur")!;
    const g = trip(["site-guarrazar", "site-castillo-guadamur"], { ...CONTEXT, transport: "car" });
    const near = { id: "R1", label: "Obras", road: "CM-401", lat: castle.coordinates.lat + 0.005, lng: castle.coordinates.lng, end: "2026-11-20T18:00:00" };
    const far = { ...near, id: "R2", lat: castle.coordinates.lat + 0.5 };
    const over = { ...near, id: "R3", end: "2026-11-13T18:00:00" };
    const out = trafficAdvisories(g, getSite, [near, far, over], "2026-11-14T09:30:00");
    expect(out.map((a) => a.id)).toEqual(["traffic:R1:2026-11-14"]);
    expect(out[0].detail).toContain("CM-401");
    expect(out[0].source).toBe("Fuente: DGT, consultado a las 09:30");
  });
});
