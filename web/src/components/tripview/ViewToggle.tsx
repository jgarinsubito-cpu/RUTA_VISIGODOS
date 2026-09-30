"use client";
/** Mobile map/list switch (segmented control). State is conveyed by aria-pressed and text weight. */
import { IconMap, IconRoute } from "@/components/shell/icons";

export type ViewMode = "list" | "map";

export function ViewToggle({
  value,
  onChange,
  label = "Cambiar vista",
  className = "",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  label?: string;
  className?: string;
}) {
  const options = [
    { id: "list" as const, text: "Lista", Icon: IconRoute },
    { id: "map" as const, text: "Mapa", Icon: IconMap },
  ];
  return (
    <div role="group" aria-label={label} className={`inline-flex rounded-full border border-stone bg-surface p-1 ${className}`}>
      {options.map(({ id, text, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm ${
              active ? "bg-primary font-semibold text-on-primary" : "font-medium text-ink-muted hover:bg-surface-muted"
            }`}
          >
            <Icon width={18} height={18} />
            {text}
          </button>
        );
      })}
    </div>
  );
}
