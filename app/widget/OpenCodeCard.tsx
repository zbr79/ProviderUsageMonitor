"use client";

import type { PeakInfo } from "@/lib/ranking";
import { fmtDuration, isExhausted, isExhaustedWindow, resetFmt } from "@/lib/ranking";
import { WIDGET_TYPE_SCALE } from "@/lib/theme";
import CardShell from "./CardShell";
import UsageBar from "./UsageBar";
import type { AccountRow } from "./types";

export default function OpenCodeCard({
  row,
  isInUse,
  withControls,
  light,
  showProviderNames,
  displayNames,
  deepseekPeakHourWarning,
  peakInfo,
  now,
  increaseAt,
  onDragStart,
  onCopyKey,
}: {
  row: AccountRow;
  isInUse: boolean;
  withControls: boolean;
  light: boolean;
  cardBg?: string;
  showProviderNames: boolean;
  displayNames: Record<string, string>;
  deepseekPeakHourWarning: boolean;
  peakInfo: PeakInfo;
  now: number;
  increaseAt: Map<string, number>;
  onDragStart: (e: React.MouseEvent) => void;
  onCopyKey: (email: string) => void;
}) {
  const disabled = row.enabled === false;
  const exhausted = isExhausted(row);
  const state = disabled ? "disabled" : exhausted ? "exhausted" : isInUse ? "inUse" : "default";
  const showInc = (win: string) => {
    const at = increaseAt.get(`${row.email}:${win}`);
    return !!at && now - at < 20_000;
  };

  return (
    <CardShell state={state} light={light}>
      <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
        <button
          onClick={() => onCopyKey(row.email)}
          title="Copy key"
          className="shrink-0 rounded-[3px] p-0.5 hover:bg-role-surface transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <img src="/opencode.ico" alt="copy key" className="h-3 w-3 rounded-[3px]" />
        </button>
        <span className={`${WIDGET_TYPE_SCALE.title} truncate font-medium text-role-text`}>
          {showProviderNames ? "OpenCode" : displayNames[row.email] ?? row.email.slice(0, 4)}
        </span>
        {deepseekPeakHourWarning && withControls && peakInfo.active && peakInfo.endAt ? (
          <span className={`${WIDGET_TYPE_SCALE.caption} font-medium whitespace-nowrap text-role-danger`}>
            Peak Ends in {fmtDuration(peakInfo.endAt - now)}
          </span>
        ) : deepseekPeakHourWarning && withControls && peakInfo.nextStartAt ? (
          <span className={`${WIDGET_TYPE_SCALE.caption} font-medium whitespace-nowrap text-role-success`}>
            Peak Starts in {fmtDuration(peakInfo.nextStartAt - now)}
          </span>
        ) : null}
        <span
          className={`ml-auto ${WIDGET_TYPE_SCALE.caption} font-semibold px-1.5 py-0.5 rounded-full border role-badge-blue`}
        >
          Go
        </span>
      </div>
      {row.error ? (
        <div className={`${WIDGET_TYPE_SCALE.body} text-role-danger`}>unavailable</div>
      ) : row.usage ? (
        <div className="flex gap-2">
          <UsageBar
            label="R"
            w={row.usage.rolling}
            dimmed={
              isExhaustedWindow(row.usage.weekly) ||
              isExhaustedWindow(row.usage.monthly)
            }
            increased={showInc("rolling")}
            reset={withControls ? resetFmt(row.usage.rolling.resetsAt, now) : null}
          />
          <UsageBar
            label="W"
            w={row.usage.weekly}
            dimmed={isExhaustedWindow(row.usage.monthly)}
            increased={showInc("weekly")}
            reset={withControls ? resetFmt(row.usage.weekly.resetsAt, now) : null}
          />
          <UsageBar
            label="M"
            w={row.usage.monthly}
            dimmed={false}
            increased={showInc("monthly")}
            reset={resetFmt(row.usage.monthly.resetsAt, now)}
          />
        </div>
      ) : null}
    </CardShell>
  );
}
