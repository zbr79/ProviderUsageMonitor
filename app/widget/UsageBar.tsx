"use client";

import { WIDGET_TYPE_SCALE } from "@/lib/theme";
import type { UsageWindow } from "./types";

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-role-bar-warn" : "bg-role-bar-ok";
  return "bg-role-bar-danger";
}

export function fmtPct(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (r > 99 && r < 100) return r.toFixed(1);
  return String(Math.round(r));
}

const EXPANDED_LABEL: Record<string, string> = {
  R: "Rolling window",
  W: "Weekly window",
  M: "Monthly window",
};

export default function UsageBar({
  label,
  title,
  w,
  dimmed,
  increased,
  reset,
}: {
  label: string;
  title?: string;
  w: UsageWindow;
  dimmed: boolean;
  increased: boolean;
  light?: boolean;
  reset: string | null;
}) {
  const fullLabel = title ?? EXPANDED_LABEL[label] ?? label;
  const pctNum = Math.min(Math.max(Math.round(w.percent * 10) / 10, 0), 100);
  const pctStr = fmtPct(w.percent);
  const valueText = reset ? `${pctStr} percent, resets in ${reset}` : `${pctStr} percent`;

  return (
    <div
      role="meter"
      aria-label={fullLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pctNum}
      aria-valuetext={valueText}
      className="flex-1 min-w-0 transition-colors duration-700"
    >
      <div className={`flex justify-between ${WIDGET_TYPE_SCALE.body} mb-0.5`}>
        <span
          title={EXPANDED_LABEL[label]}
          className="transition-colors duration-700 text-role-muted"
        >
          {label}
        </span>
        <span
          className={`transition-colors duration-700 ${
            dimmed ? "text-role-muted" : "text-role-text"
          }`}
        >
          {!dimmed && increased && (
            <span
              aria-hidden="true"
              className="arrow-pop transition-colors duration-700 text-role-success"
            >
              ▲{" "}
            </span>
          )}
          {pctStr}%
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden transition-colors duration-700 bg-role-track">
        <div
          className={`h-full rounded-full ${dimmed ? "bg-role-bar-dim" : windowColor(w)}`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
      {reset && (
        <div
          className={`${WIDGET_TYPE_SCALE.caption} mt-0.5 transition-colors duration-700 text-role-muted`}
        >
          {reset}
        </div>
      )}
    </div>
  );
}
