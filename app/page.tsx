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
  error: string | null;
}

interface ChangeInfo {
  at: number;
  detail: string;
}

const POLL_MS = 5000;
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

function usageKey(u: Usage): string {
  return `${u.rolling.percent}|${u.weekly.percent}|${u.monthly.percent}`;
}

function diffText(prev: Usage, cur: Usage): string {
  const parts: string[] = [];
  const windows: [string, UsageWindow, UsageWindow][] = [
    ["rolling", prev.rolling, cur.rolling],
    ["weekly", prev.weekly, cur.weekly],
    ["monthly", prev.monthly, cur.monthly],
  ];
  for (const [name, p, c] of windows) {
    if (p.percent !== c.percent) parts.push(`${name} ${p.percent}% → ${c.percent}%`);
  }
  return parts.join(", ");
}

function agoText(ms: number): string {
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
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

function UsageBar({ label, w }: { label: string; w: UsageWindow }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-zinc-600">{label}</span>
        <span className={w.percent >= 80 ? "text-amber-600" : "text-zinc-500"}>
          {w.percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${windowColor(w)}`}
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
  const [latestChange, setLatestChange] = useState<ChangeInfo & { email: string } | null>(null);

  const prevUsage = useRef<Map<string, Usage>>(new Map());
  const lastChange = useRef<Map<string, ChangeInfo>>(new Map());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      const accounts: AccountRow[] = json.accounts ?? [];
      const now = Date.now();
      const seen = new Set<string>();
      let newest: (ChangeInfo & { email: string }) | null = null;
      for (const row of accounts) {
        seen.add(row.email);
        if (!row.usage) continue;
        const prev = prevUsage.current.get(row.email);
        if (prev && usageKey(prev) !== usageKey(row.usage)) {
          const info: ChangeInfo = { at: now, detail: diffText(prev, row.usage) };
          lastChange.current.set(row.email, info);
          if (!newest || info.at > newest.at) newest = { email: row.email, ...info };
        }
        prevUsage.current.set(row.email, row.usage);
      }
      for (const email of [...prevUsage.current.keys()]) {
        if (!seen.has(email)) {
          prevUsage.current.delete(email);
          lastChange.current.delete(email);
        }
      }
      if (newest) setLatestChange(newest);
      setRows(accounts);
    } catch {
      setStatus("Failed to load usage");
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

  const copyKey = async (email: string) => {
    try {
      const res = await fetch(`/api/key?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      await navigator.clipboard.writeText(json.key);
      setStatus("Key copied to clipboard");
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">OpenCode Go Accounts</h1>
      </div>

      {inUseEmail && latestChange && (
        <div className="mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">
          In use: <span className="font-semibold">{inUseEmail}</span> —{" "}
          {latestChange.detail} ({agoText(Date.now() - latestChange.at)})
        </div>
      )}

      {status && (
        <div className="mb-4 text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      <div className="space-y-4">
        {sortedRows === null ? (
          <div className="text-zinc-500">Loading…</div>
        ) : sortedRows.length === 0 ? (
          <div className="text-zinc-500">
            No accounts yet. Add one below (or edit <code>data/accounts.json</code>).
          </div>
        ) : (
          sortedRows.map((row) => {
            const isInUse = row.email === inUseEmail;
            const cardClass = isExhausted(row)
              ? "bg-white border border-red-400 rounded-xl p-4 shadow-[0_0_12px_rgba(239,68,68,0.35)]"
              : isInUse
                ? "bg-white border border-emerald-400 rounded-xl p-4 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                : "bg-white border border-zinc-200 rounded-xl p-4 shadow-sm";
            return (
              <div
                key={row.email}
                className={cardClass}
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{row.email}</span>
                    </div>
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
                    <UsageBar label="Rolling" w={row.usage.rolling} />
                    <UsageBar label="Weekly" w={row.usage.weekly} />
                    <UsageBar label="Monthly" w={row.usage.monthly} />
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