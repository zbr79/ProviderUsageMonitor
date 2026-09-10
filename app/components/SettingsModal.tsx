"use client";

import { useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/app/components/toast/toast";

interface AccountRow {
  email: string;
}

type Tab = "opencode" | "cursor" | "grok";

export default function SettingsModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("opencode");
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [cursorEnabled, setCursorEnabled] = useState(true);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [cursorAccount, setCursorAccount] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [u, s, c] = await Promise.all([
      fetch("/api/usage", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/cursor", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setAccounts((u.accounts ?? []).map((a: AccountRow) => ({ email: a.email })));
    setCursorEnabled(s.settings?.cursorEnabled !== false);
    setDisplayNames(s.settings?.displayNames ?? {});
    setCursorAccount(c.usage?.accountName ?? null);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveDisplayName = async (key: string, name: string) => {
    const next = { ...displayNames, [key]: name };
    if (!name.trim()) delete next[key];
    setDisplayNames(next);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursorEnabled, displayNames: next }),
      });
      if (res.ok) {
        toastSuccess("Display name saved");
        onChanged();
      } else {
        toastError("Save failed");
      }
    } catch {
      toastError("Save failed");
    }
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, key: newKey }),
      });
      if (res.ok) {
        toastSuccess("Account added");
        setNewEmail("");
        setNewKey("");
        await refresh();
        onChanged();
      } else {
        const json = await res.json();
        toastError(json.error ?? "Add failed");
      }
    } catch {
      toastError("Add failed");
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async (email: string) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toastSuccess("Account removed");
        await refresh();
        onChanged();
      } else {
        toastError("Remove failed");
      }
    } catch {
      toastError("Remove failed");
    }
  };

  const toggleCursor = async (enabled: boolean) => {
    setCursorEnabled(enabled);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursorEnabled: enabled }),
      });
      if (res.ok) {
        toastSuccess(enabled ? "Cursor monitoring on" : "Cursor monitoring off");
        onChanged();
      } else {
        toastError("Save failed");
        setCursorEnabled(!enabled);
      }
    } catch {
      toastError("Save failed");
      setCursorEnabled(!enabled);
    }
  };

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-sm rounded-lg ${
      tab === t
        ? "bg-zinc-100 text-zinc-900"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-xl shadow-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 mb-4">
          <button className={tabClass("opencode")} onClick={() => setTab("opencode")}>
            OpenCode
          </button>
          <button className={tabClass("cursor")} onClick={() => setTab("cursor")}>
            Cursor
          </button>
          <button className={tabClass("grok")} onClick={() => setTab("grok")}>
            Grok Bot
          </button>
        </div>

        {tab === "opencode" ? (
          <div>
            <div className="space-y-2 mb-4">
              {accounts === null ? (
                <div className="text-sm text-zinc-500">Loading…</div>
              ) : accounts.length === 0 ? (
                <div className="text-sm text-zinc-500">No accounts yet.</div>
              ) : (
                accounts.map((a) => (
                  <div
                    key={a.email}
                    className="flex flex-col gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        defaultValue={displayNames[a.email] ?? ""}
                        placeholder="display name"
                        onBlur={(e) => saveDisplayName(a.email, e.target.value)}
                        className="flex-1 min-w-0 rounded bg-zinc-900 border border-zinc-600 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500"
                      />
                      <button
                        onClick={() => removeAccount(a.email)}
                        className="text-xs px-2 py-1 rounded bg-red-900/40 hover:bg-red-900 text-red-300 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{a.email}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={addAccount} className="flex flex-col gap-2">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email or label"
                required
                className="rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-..."
                required
                className="rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add account"}
              </button>
            </form>
          </div>
        ) : tab === "cursor" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3">
              <div>
                <div className="text-sm font-medium text-zinc-100">Cursor monitoring</div>
                <div className="text-xs text-zinc-400">
                  Reads usage from your local Cursor install (no keys needed)
                </div>
              </div>
              <button
                onClick={() => toggleCursor(!cursorEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  cursorEnabled ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    cursorEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <div className="text-xs text-zinc-400 mb-1">Display name</div>
              <input
                defaultValue={displayNames["cursor"] ?? ""}
                placeholder="cursor display name"
                onBlur={(e) => saveDisplayName("cursor", e.target.value)}
                className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <div className="text-xs text-zinc-400 mb-1">Nickname (display name)</div>
              <input
                defaultValue={displayNames["grok"] ?? ""}
                placeholder="grok bot nickname"
                onBlur={(e) => saveDisplayName("grok", e.target.value)}
                className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              {cursorAccount && (
                <div className="text-xs text-zinc-500 mt-1 truncate" title={cursorAccount}>
                  {cursorAccount}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}