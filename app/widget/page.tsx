"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess } from "@/app/components/toast/toast";
import { apiFetch } from "@/lib/api-fetch";
import { usageWidget } from "@/lib/desktop-bridge";
import {
  fmtDuration,
  getPeakInfo,
  isExhausted,
  isExhaustedWindow,
  resetFmt,
  sortAccounts,
} from "@/lib/ranking";

interface UsageWindow {
  status: string;
  percent: number;
  resetsAt: string;
}

interface Usage {
  rolling: UsageWindow;
  weekly: UsageWindow;
  monthly: UsageWindow;
}

interface AccountRow {
  email: string;
  usage: Usage | null;
  prev: Usage | null;
  enabled: boolean;
  error: string | null;
  lastChangeAt: number | null;
  lastChangeDetail: string | null;
}

interface CursorUsage {
  autoPercentUsed: number | null;
  apiPercentUsed: number | null;
  totalPercentUsed: number | null;
  billingCycleEnd: string | null;
  accountName: string | null;
  planName: string | null;
  grokPercentUsed: number | null;
  grokResetAt: string | null;
}

interface CodexUsage {
  email: string | null;
  planType: string | null;
  usedPercent: number | null;
  limitWindowSeconds: number | null;
  resetAt: string | null;
  creditsBalance: number | null;
  limitReached: boolean;
}

interface ClaudeUsage {
  email: string | null;
  displayName: string | null;
  signedIn: boolean;
  subscribed: boolean;
  subscriptionType: string | null;
  billingType: string | null;
  rateLimitTier: string | null;
  orgUuid: string | null;
}

const POLL_MS = 60_000;

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return "bg-red-400";
}

function fmtPct(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (r > 99 && r < 100) return r.toFixed(1);
  return String(Math.round(r));
}

