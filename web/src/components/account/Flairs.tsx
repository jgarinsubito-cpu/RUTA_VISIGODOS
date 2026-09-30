"use client";
/**
 * Preference "flairs": interest tiles with a photo of a place for each theme, and chip groups for
 * pace, company and access needs. Real checkboxes/radios under the styling, fieldsets with legends,
 * 44px targets, and a check mark on selected items (not colour alone).
 */
import Image from "next/image";
import { useId } from "react";
import { ACCESS_NEEDS, type AccessNeed, type Site, type TravelGroup, type TravelPace, type VisitorPreferences } from "@/domain/types";
import { SITES } from "@/data/content";
import { ACCESS_NEED_LABEL, GROUP_LABEL, PACE_LABEL, themeLabel } from "@/lib/labels";
import { availableThemes } from "@/components/explore/filter";
import { IconCheck } from "@/components/shell/icons";

export const INTEREST_OPTIONS = availableThemes(SITES);

/**
 * A photographed place for each theme, Visigothic places first, never the same photo twice
 * (unless a theme has no other photographed place).
 */
const COVERS: Map<string, Site | undefined> = (() => {
  const used = new Set<string>();
  const covers = new Map<string, Site | undefined>();
  for (const theme of INTEREST_OPTIONS) {
    const withTheme = SITES.filter((s) => s.themes.includes(theme) && s.image).sort((a, b) => Number(b.visigothic) - Number(a.visigothic));
    const pick = withTheme.find((s) => !used.has(s.id)) ?? withTheme[0];
    if (pick) used.add(pick.id);
    covers.set(theme, pick);
  }
  return covers;
})();

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Legend({ title, description }: { title: string; description?: string }) {
  return (
    <legend className="mb-3 flex flex-col gap-1">
      <span className="text-base font-semibold text-ink">{title}</span>
      {description && <span className="text-sm text-ink-muted">{description}</span>}
    </legend>
  );
}

const chip =
  "inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full border border-stone bg-surface px-4 text-sm text-ink transition-colors hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

const card =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-stone bg-surface p-3 text-sm text-ink transition-colors hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Chips (short labels) or cards (label + visible hint) for one question. */
export function ChipGroup<T extends string>({
  legend,
  description,
  options,
  selected,
  onToggle,
  multiple,
  layout = "chips",
}: {
  legend: string;
  description?: string;
  options: Option<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  multiple: boolean;
  layout?: "chips" | "cards";
}) {
  const name = useId();
  return (
    <fieldset>
      <Legend title={legend} description={description} />
      <div className={layout === "cards" ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          const input = (
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              checked={on}
              onChange={() => onToggle(o.value)}
              onClick={() => {
                // A chosen radio can be cleared by choosing it again.
                if (!multiple && on) onToggle(o.value);
              }}
              className="sr-only"
            />
          );
          return layout === "cards" ? (
            <label key={o.value} className={card}>
              {input}
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border ${multiple ? "rounded-md" : "rounded-full"} ${
                  on ? "border-primary bg-primary text-on-primary" : "border-stone"
                }`}
              >
                {on && <IconCheck width={14} height={14} />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{o.label}</span>
                {o.hint && <span className="text-xs text-ink-muted">{o.hint}</span>}
              </span>
            </label>
          ) : (
            <label key={o.value} className={chip}>
              {input}
              {on && <IconCheck width={16} height={16} />}
              {o.label}
              {o.hint && <span className="sr-only">: {o.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Interests as photo tiles: the visitor picks what catches their eye. */
export function InterestTiles({
  selected,
  onChange,
  visibleLegend = true,
}: {
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** False when a heading above already asks the question (onboarding step). */
  visibleLegend?: boolean;
}) {
  return (
    <fieldset>
      {visibleLegend ? (
        <Legend title="¿Qué te interesa?" description="Elige todos los que quieras. Ordenamos lugares y rutas según esto; nada se oculta." />
      ) : (
        <legend className="sr-only">Intereses</legend>
      )}
      <div className="@container">
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-3 @2xl:grid-cols-4">
        {INTEREST_OPTIONS.map((theme) => {
          const on = selected.includes(theme);
          const cover = COVERS.get(theme);
          return (
            <label
              key={theme}
              className={`group relative flex aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border-2 bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                on ? "border-primary" : "border-transparent"
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => onChange(toggle(selected, theme))} className="sr-only" />
              {cover?.image && (
                <Image
                  src={cover.image.src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 220px, 45vw"
                  className={`object-cover transition-transform duration-300 group-hover:scale-105 ${on ? "" : "opacity-90"}`}
                  style={{ objectPosition: cover.image.focus ?? "50% 50%" }}
                />
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-scrim via-transparent to-transparent" />
              <span className="relative mt-auto flex w-full items-end justify-between gap-2 p-2.5">
                <span className="text-sm font-semibold text-on-photo drop-shadow">{themeLabel(theme)}</span>
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                    on ? "border-surface bg-primary text-on-primary" : "border-on-photo/80 bg-transparent"
                  }`}
                >
                  {on && <IconCheck width={14} height={14} />}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      </div>
    </fieldset>
  );
}

export function PaceAndGroup({ value, onChange }: { value: VisitorPreferences; onChange: (next: VisitorPreferences) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <ChipGroup<TravelPace>
        legend="¿Qué ritmo prefieres?"
        layout="cards"
        multiple={false}
        options={(Object.keys(PACE_LABEL) as TravelPace[]).map((p) => ({ value: p, label: PACE_LABEL[p].label, hint: PACE_LABEL[p].hint }))}
        selected={value.pace ? [value.pace] : []}
        onToggle={(p) => onChange({ ...value, pace: value.pace === p ? null : p })}
      />
      <ChipGroup<TravelGroup>
        legend="¿Con quién viajas?"
        multiple={false}
        options={(Object.keys(GROUP_LABEL) as TravelGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))}
        selected={value.group ? [value.group] : []}
        onToggle={(g) => onChange({ ...value, group: value.group === g ? null : g })}
      />
    </div>
  );
}

export function AccessNeedsPicker({ value, onChange }: { value: AccessNeed[]; onChange: (next: AccessNeed[]) => void }) {
  return (
    <ChipGroup<AccessNeed>
      legend="¿Algo de accesibilidad que debamos tener en cuenta?"
      description="La mayoría de accesos aún están sin verificar: te diremos qué no sabemos, nunca que algo es accesible sin comprobarlo."
      layout="cards"
      multiple
      options={ACCESS_NEEDS.map((n) => ({ value: n, label: ACCESS_NEED_LABEL[n].label, hint: ACCESS_NEED_LABEL[n].effect }))}
      selected={value}
      onToggle={(n) => onChange(toggle(value, n))}
    />
  );
}
