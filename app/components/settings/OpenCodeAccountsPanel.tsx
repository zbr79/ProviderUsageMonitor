"use client";

import Button from "@/app/components/ui/Button";
import Field from "@/app/components/ui/Field";
import IconButton, { GearIcon, TrashIcon } from "@/app/components/ui/IconButton";
import type { AccountRow } from "./types";

export default function OpenCodeAccountsPanel({
  accounts,
  disabledAccounts,
  displayNames,
  showAdd,
  newEmail,
  newKey,
  busy,
  confirmRemove,
  onToggleAdd,
  onChangeEmail,
  onChangeKey,
  onSubmitAdd,
  onOpenDetail,
  onConfirmRemove,
  onRemoveAccount,
}: {
  accounts: AccountRow[] | null;
  disabledAccounts: string[];
  displayNames: Record<string, string>;
  showAdd: boolean;
  newEmail: string;
  newKey: string;
  busy: boolean;
  confirmRemove: string | null;
  onToggleAdd: () => void;
  onChangeEmail: (v: string) => void;
  onChangeKey: (v: string) => void;
  onSubmitAdd: (e: React.FormEvent) => void;
  onOpenDetail: (email: string) => void;
  onConfirmRemove: (email: string | null) => void;
  onRemoveAccount: (email: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-300">Accounts</span>
        <Button
          variant={showAdd ? "secondary" : "primary"}
          onClick={onToggleAdd}
          className="px-3 py-1.5 text-sm"
        >
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>
      {showAdd && (
        <form onSubmit={onSubmitAdd} className="flex flex-col gap-2 mb-3">
          <Field
            value={newEmail}
            onChange={(e) => onChangeEmail(e.target.value)}
            placeholder="email or label"
            required
            className="rounded-lg px-3 py-1"
          />
          <Field
            value={newKey}
            onChange={(e) => onChangeKey(e.target.value)}
            placeholder="sk-..."
            required
            mono
            className="rounded-lg px-3 py-1"
          />
          <Button type="submit" disabled={busy} className="px-4 py-2 text-sm">
            {busy ? "Adding…" : "Add account"}
          </Button>
        </form>
      )}
      <div className="space-y-2">
        {accounts === null ? (
          <div className="text-sm text-zinc-500">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-zinc-500">No accounts yet.</div>
        ) : (
          accounts.map((a) => (
            <div
              key={a.email}
              className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 ${
                disabledAccounts.includes(a.email.toLowerCase()) ? "opacity-45" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenDetail(a.email)}
                  className="flex-1 min-w-0 text-left text-sm text-zinc-200 truncate"
                >
                  {a.email}
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <IconButton
                    onClick={() => onOpenDetail(a.email)}
                    title="Account details"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                  >
                    <GearIcon />
                  </IconButton>
                  {confirmRemove === a.email ? (
                    <>
                      <button
                        onClick={() => {
                          onRemoveAccount(a.email);
                          onConfirmRemove(null);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white shrink-0"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => onConfirmRemove(null)}
                        className="text-[10px] px-2 py-1 rounded text-zinc-300 hover:bg-zinc-700 shrink-0"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <IconButton
                      onClick={() => onConfirmRemove(a.email)}
                      title="Remove account"
                      className="p-1 rounded text-zinc-400 hover:text-red-300 hover:bg-zinc-700"
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </div>
              </div>
              <div className="mt-1 text-xs text-zinc-500 truncate">
                {displayNames[a.email] ?? "no nickname"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
