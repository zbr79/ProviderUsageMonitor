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

export default function UsageBar({
  label,
  w,
  dimmed,
  increased,
  reset,
}: {
  label: string;
  w: UsageWindow;
  dimmed: boolean;
  increased: boolean;
  light?: boolean;
  reset: string | null;
}) {
  return (
    <div className="flex-1 min-w-0 transition-colors duration-700">
      <div className={`flex justify-between ${WIDGET_TYPE_SCALE.body} mb-0.5`}>
        <span className="transition-colors duration-700 text-role-muted">{label}</span>
        <span
          className={`transition-colors duration-700 ${
            dimmed ? "text-role-muted" : "text-role-text"
          }`}
        >
          {!dimmed && increased && (
            <span className="arrow-pop transition-colors duration-700 text-role-success">
              ▲{" "}
            </span>
          )}
          {fmtPct(w.percent)}%
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
