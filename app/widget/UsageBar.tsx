"use client";

import type { UsageWindow } from "./types";

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return "bg-red-400";
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
  light,
  reset,
}: {
  label: string;
  w: UsageWindow;
  dimmed: boolean;
  increased: boolean;
  light: boolean;
  reset: string | null;
}) {
  return (
    <div className="flex-1 min-w-0 transition-colors duration-700">
      <div className="flex justify-between text-[10px] leading-3 mb-0.5">
        <span className={`transition-colors duration-700 ${light ? "text-zinc-600" : "text-zinc-200"}`}>
          {label}
        </span>
        <span
          className={`transition-colors duration-700 ${
            dimmed ? "text-zinc-400" : light ? "text-zinc-800" : "text-zinc-100"
          }`}
        >
          {!dimmed && increased && (
            <span
              className={`arrow-pop transition-colors duration-700 ${
                light ? "text-emerald-600" : "text-emerald-300"
              }`}
            >
              ▲{" "}
            </span>
          )}
          {fmtPct(w.percent)}%
        </span>
      </div>
      <div
        className={`h-1 rounded-full overflow-hidden transition-colors duration-700 ${
          light ? "bg-zinc-300/70" : "bg-white/15"
        }`}
      >
        <div
          className={`h-full rounded-full ${dimmed ? "bg-zinc-400" : windowColor(w)}`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
      {reset && (
        <div
          className={`text-[9px] leading-3 mt-0.5 transition-colors duration-700 ${
            light ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          {reset}
        </div>
      )}
    </div>
  );
}
