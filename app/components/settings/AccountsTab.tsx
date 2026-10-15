"use client";

import Tabs, { type TabItem } from "@/app/components/ui/Tabs";
import OpenCodeAccountsPanel from "./OpenCodeAccountsPanel";
import ProviderAccountPanel from "./ProviderAccountPanel";
import type { AccountRow, ProviderTab, SubProvider } from "./types";

const PROVIDER_TABS: TabItem<ProviderTab>[] = [
  {
    id: "opencode",
    label: "OpenCode",
    icon: <img src="/opencode.ico" alt="" className="h-3.5 w-3.5 rounded-[3px]" />,
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: <img src="/cursor.ico" alt="" className="h-3.5 w-3.5 rounded-[3px]" />,
  },
  {
    id: "grok",
    label: "Grok Bot",
    icon: <img src="/grokbot.ico" alt="" className="h-3.5 w-3.5 rounded-[3px]" />,
  },
  {
    id: "codex",
    label: "Codex",
    icon: <img src="/openai.png" alt="" className="h-3.5 w-3.5 rounded-[3px]" />,
  },
  {
    id: "claude",
    label: "Claude",
    icon: <img src="/claude.ico" alt="" className="h-3.5 w-3.5 rounded-[3px]" />,
  },
];

export default function AccountsTab({
  tab,
  onSelectTab,
  accounts,
  disabledAccounts,
  displayNames,
  cursorAccount,
  cursorPlan,
  codexAccount,
  codexPlan,
  claudeAccount,
  claudeStatus,
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
  onOpenSubDetail,
}: {
  tab: ProviderTab;
  onSelectTab: (t: ProviderTab) => void;
  accounts: AccountRow[] | null;
  disabledAccounts: string[];
  displayNames: Record<string, string>;
  cursorAccount: string | null;
  cursorPlan: string | null;
  codexAccount: string | null;
  codexPlan: string | null;
  claudeAccount: string | null;
  claudeStatus: string | null;
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
  onOpenSubDetail: (p: SubProvider) => void;
}) {
  return (
    <>
      <Tabs items={PROVIDER_TABS} active={tab} onSelect={onSelectTab} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5">
        {tab === "opencode" ? (
          <OpenCodeAccountsPanel
            accounts={accounts}
            disabledAccounts={disabledAccounts}
            displayNames={displayNames}
            showAdd={showAdd}
            newEmail={newEmail}
            newKey={newKey}
            busy={busy}
            confirmRemove={confirmRemove}
            onToggleAdd={onToggleAdd}
            onChangeEmail={onChangeEmail}
            onChangeKey={onChangeKey}
            onSubmitAdd={onSubmitAdd}
            onOpenDetail={onOpenDetail}
            onConfirmRemove={onConfirmRemove}
            onRemoveAccount={onRemoveAccount}
          />
        ) : tab === "cursor" ? (
          <ProviderAccountPanel
            provider="cursor"
            title="Cursor"
            account={cursorAccount}
            nickname={displayNames["cursor"]}
            badgeText={cursorPlan}
            badgeVariant="blue"
            onOpenDetail={onOpenSubDetail}
          />
        ) : tab === "grok" ? (
          <ProviderAccountPanel
            provider="grok"
            title="Grok Bot"
            account={cursorAccount}
            nickname={displayNames["grok"]}
            badgeText={cursorPlan}
            badgeVariant="blue"
            onOpenDetail={onOpenSubDetail}
          />
        ) : tab === "codex" ? (
          <ProviderAccountPanel
            provider="codex"
            title="Codex"
            account={codexAccount}
            nickname={displayNames["codex"]}
            badgeText={
              codexPlan ? codexPlan.charAt(0).toUpperCase() + codexPlan.slice(1) : null
            }
            badgeVariant={codexPlan?.toLowerCase() === "free" ? "emerald" : "blue"}
            onOpenDetail={onOpenSubDetail}
          />
        ) : (
          <ProviderAccountPanel
            provider="claude"
            title="Claude"
            account={claudeAccount}
            nickname={displayNames["claude"]}
            badgeText={
              claudeStatus === "not subscribed" ? "Free" : claudeStatus
            }
            badgeVariant={
              claudeStatus === "not subscribed"
                ? "emerald"
                : claudeStatus === "unavailable" || claudeStatus === "not signed in"
                  ? "zinc"
                  : "blue"
            }
            onOpenDetail={onOpenSubDetail}
          />
        )}
      </div>
    </>
  );
}
