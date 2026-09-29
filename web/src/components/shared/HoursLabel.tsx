/** Renders OpeningInfo honestly: example hours are labelled, unknown hours read "Sin verificar". */
import type { OpeningInfo } from "@/domain/types";
import { describeHours } from "@/lib/hours";
import { IconClock, IconInfo } from "@/components/shell/icons";

const TONE = {
  verified: "text-ok",
  example: "text-warn",
  unknown: "text-ink-muted",
} as const;

export function HoursLabel({
  hours,
  date,
  variant = "inline",
  className = "",
}: {
  hours: OpeningInfo;
  /** YYYY-MM-DD; when set, the hours for that day are shown. */
  date?: string | null;
  variant?: "inline" | "full";
  className?: string;
}) {
  const d = describeHours(hours, date);
  const Icon = d.tone === "verified" ? IconClock : IconInfo;

  if (variant === "inline") {
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-1.5 text-sm ${className}`}>
        <Icon width={16} height={16} className={TONE[d.tone]} />
        <span className={`font-medium ${TONE[d.tone]}`}>{d.statusLabel}</span>
        {d.day && d.tone !== "unknown" && <span className="text-ink-muted">· {d.day.text}</span>}
      </span>
    );
  }

  return (
    <div className={`text-sm ${className}`}>
      <p className="flex items-center gap-1.5">
        <Icon width={16} height={16} className={TONE[d.tone]} />
        <span className={`font-medium ${TONE[d.tone]}`}>{d.statusLabel}</span>
      </p>
      {d.day && (
        <p className="mt-1">
          <span className="capitalize">{d.day.label}</span>: <span className="font-medium">{d.day.text}</span>
        </p>
      )}
      {d.rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {d.rows.map((r) => (
            <div key={r.days} className="contents">
              <dt className="text-ink-muted">{r.days}</dt>
              <dd>{r.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {d.note && <p className="mt-2 text-xs text-ink-muted">{d.note}</p>}
    </div>
  );
}
