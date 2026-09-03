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

interface ChangeInfo {
  at: number;
  detail: string;
}

const POLL_MS = 10 * 60 * 1000;
const IN_USE_WINDOW_MS = 15 * 60 * 1000;

export const dynamic = "force-dynamic";

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return "bg-red-500";
}

function resetsIn(resetsAt: string): string {
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (ms <= 0) return "resets now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `resets in ${Math.floor(h / 24)}d ${h % 24}h`;
  return `resets in ${h}h ${m}m`;
}

function isExhaustedWindow(w: UsageWindow): boolean {
  return w.percent >= 100 || w.status === "exhausted";
}

interface PeakInfo {
  active: boolean;
  endAt: number | null;
  nextStartAt: number | null;
}

function utcOf(d: Date, hour: number): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0);
}

function getPeakInfo(now: Date): PeakInfo {
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

function UsageBar({
  label,
  w,
  increased,
  dimmed,
}: {
  label: string;
  w: UsageWindow;
  increased: boolean;
  dimmed: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-zinc-600">{label}</span>
        <span
          className={
            dimmed
              ? "text-zinc-400"
              : w.percent >= 80
                ? "text-amber-600"
                : "text-zinc-500"
          }
        >
          {!dimmed && increased && (
            <span className="text-emerald-600 arrow-pop">▲ </span>
          )}
          {w.percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            dimmed ? "bg-zinc-400" : windowColor(w)
          }`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
      <div className="text-[11px] text-zinc-400 mt-1">{resetsIn(w.resetsAt)}</div>
    </div>
  );
}

export default function Home() {
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastChange = useRef<Map<string, ChangeInfo>>(new Map());
  const increaseAt = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      const accounts: AccountRow[] = json.accounts ?? [];
      const seen = new Set<string>();
      const ts = Date.now();
      for (const row of accounts) {
        seen.add(row.email);
        if (row.lastChangeAt) {
          const prev = lastChange.current.get(row.email);
          if (!prev || row.lastChangeAt >= prev.at) {
            lastChange.current.set(row.email, {
              at: row.lastChangeAt,
              detail: row.lastChangeDetail ?? "",
            });
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
      for (const email of [...lastChange.current.keys()]) {
        if (!seen.has(email)) lastChange.current.delete(email);
      }
      setRows(accounts);
    } catch {
      toastError("Failed to load usage");
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
    if (!info || Date.now() - info.at > IN_USE_WINDOW_MS) return null;
    return top.email;
  }, [sortedRows]);

  const peakInfo = useMemo(() => getPeakInfo(new Date(now)), [now]);

const copyKey = async (email: string) => {
    try {
      const res = await fetch(`/api/key?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      await navigator.clipboard.writeText(json.key);
      toastSuccess("Key copied to clipboard");
    } catch {
      toastError("Copy failed");
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 bg-[#f4f4f5]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-2xl font-bold whitespace-nowrap">OpenCode API</h1>
          {peakInfo.active && peakInfo.endAt ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-full px-2.5 py-0.5 whitespace-nowrap">
              <span className="h-1 w-1 rounded-full bg-red-500" />
              DeepSeek Peak Hour Ends in{" "}
              <span className="font-semibold">{fmtDuration(peakInfo.endAt - now)}</span>
            </span>
          ) : peakInfo.nextStartAt ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-full px-2.5 py-0.5 whitespace-nowrap">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              DeepSeek Peak Hour Starts in{" "}
              <span className="font-semibold">{fmtDuration(peakInfo.nextStartAt - now)}</span>
            </span>
          ) : null}
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          title="Refresh"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {sortedRows === null ? (
          <div className="text-zinc-500">Loading…</div>
        ) : sortedRows.length === 0 ? (
          <div className="text-zinc-500">
            No accounts yet. Add them in <code>data/accounts.json</code>.
          </div>
        ) : (
          sortedRows.map((row) => {
            const isInUse = row.email === inUseEmail;
            const cardClass = isExhausted(row)
              ? "bg-white border border-red-400 rounded-xl p-4 shadow-[0_0_12px_rgba(239,68,68,0.35)]"
              : isInUse
                ? "bg-white border border-emerald-400 rounded-xl p-4 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                : "bg-white border border-zinc-200 rounded-xl p-4 shadow-sm";
            const showInc = (win: string) => {
              const at = increaseAt.current.get(`${row.email}:${win}`);
              return !!at && Date.now() - at < 20000;
            };
            return (
              <div key={row.email} className={cardClass}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold truncate">{row.email}</span>
                  </div>
                  <button
                    onClick={() => copyKey(row.email)}
                    title="Copy key"
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
                {row.error ? (
                  <div className="text-sm text-red-500">
                    Usage unavailable — check key or try again in a few seconds.
                  </div>
                ) : row.usage ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <UsageBar
                      label="Rolling"
                      w={row.usage.rolling}
                      increased={showInc("rolling")}
                      dimmed={
                        isExhaustedWindow(row.usage.weekly) ||
                        isExhaustedWindow(row.usage.monthly)
                      }
                    />
                    <UsageBar
                      label="Weekly"
                      w={row.usage.weekly}
                      increased={showInc("weekly")}
                      dimmed={isExhaustedWindow(row.usage.monthly)}
                    />
                    <UsageBar
                      label="Monthly"
                      w={row.usage.monthly}
                      increased={showInc("monthly")}
                      dimmed={false}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}