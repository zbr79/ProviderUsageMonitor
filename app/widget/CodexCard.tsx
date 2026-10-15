"use client";

import { resetFmt } from "@/lib/ranking";
import CardShell from "./CardShell";
import UsageBar from "./UsageBar";
import type { CodexUsage } from "./types";

export default function CodexCard({
  codex,
  codexEnabled,
  light,
  cardBg,
  showProviderNames,
  displayNames,
  now,
  onDragStart,
}: {
  codex: CodexUsage | null;
  codexEnabled: boolean;
  light: boolean;
  cardBg: string;
  showProviderNames: boolean;
  displayNames: Record<string, string>;
  now: number;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  if (!codexEnabled) return null;
  const pct = codex?.usedPercent ?? 0;
  const exhausted = codex?.limitReached === true || pct >= 100;
  return (
    <CardShell state={exhausted ? "exhausted" : "default"} light={light} cardBg={cardBg}>
      <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
        <img src="/openai.png" alt="codex" className={`h-3 w-3 shrink-0 ${light ? "invert" : ""}`} />
        <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
          {showProviderNames ? "Codex" : displayNames["codex"] ?? "Codex"}
        </span>
        {codex?.planType && (
          <span
            className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              codex.planType.toLowerCase() === "free"
                ? light
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                : light
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-blue-500/15 text-blue-300 border border-blue-400/30"
            }`}
          >
            {codex.planType.charAt(0).toUpperCase() + codex.planType.slice(1)}
          </span>
        )}
      </div>
      {codex ? (
        <>
          <div className="flex gap-2">
            <UsageBar
              label="Usage"
              w={{ status: "ok", percent: pct, resetsAt: "" }}
              dimmed={false}
              increased={false}
              light={light}
              reset={null}
            />
          </div>
          {codex.resetAt && (
            <div
              className={`text-[9px] leading-3 mt-1 transition-colors duration-700 ${
                light ? "text-zinc-500" : "text-zinc-400"
              }`}
            >
              Resets {resetFmt(codex.resetAt, now)}
            </div>
          )}
        </>
      ) : (
        <div className="text-[10px] text-zinc-400">not signed in or unavailable</div>
      )}
    </CardShell>
  );
}