function MiniBar({
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
    <div className={`flex-1 min-w-0 transition-colors duration-700`}>
      <div className="flex justify-between text-[10px] leading-3 mb-0.5">
        <span className={`transition-colors duration-700 ${light ? "text-zinc-600" : "text-zinc-200"}`}>{label}</span>
        <span className={`transition-colors duration-700 ${dimmed ? "text-zinc-400" : light ? "text-zinc-800" : "text-zinc-100"}`}>
          {!dimmed && increased && (
            <span className={`arrow-pop transition-colors duration-700 ${light ? "text-emerald-600" : "text-emerald-300"}`}>
              ▲{" "}
            </span>
          )}
          {fmtPct(w.percent)}%
        </span>
      </div>
      <div className={`h-1 rounded-full overflow-hidden transition-colors duration-700 ${light ? "bg-zinc-300/70" : "bg-white/15"}`}>
        <div
          className={`h-full rounded-full ${dimmed ? "bg-zinc-400" : windowColor(w)}`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
      {reset && (
        <div className={`text-[9px] leading-3 mt-0.5 transition-colors duration-700 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
          {reset}
        </div>
      )}
    </div>
  );
}

export default function Widget() {
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const [bgBright, setBgBright] = useState<number | null>(null);
  const [cursor, setCursor] = useState<CursorUsage | null>(null);
  const [cursorError, setCursorError] = useState(false);
  const [cursorEnabled, setCursorEnabled] = useState(true);
  const [grokEnabled, setGrokEnabled] = useState(true);
  const [codexEnabled, setCodexEnabled] = useState(true);
  const [codex, setCodex] = useState<CodexUsage | null>(null);
  const [claudeEnabled, setClaudeEnabled] = useState(true);
  const [claude, setClaude] = useState<ClaudeUsage | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [showProviderNames, setShowProviderNames] = useState(false);
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");
  const [changedAt, setChangedAt] = useState<Map<string, number>>(() => new Map());
  const [increaseAt, setIncreaseAt] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    const off = usageWidget()?.onBg?.((v: number) => {
      setBgBright((prev) => {
        const bright = v >= 0.45;
        const dark = v < 0.3;
        const wouldBeLight = prev !== null && prev < 0.5;
        const shouldSwitch =
          (dark && !wouldBeLight) ||
          (bright && wouldBeLight) ||
          prev === null;
        return shouldSwitch ? v : prev;
      });
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    const off = usageWidget()?.onToggleExpand?.(() => setExpanded((e) => !e));
    return () => off?.();
  }, []);

  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      usageWidget()?.showMenu?.();
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const widget = usageWidget();
    widget?.startDrag?.(e.screenX, e.screenY);
    const move = (ev: MouseEvent) => widget?.moveDrag?.(ev.screenX, ev.screenY);
    const up = () => {
      widget?.endDrag?.();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const light =
    themeMode === "light"
      ? true
      : themeMode === "dark"
        ? false
        : bgBright !== null && bgBright < 0.5;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const h = document.body?.scrollHeight ?? 0;
      if (h > 0) usageWidget()?.resize?.(238, h + 6);
    }, 80);
    return () => clearTimeout(t);
  }, [expanded, rows, cursor]);

  const load = useCallback(async () => {
    try {
      const settingsRes = await apiFetch("/api/settings", { cache: "no-store" });
      const sjson = await settingsRes.json();
      const nextCursorEnabled = sjson.settings?.cursorEnabled !== false;
      const nextGrokEnabled = sjson.settings?.grokEnabled !== false;
      const nextCodexEnabled = sjson.settings?.codexEnabled !== false;
      const nextClaudeEnabled = sjson.settings?.claudeEnabled !== false;
      setCodexEnabled(nextCodexEnabled);
      setClaudeEnabled(nextClaudeEnabled);
      setCursorEnabled(nextCursorEnabled);
      setGrokEnabled(nextGrokEnabled);
      setDisplayNames(sjson.settings?.displayNames ?? {});
      setShowProviderNames(sjson.settings?.showProviderNames === true);
      setThemeMode(sjson.settings?.themeMode ?? "auto");

      const [usageRes, cursorRes, codexRes, claudeRes] = await Promise.all([
        apiFetch("/api/usage", { cache: "no-store" }),
        nextCursorEnabled || nextGrokEnabled
          ? apiFetch("/api/cursor", { cache: "no-store" })
          : Promise.resolve(null),
        nextCodexEnabled ? apiFetch("/api/codex", { cache: "no-store" }) : Promise.resolve(null),
        nextClaudeEnabled ? apiFetch("/api/claude", { cache: "no-store" }) : Promise.resolve(null),
      ]);
      const json = await usageRes.json();
      if (!cursorRes) {
        setCursor(null);
        setCursorError(false);
      } else {
        const cjson = await cursorRes.json();
        setCursorError(!!cjson.error);
        setCursor(cjson.usage ?? null);
      }
      if (!codexRes) setCodex(null);
      else setCodex((await codexRes.json()).usage ?? null);
      if (!claudeRes) setClaude(null);
      else setClaude((await claudeRes.json()).usage ?? null);
      const accounts: AccountRow[] = json.accounts ?? [];
      const ts = Date.now();
      setChangedAt((prev) => {
        let next = prev;
        for (const row of accounts) {
          if (row.lastChangeAt == null) continue;
          const existing = next.get(row.email);
          if (existing != null && row.lastChangeAt < existing) continue;
          if (next === prev) next = new Map(prev);
          next.set(row.email, row.lastChangeAt);
        }
        return next;
      });
      setIncreaseAt((prev) => {
        let next = prev;
        for (const row of accounts) {
          if (!row.usage || !row.prev) continue;
          for (const win of ["rolling", "weekly", "monthly"] as const) {
            const key = `${row.email}:${win}`;
            const cur = row.usage[win];
            const previous = row.prev[win];
            const rising = !isExhaustedWindow(cur) && cur.percent > previous.percent;
            if (rising) {
              if (next.has(key)) continue;
              if (next === prev) next = new Map(prev);
              next.set(key, ts);
            } else if (next.has(key)) {
              if (next === prev) next = new Map(prev);
              next.delete(key);
            }
          }
        }
        return next;
      });
      setRows(accounts);
    } catch {
      // widget stays silent on transient errors
    }
  }, []);

  useEffect(() => {
    // Poll provider usage after mount. The fetch updates state when it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load on mount
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const off = usageWidget()?.onSettingsChanged?.(() => load());
    return () => off?.();
  }, [load]);

  const sortedRows = useMemo(() => {
    if (!rows) return null;
    return sortAccounts(rows, (r) => changedAt.get(r.email) ?? 0);
  }, [rows, changedAt]);

  const activeRow = sortedRows?.[0] ?? null;

  const copyKey = async (email: string) => {
    try {
      const res = await apiFetch(`/api/key?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        toastError("Copy failed");
        return;
      }
      const json = await res.json();
      if (typeof json.key !== "string" || !json.key) {
        toastError("Copy failed");
        return;
      }
      await navigator.clipboard.writeText(json.key);
      toastSuccess("Key copied");
    } catch {
      toastError("Copy failed");
    }
  };

  const renderCard = (row: AccountRow, withControls: boolean) => {
    const disabled = row.enabled === false;
    const isInUse = !disabled && sortedRows?.[0]?.email === row.email;
    const exhausted = isExhausted(row);
    const showInc = (win: string) => {
      const at = increaseAt.get(`${row.email}:${win}`);
      return !!at && Date.now() - at < 20000;
    };
    return (
      <div
        key={row.email}
        className={`rounded-lg p-2 transition-colors duration-700 ${
          light ? "bg-zinc-200" : "bg-zinc-900"
        } ${
          disabled
            ? `${light ? "border border-zinc-300/70" : "border border-white/10"} opacity-55`
            : exhausted
              ? light
                ? "border border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
                : "border border-red-400/70 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
              : isInUse
                ? light
                  ? "border border-emerald-500/80 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
                  : "border border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
                : light
                  ? "border border-zinc-400/50"
                  : "border border-white/15"
        }`}
      >
        <div
          className="flex items-center gap-1.5 mb-1.5 cursor-move"
          onMouseDown={onDragStart}
        >
          <button
            onClick={() => copyKey(row.email)}
            title="Copy key"
            className="shrink-0 rounded-[3px] p-0.5 hover:bg-white/10 transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <img
              src="/opencode.ico"
              alt="copy key"
              className="h-3 w-3 rounded-[3px]"
            />
          </button>
          <span className={`text-[11px] truncate font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
            {showProviderNames ? "OpenCode" : displayNames[row.email] ?? row.email.slice(0, 4)}
          </span>
          {withControls && peakInfo.active && peakInfo.endAt ? (
            <span className={`text-[9px] font-medium whitespace-nowrap ${light ? "text-red-600" : "text-red-300"}`}>
              Peak Ends in {fmtDuration(peakInfo.endAt - now)}
            </span>
          ) : withControls && peakInfo.nextStartAt ? (
            <span className={`text-[9px] font-medium whitespace-nowrap ${light ? "text-emerald-600" : "text-emerald-300"}`}>
              Peak Starts in {fmtDuration(peakInfo.nextStartAt - now)}
            </span>
          ) : null}
          <span
            className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              light
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-blue-500/15 text-blue-300 border border-blue-400/30"
            }`}
          >
            Go
          </span>
        </div>
        {row.error ? (
          <div className="text-[10px] text-red-400">unavailable</div>
        ) : row.usage ? (
          <div className="flex gap-2">
            <MiniBar
              label="R"
              w={row.usage.rolling}
              dimmed={
                isExhaustedWindow(row.usage.weekly) ||
                isExhaustedWindow(row.usage.monthly)
              }
              increased={showInc("rolling")}
              light={light}
              reset={withControls ? resetFmt(row.usage.rolling.resetsAt) : null}
            />
            <MiniBar
              label="W"
              w={row.usage.weekly}
              dimmed={isExhaustedWindow(row.usage.monthly)}
              increased={showInc("weekly")}
              light={light}
              reset={withControls ? resetFmt(row.usage.weekly.resetsAt) : null}
            />
            <MiniBar
              label="M"
              w={row.usage.monthly}
              dimmed={false}
              increased={showInc("monthly")}
              light={light}
              reset={resetFmt(row.usage.monthly.resetsAt)}
            />
          </div>
        ) : null}
      </div>
    );
  };

  const renderCursorCard = () => {
    if (!cursorEnabled) return null;
    if (!cursor) {
      const cardClass = `rounded-lg p-2 transition-colors duration-700 ${
        light ? "bg-zinc-200" : "bg-zinc-900"
      } ${light ? "border border-zinc-400/50" : "border border-white/15"}`;
      return (
        <div className={cardClass}>
          <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
            <img
              src="/cursor.ico"
              alt="cursor"
              className="h-3 w-3 shrink-0 rounded-[3px]"
            />
            <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
              crsr
            </span>
          </div>
          <div className={`text-[10px] ${light ? "text-zinc-500" : "text-zinc-400"}`}>
            {cursorError ? "not signed in or unavailable" : "…"}
          </div>
        </div>
      );
    }
    const total = cursor.totalPercentUsed ?? 0;
    const exhausted = total >= 100;
    const cardClass = `rounded-lg p-2 transition-colors duration-700 ${
      light ? "bg-zinc-200" : "bg-zinc-900"
    } ${
      exhausted
        ? light
          ? "border border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border border-red-400/70 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
        : light
          ? "border border-zinc-400/50"
          : "border border-white/15"
    }`;
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-1.5 mb-1.5 cursor-move" onMouseDown={onDragStart}>
          <img
            src="/cursor.ico"
            alt="cursor"
            className="h-3 w-3 shrink-0 rounded-[3px]"
          />
          <span
            className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}
            title={cursor?.accountName ?? ""}
          >
            {showProviderNames ? "Cursor" : displayNames["cursor"] ?? cursor?.accountName ?? "crsr"}
          </span>
          {cursor?.planName && (
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
        {cursor ? (
          <>
            <div className="flex gap-2">
              <MiniBar
                label="First Party"
                w={{ status: "ok", percent: cursor.autoPercentUsed ?? 0, resetsAt: "" }}
                dimmed={false}
                increased={false}
                light={light}
                reset={null}
              />
              <MiniBar
                label="API"
                w={{ status: "ok", percent: cursor.apiPercentUsed ?? 0, resetsAt: "" }}
                dimmed={false}
                increased={false}
                light={light}
                reset={null}
              />
            </div>
            {cursor.billingCycleEnd && (
              <div className={`text-[9px] leading-3 mt-1 transition-colors duration-700 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
                Resets {resetFmt(cursor.billingCycleEnd)}
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-zinc-400">unavailable</div>
        )}
      </div>
    );
  };

  const renderGrokCard = () => {
    if (!grokEnabled) return null;
    if (cursor?.grokPercentUsed == null) return null;
    const pct = cursor.grokPercentUsed;
    const exhausted = pct >= 100;
    const cardClass = `rounded-lg p-2 transition-colors duration-700 ${
      light ? "bg-zinc-200" : "bg-zinc-900"
    } ${
      exhausted
        ? light
          ? "border border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border border-red-400/70 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
        : light
          ? "border border-zinc-400/50"
          : "border border-white/15"
    }`;
    return (
      <div className={cardClass}>
        <div
          className="flex items-center gap-1.5 mb-1.5 cursor-move"
          onMouseDown={onDragStart}
        >
          <img
            src="/grokbot.ico"
            alt="grok bot"
            className="h-3 w-3 shrink-0 rounded-[3px]"
          />
          <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
            {showProviderNames ? "Grok Bot" : displayNames["grok"] ?? "Grok Bot"}
          </span>
          {cursor?.planName && (
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
          <MiniBar
            label="Usage"
            w={{ status: "ok", percent: pct, resetsAt: "" }}
            dimmed={false}
            increased={false}
            light={light}
            reset={null}
          />
        </div>
        {cursor.grokResetAt && (
          <div className={`text-[9px] leading-3 mt-1 transition-colors duration-700 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
            Resets {resetFmt(cursor.grokResetAt)}
          </div>
        )}
      </div>
    );
  };

  const renderCodexCard = () => {
    if (!codexEnabled) return null;
    const pct = codex?.usedPercent ?? 0;
    const exhausted = codex?.limitReached === true || pct >= 100;
    const cardClass = `rounded-lg p-2 transition-colors duration-700 ${
      light ? "bg-zinc-200" : "bg-zinc-900"
    } ${
      exhausted
        ? light
          ? "border border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border border-red-400/70 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
        : light
          ? "border border-zinc-400/50"
          : "border border-white/15"
    }`;
    return (
      <div className={cardClass}>
        <div
          className="flex items-center gap-1.5 mb-1.5 cursor-move"
          onMouseDown={onDragStart}
        >
          <img
            src="/openai.png"
            alt="codex"
            className={`h-3 w-3 shrink-0 ${light ? "invert" : ""}`}
          />
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
              <MiniBar
                label="Usage"
                w={{ status: "ok", percent: pct, resetsAt: "" }}
                dimmed={false}
                increased={false}
                light={light}
                reset={null}
              />
            </div>
            {codex.resetAt && (
              <div className={`text-[9px] leading-3 mt-1 transition-colors duration-700 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
                Resets {resetFmt(codex.resetAt)}
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-zinc-400">not signed in or unavailable</div>
        )}
      </div>
    );
  };

  const renderClaudeCard = () => {
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
    const cardClass = `rounded-lg p-2 transition-colors duration-700 ${
      light ? "bg-zinc-200" : "bg-zinc-900"
    } ${light ? "border border-zinc-400/50" : "border border-white/15"}`;
    return (
      <div className={cardClass}>
        <div
          className="flex items-center gap-1.5 mb-1.5 cursor-move"
          onMouseDown={onDragStart}
        >
          <img
            src="/claude.ico"
            alt="claude"
            className="h-3 w-3 shrink-0 rounded-[3px]"
          />
          <span className={`text-[11px] truncate flex-1 font-medium ${light ? "text-zinc-800" : "text-zinc-100"}`}>
            {showProviderNames ? "Claude" : displayNames["claude"] ?? "Claude"}
          </span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        </div>
        <div className={`text-[10px] ${light ? "text-zinc-500" : "text-zinc-400"}`}>
          {!claude
            ? "unavailable"
            : !claude.signedIn
              ? "not signed in"
              : claude.email ?? "signed in"}
        </div>
      </div>
    );
  };

  const peakInfo = getPeakInfo(new Date(now));

  return (
    <div className="w-screen p-1.5 select-none">
      <div
        className={
          expanded
            ? "space-y-1.5"
            : ""
        }
      >
          {rows === null ? (
            <div className={`text-[11px] px-1 py-2 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
              Loading…
            </div>
          ) : expanded ? (
            <>
              {sortedRows?.map((row, i) => renderCard(row, i === 0))}
              {renderCursorCard()}
              {renderGrokCard()}
              {renderCodexCard()}
              {renderClaudeCard()}
            </>
          ) : (
            <>
              {activeRow ? renderCard(activeRow, true) : null}
              {renderCursorCard()}
              {renderGrokCard()}
              {renderCodexCard()}
              {renderClaudeCard()}
            </>
          )}
      </div>
    </div>
  );
}