"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/app/components/toast/toast";

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
  error: string | null;
  lastChangeAt: number | null;
  lastChangeDetail: string | null;
}

const POLL_MS = 60_000;

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return "bg-red-400";
}

function isExhaustedWindow(w: UsageWindow): boolean {
  return w.percent >= 100 || w.status === "exhausted";
}

function isExhausted(r: AccountRow): boolean {
  return (
    !!r.usage &&
    (isExhaustedWindow(r.usage.monthly) || isExhaustedWindow(r.usage.weekly))
  );
}

function earliestReset(r: AccountRow): number {
  const u = r.usage;
  if (!u) return 0;
  const times: number[] = [];
  if (isExhaustedWindow(u.monthly)) times.push(new Date(u.monthly.resetsAt).getTime());
  if (isExhaustedWindow(u.weekly)) times.push(new Date(u.weekly.resetsAt).getTime());
  return times.length ? Math.min(...times) : 0;
}

function resetsIn(resetsAt: string): string {
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function utcOf(d: Date, hour: number): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0);
}

function getPeakInfo(now: Date): { active: boolean; endAt: number | null; nextStartAt: number | null } {
  const h = now.getUTCHours();
  const day = now.getUTCDay();
  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday) {
    if (h >= 1 && h < 4) return { active: true, endAt: utcOf(now, 4), nextStartAt: null };
    if (h >= 6 && h < 10) return { active: true, endAt: utcOf(now, 10), nextStartAt: null };
  }

  const candidates: number[] = [];
  if (isWeekday) {
    if (h < 1) candidates.push(utcOf(now, 1));
    if (h >= 4 && h < 6) candidates.push(utcOf(now, 6));
  }
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) {
      candidates.push(utcOf(d, 1));
      break;
    }
  }
  const next = candidates
    .filter((c) => c > now.getTime())
    .sort((a, b) => a - b)[0] ?? null;
  return { active: false, endAt: null, nextStartAt: next };
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}h ${rem}m`;
  return `${rem}m`;
}

function MiniBar({
  label,
  w,
  dimmed,
  increased,
}: {
  label: string;
  w: UsageWindow;
  dimmed: boolean;
  increased: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[10px] leading-3 mb-0.5">
        <span className="text-zinc-300">{label}</span>
        <span className={dimmed ? "text-zinc-500" : "text-zinc-400"}>
          {!dimmed && increased && <span className="text-emerald-300 arrow-pop">▲ </span>}
          {w.percent}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${dimmed ? "bg-zinc-500" : windowColor(w)}`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function Widget() {
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastChange = useRef<Map<string, { at: number }>>(new Map());
  const increaseAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (window as any).widget?.resize(expanded ? 99999 : 115);
  }, [expanded]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      const accounts: AccountRow[] = json.accounts ?? [];
      const ts = Date.now();
      for (const row of accounts) {
        if (row.lastChangeAt) {
          const prev = lastChange.current.get(row.email);
          if (!prev || row.lastChangeAt >= prev.at) {
            lastChange.current.set(row.email, { at: row.lastChangeAt });
          }
        }
        if (row.usage && row.prev) {
          for (const win of ["rolling", "weekly", "monthly"] as const) {
            const key = `${row.email}:${win}`;
            const cur = row.usage[win];
            const prev = row.prev[win];
            if (!isExhaustedWindow(cur) && cur.percent > prev.percent) {
              if (!increaseAt.current.has(key)) increaseAt.current.set(key, ts);
            } else {
              increaseAt.current.delete(key);
            }
          }
        }
      }
      setRows(accounts);
    } catch {
      // widget stays silent on transient errors
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const sortedRows = useMemo(() => {
    if (!rows) return null;
    const lastChanged = (r: AccountRow) => lastChange.current.get(r.email)?.at ?? 0;
    return [...rows].sort((a, b) => {
      const ea = isExhausted(a);
      const eb = isExhausted(b);
      if (ea !== eb) return ea ? 1 : -1;
      if (ea) return earliestReset(a) - earliestReset(b);
      return lastChanged(b) - lastChanged(a);
    });
  }, [rows]);

  const inUseEmail = useMemo(() => {
    const top = sortedRows?.[0];
    if (!top) return null;
    const info = lastChange.current.get(top.email);
    if (!info || Date.now() - info.at > 15 * 60 * 1000) return null;
    return top.email;
  }, [sortedRows]);

  const activeRow = sortedRows?.[0] ?? null;

  const copyKey = async (email: string) => {
    try {
      const res = await fetch(`/api/key?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      await navigator.clipboard.writeText(json.key);
      toastSuccess("Key copied");
    } catch {
      toastError("Copy failed");
    }
  };

  const controls = (
    <div className="ml-auto flex items-center gap-0.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "Collapse" : "Expand"}
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
      >
        {expanded ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m7 20 5-5 5 5" />
            <path d="m7 4 5 5 5-5" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        )}
      </button>
      <button
        onClick={load}
        title="Refresh"
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
      <button
        onClick={() => (window as any).widget?.close()}
        title="Close"
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );

  const renderCard = (row: AccountRow, withControls: boolean) => {
    const isInUse = row.email === inUseEmail;
    const exhausted = isExhausted(row);
    const showInc = (win: string) => {
      const at = increaseAt.current.get(`${row.email}:${win}`);
      return !!at && Date.now() - at < 20000;
    };
    return (
      <div
        key={row.email}
        className={`rounded-lg p-2 ${
          exhausted
            ? "bg-red-500/5 border border-red-400/40"
            : isInUse
              ? "bg-white/5 border border-emerald-400/40"
              : "bg-white/5 border border-white/10"
        }`}
      >
        <div
          className="flex items-center gap-1.5 mb-1.5"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <button
            onClick={() => copyKey(row.email)}
            title="Copy key"
            className="p-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors shrink-0"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
          <span className="text-[11px] text-zinc-200 truncate font-medium">
            {row.email}
            {exhausted ? " · exhausted" : ""}
          </span>
          {peakInfo.active && peakInfo.endAt ? (
            <span className="text-[9px] font-medium text-red-300 whitespace-nowrap">
              Peak Ends in {fmtDuration(peakInfo.endAt - now)}
            </span>
          ) : peakInfo.nextStartAt ? (
            <span className="text-[9px] font-medium text-emerald-300 whitespace-nowrap">
              Peak Starts in {fmtDuration(peakInfo.nextStartAt - now)}
            </span>
          ) : null}
          {withControls && controls}
        </div>
        {row.error ? (
          <div className="text-[10px] text-red-400">unavailable</div>
        ) : row.usage ? (
          <div className="flex gap-2">
            <MiniBar
              label="Rolling"
              w={row.usage.rolling}
              dimmed={
                isExhaustedWindow(row.usage.weekly) ||
                isExhaustedWindow(row.usage.monthly)
              }
              increased={showInc("rolling")}
            />
            <MiniBar
              label="Weekly"
              w={row.usage.weekly}
              dimmed={isExhaustedWindow(row.usage.monthly)}
              increased={showInc("weekly")}
            />
            <MiniBar
              label="Monthly"
              w={row.usage.monthly}
              dimmed={false}
              increased={showInc("monthly")}
            />
          </div>
        ) : null}
      </div>
    );
  };

  const peakInfo = useMemo(() => getPeakInfo(new Date(now)), [now]);

  return (
    <div className="w-screen p-1.5 select-none">
      <div
      className={`flex flex-col rounded-xl bg-black/85 backdrop-blur-md border border-white/10 overflow-hidden ${
        expanded ? "h-full" : ""
      }`}
    >
        <div
          className={
            expanded
              ? "flex-1 overflow-y-auto p-1.5 space-y-1.5"
              : "p-1.5"
          }
        >
          {activeRow === null ? (
            <div className="text-[11px] text-zinc-500 px-1 py-2">Loading…</div>
          ) : expanded ? (
            sortedRows?.map((row, i) => renderCard(row, i === 0))
          ) : (
            renderCard(activeRow, true)
          )}
        </div>
      </div>
    </div>
  );
}