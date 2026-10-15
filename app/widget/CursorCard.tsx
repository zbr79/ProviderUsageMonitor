"use client";

import { resetFmt } from "@/lib/ranking";
import CardShell from "./CardShell";
import UsageBar from "./UsageBar";
import type { CursorUsage } from "./types";

export default function CursorCard({
  cursor,
  cursorError,
  cursorEnabled,
  light,
  cardBg,
  showProviderNames,
  displayNames,
  now,
  onDragStart,
}: {
  cursor: CursorUsage | null;
  cursorError: boolean;
  cursorEnabled: boolean;
  light: boolean;
  cardBg: string;
  showProviderNames: boolean;
  displayNames: Record<string, string>;
  now: number;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  if (!cursorEnabled) return null;
  if (!cursor) {
    return (
      <CardShell state="default" light={light} cardBg={cardBg}>
        <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
          <img src="/cursor.ico" alt="cursor" className="h-3 w-3 shrink-0 rounded-[3px]" />
          <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
            crsr
          </span>
        </div>
        <div className={`text-[10px] ${light ? "text-zinc-500" : "text-zinc-400"}`}>
          {cursorError ? "not signed in or unavailable" : "…"}
        </div>
      </CardShell>
    );
  }
  const total = cursor.totalPercentUsed ?? 0;
  const exhausted = total >= 100;
  return (
    <CardShell state={exhausted ? "exhausted" : "default"} light={light} cardBg={cardBg}>
      <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
        <img src="/cursor.ico" alt="cursor" className="h-3 w-3 shrink-0 rounded-[3px]" />
        <span
          className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}
          title={cursor.accountName ?? ""}
        >
          {showProviderNames ? "Cursor" : displayNames["cursor"] ?? cursor.accountName ?? "Cursor"}
        </span>
        {cursor.planName && (
          <span
            className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              light
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-blue-500/15 text-blue-300 border border-blue-400/30"
            }`}
          >
            {cursor.planName}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <UsageBar
          label="First Party"
          w={{ status: "ok", percent: cursor.autoPercentUsed ?? 0, resetsAt: "" }}
          dimmed={false}
          increased={false}
          light={light}
          reset={null}
        />
        <UsageBar
          label="API"
          w={{ status: "ok", percent: cursor.apiPercentUsed ?? 0, resetsAt: "" }}
          dimmed={false}
          increased={false}
          light={light}
          reset={null}
        />
      </div>
      {cursor.billingCycleEnd && (
        <div
          className={`text-[9px] leading-3 mt-1 transition-colors duration-700 ${
            light ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          Resets {resetFmt(cursor.billingCycleEnd, now)}
        </div>
      )}
    </CardShell>
  );
}
