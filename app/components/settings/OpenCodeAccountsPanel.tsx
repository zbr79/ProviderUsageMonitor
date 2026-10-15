"use client";

import Button from "@/app/components/ui/Button";
import Field from "@/app/components/ui/Field";
import IconButton, { GearIcon, TrashIcon } from "@/app/components/ui/IconButton";
import { SETTINGS_TYPE_SCALE } from "@/lib/theme";
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
        <span className={`${SETTINGS_TYPE_SCALE.body} font-medium text-role-text`}>Accounts</span>
        <Button
          variant={showAdd ? "secondary" : "primary"}
          onClick={onToggleAdd}
          className={`px-3 py-1.5 ${SETTINGS_TYPE_SCALE.body}`}
        >
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>
      {showAdd && (
        <form onSubmit={onSubmitAdd} className="flex flex-col gap-2 mb-3">
          <Field
            id="opencode-new-email"
            label="Email or label"
            value={newEmail}
            onChange={(e) => onChangeEmail(e.target.value)}
            placeholder="email or label"
            required
            className="rounded-lg px-3 py-1"
          />
          <Field
            id="opencode-new-key"
            label="API key"
            value={newKey}
            onChange={(e) => onChangeKey(e.target.value)}
            placeholder="sk-..."
            required
            mono
            className="rounded-lg px-3 py-1"
          />
          <Button type="submit" disabled={busy} className={`px-4 py-2 ${SETTINGS_TYPE_SCALE.body}`}>
            {busy ? "Adding…" : "Add account"}
          </Button>
        </form>
      )}
      <div className="space-y-2">
        {accounts === null ? (
          <div className={`${SETTINGS_TYPE_SCALE.body} text-role-muted`}>Loading…</div>
        ) : accounts.length === 0 ? (
          <div className={`${SETTINGS_TYPE_SCALE.body} text-role-muted`}>No accounts yet.</div>
        ) : (
          accounts.map((a) => (
            <div
              key={a.email}
              className={`bg-role-surface border border-role-border rounded-lg px-3 py-2 ${
                disabledAccounts.includes(a.email.toLowerCase()) ? "opacity-45" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDetail(a.email)}
                  className={`flex-1 min-w-0 text-left ${SETTINGS_TYPE_SCALE.body} text-role-text truncate`}
                >
                  {a.email}
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <IconButton
                    onClick={() => onOpenDetail(a.email)}
                    title="Account details"
                    aria-label={`Account details for ${a.email}`}
                    className="p-1 rounded text-role-muted hover:text-role-text hover:bg-role-bg"
                  >
                    <GearIcon />
                  </IconButton>
                  {confirmRemove === a.email ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveAccount(a.email);
                          onConfirmRemove(null);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white shrink-0"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmRemove(null)}
                        className="text-[10px] px-2 py-1 rounded text-role-muted hover:text-role-text hover:bg-role-bg shrink-0"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <IconButton
                      onClick={() => onConfirmRemove(a.email)}
                      title="Remove account"
                      aria-label={`Remove account ${a.email}`}
                      className="p-1 rounded text-role-muted hover:text-role-danger hover:bg-role-bg"
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </div>
              </div>
              <div className={`mt-1 ${SETTINGS_TYPE_SCALE.caption} text-role-muted truncate`}>
                {displayNames[a.email] ?? "no nickname"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
