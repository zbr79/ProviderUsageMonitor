"use client";

import { useCallback, useEffect, useState } from "react";

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
  keyMasked: string;
  usage: Usage | null;
  error: string | null;
}

const POLL_MS = 5000;

function windowColor(w: UsageWindow): string {
  if (w.status === "ok") return w.percent >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return "bg-red-500";
}

function statusText(w: UsageWindow): string {
  return w.status === "ok" ? "OK" : w.status.toUpperCase();
}

function resetsIn(resetsAt: string): string {
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (ms <= 0) return "resets now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `resets in ${Math.floor(h / 24)}d ${h % 24}h`;
  return `resets in ${h}h ${m}m`;
}

function UsageBar({ label, w }: { label: string; w: UsageWindow }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="flex gap-2">
          <span className={w.percent >= 80 ? "text-amber-500" : "text-zinc-400"}>
            {w.percent}%
          </span>
          <span
            className={
              w.status === "ok"
                ? "text-emerald-500"
                : w.status === "exhausted"
                  ? "text-red-500"
                  : "text-amber-500"
            }
          >
            {statusText(w)}
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${windowColor(w)}`}
          style={{ width: `${Math.min(w.percent, 100)}%` }}
        />
      </div>
      <div className="text-[11px] text-zinc-500 mt-1">{resetsIn(w.resetsAt)}</div>
    </div>
  );
}

export default function Home() {
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newKey, setNewKey] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usageRes, activeRes] = await Promise.all([
        fetch("/api/usage", { cache: "no-store" }),
        fetch("/api/active", { cache: "no-store" }),
      ]);
      const usageJson = await usageRes.json();
      const activeJson = await activeRes.json();
      setRows(usageJson.accounts);
      setActiveEmail(activeJson.email);
    } catch {
      setStatus("Failed to load usage");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const switchTo = async (email: string) => {
    setSwitching(email);
    try {
      const res = await fetch("/api/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setActiveEmail(email);
        setStatus(`Active account switched to ${email}`);
      } else {
        setStatus("Switch failed");
      }
    } catch {
      setStatus("Switch failed");
    } finally {
      setSwitching(null);
    }
  };

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

  const remove = async (email: string) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus(`Removed ${email}`);
        load();
      } else {
        setStatus("Remove failed");
      }
    } catch {
      setStatus("Remove failed");
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, key: newKey }),
      });
      if (res.ok) {
        setStatus("Account added");
        setNewEmail("");
        setNewKey("");
        load();
      } else {
        const json = await res.json();
        setStatus(json.error ?? "Add failed");
      }
    } catch {
      setStatus("Add failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">OpenCode Go Accounts</h1>
          <p className="text-sm text-zinc-500">
            Live usage for {rows?.length ?? "..."} account{rows?.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-xs text-zinc-500">updates every 5s</span>
      </div>

      {status && (
        <div className="mb-4 text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      <div className="space-y-4">
        {rows === null ? (
          <div className="text-zinc-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-zinc-500">
            No accounts yet. Add one below (or edit <code>data/accounts.json</code>).
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.email}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{row.email}</span>
                    {activeEmail === row.email && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">{row.keyMasked}</div>
                </div>
                <div className="flex gap-2">
                  {activeEmail !== row.email && (
                    <button
                      onClick={() => switchTo(row.email)}
                      disabled={switching === row.email}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {switching === row.email ? "Switching…" : "Use this account"}
                    </button>
                  )}
                  <button
                    onClick={() => copyKey(row.email)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                  >
                    Copy key
                  </button>
                  <button
                    onClick={() => remove(row.email)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900 text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {row.error ? (
                <div className="text-sm text-red-400">
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
          ))
        )}
      </div>

      <form
        onSubmit={add}
        className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4"
      >
        <h2 className="font-semibold mb-3">Add account</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email or label"
            required
            className="flex-1 min-w-40 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
          />
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="sk-..."
            required
            className="flex-1 min-w-40 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </main>
  );
}