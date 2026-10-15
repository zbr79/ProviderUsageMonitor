"use client";

import Checkbox from "@/app/components/ui/Checkbox";
import type { PanelTheme, ThemeMode } from "@/lib/settings";

export default function GeneralTab({
  panelTheme,
  themeMode,
  showProviderNames,
  deepseekPeakHourWarning,
  onSetPanel,
  onSetTheme,
  onToggleProviderNames,
  onToggleDeepseekPeakHourWarning,
}: {
  panelTheme: PanelTheme;
  themeMode: ThemeMode;
  showProviderNames: boolean;
  deepseekPeakHourWarning: boolean;
  onSetPanel: (theme: PanelTheme) => void;
  onSetTheme: (mode: ThemeMode) => void;
  onToggleProviderNames: (enabled: boolean) => void;
  onToggleDeepseekPeakHourWarning: (enabled: boolean) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5 space-y-2">
      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3">
        <div>
          <div className="text-sm font-medium text-zinc-200">Panel theme</div>
          <div className="text-xs text-zinc-500">Appearance of this settings panel</div>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 shrink-0">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onSetPanel(t)}
              className={`px-2.5 py-1 text-xs capitalize transition-colors ${
                panelTheme === t
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3">
        <div>
          <div className="text-sm font-medium text-zinc-200">Widget theme</div>
          <div className="text-xs text-zinc-500">
            Auto follows screen brightness (uses CPU); Light/Dark are static
          </div>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 shrink-0">
          {(["auto", "light", "white", "dark"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSetTheme(m)}
              className={`px-2.5 py-1 text-xs capitalize transition-colors ${
                themeMode === m
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3">
        <div>
          <div className="text-sm font-medium text-zinc-200">Show provider names</div>
          <div className="text-xs text-zinc-500">
            Display provider names on widget cards instead of nicknames
          </div>
        </div>
        <Checkbox checked={showProviderNames} onChange={onToggleProviderNames} />
      </div>

      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3">
        <div>
          <div className="text-sm font-medium text-zinc-200">DeepSeek Peak Hour Warning</div>
          <div className="text-xs text-zinc-500">
            Show peak-hour start/end countdowns on the OpenCode card
          </div>
        </div>
        <Checkbox
          checked={deepseekPeakHourWarning}
          onChange={onToggleDeepseekPeakHourWarning}
          ariaLabel="Toggle DeepSeek Peak Hour Warning"
        />
      </div>
    </div>
  );
}
