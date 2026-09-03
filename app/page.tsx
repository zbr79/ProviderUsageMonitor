"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
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
          {!dimmed && increased && <span className="text-emerald-600">▲ </span>}
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
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const lastChange = useRef<Map<string, ChangeInfo>>(new Map());

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      const accounts: AccountRow[] = json.accounts ?? [];
      const seen = new Set<string>();
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
      }
      for (const email of [...lastChange.current.keys()]) {
        if (!seen.has(email)) lastChange.current.delete(email);
      }
      setRows(accounts);
    } catch {
      setToast("Failed to load usage");
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
      setStatus("Key copied to clipboard");
    } catch {
      setToast("Copy failed");
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">OpenCode Go Accounts</h1>
        <button
          onClick={load}
          disabled={refreshing}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {peakInfo.active && peakInfo.endAt ? (
        <div className="mb-4 text-sm bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2">
          DeepSeek V4 peak pricing is active — ends in{" "}
          <span className="font-semibold">{fmtDuration(peakInfo.endAt - now)}</span>
        </div>
      ) : peakInfo.nextStartAt ? (
        <div className="mb-4 text-sm bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-lg px-3 py-2">
          DeepSeek V4 off-peak pricing — next peak starts in{" "}
          <span className="font-semibold">{fmtDuration(peakInfo.nextStartAt - now)}</span>
        </div>
      ) : null}

      {status && (
        <div className="mb-4 text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      {toast && (
        <div
          className="fixed top-4 right-4 bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg shadow-lg z-50"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

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
            const increased = (w: UsageWindow, prev: UsageWindow | null) =>
              !!prev && !isExhaustedWindow(w) && w.percent > prev.percent;
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
                      increased={increased(row.usage.rolling, row.prev?.rolling ?? null)}
                      dimmed={
                        isExhaustedWindow(row.usage.weekly) ||
                        isExhaustedWindow(row.usage.monthly)
                      }
                    />
                    <UsageBar
                      label="Weekly"
                      w={row.usage.weekly}
                      increased={increased(row.usage.weekly, row.prev?.weekly ?? null)}
                      dimmed={isExhaustedWindow(row.usage.monthly)}
                    />
                    <UsageBar
                      label="Monthly"
                      w={row.usage.monthly}
                      increased={increased(row.usage.monthly, row.prev?.monthly ?? null)}
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