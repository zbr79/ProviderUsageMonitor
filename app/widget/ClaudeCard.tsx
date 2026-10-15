"use client";

import CardShell from "./CardShell";
import UsageBar from "./UsageBar";
import type { ClaudeUsage } from "./types";

export default function ClaudeCard({
  claude,
  claudeEnabled,
  light,
  cardBg,
  showProviderNames,
  displayNames,
  onDragStart,
}: {
  claude: ClaudeUsage | null;
  claudeEnabled: boolean;
  light: boolean;
  cardBg: string;
  showProviderNames: boolean;
  displayNames: Record<string, string>;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  if (!claudeEnabled) return null;
  const badge = !claude
    ? "n/a"
    : !claude.signedIn
      ? "signed out"
      : !claude.subscribed
        ? "Free"
        : claude.subscriptionType ?? "subscribed";
  const badgeClass =
    badge === "Free"
      ? light
        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
        : "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
      : badge === "n/a" || badge === "signed out"
        ? light
          ? "bg-zinc-200 text-zinc-500 border border-zinc-300"
          : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
        : light
          ? "bg-blue-100 text-blue-700 border border-blue-300"
          : "bg-blue-500/15 text-blue-300 border border-blue-400/30";

  return (
    <CardShell state="default" light={light} cardBg={cardBg}>
      <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
        <img src="/claude.ico" alt="claude" className="h-3 w-3 shrink-0 rounded-[3px]" />
        <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
          {showProviderNames ? "Claude" : displayNames["claude"] ?? "Claude"}
        </span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {(!claude || !claude.signedIn) && (
        <div className={`text-[10px] mb-1.5 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
          {!claude ? "unavailable" : "not signed in"}
        </div>
      )}
      <div className="flex gap-2">
        <UsageBar
          label="Usage"
          w={{ status: "ok", percent: 0, resetsAt: "" }}
          dimmed={!claude?.subscribed}
          increased={false}
          light={light}
          reset={null}
        />
      </div>
    </CardShell>
  );
}
