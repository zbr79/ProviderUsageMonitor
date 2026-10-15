"use client";

import { useCallback, useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/app/components/toast/toast";
import { apiFetch } from "@/lib/api-fetch";
import type { AccountRow, ProviderTab, SubProvider } from "./types";

export function useSettingsState(onChanged: () => void) {
  const [tab, setTab] = useState<ProviderTab>("opencode");
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [cursorEnabled, setCursorEnabled] = useState(true);
  const [grokEnabled, setGrokEnabled] = useState(true);
  const [codexEnabled, setCodexEnabled] = useState(true);
  const [codexAccount, setCodexAccount] = useState<string | null>(null);
  const [codexPlan, setCodexPlan] = useState<string | null>(null);
  const [claudeEnabled, setClaudeEnabled] = useState(true);
  const [deepseekPeakHourWarning, setDeepseekPeakHourWarning] = useState(true);
  const [claudeAccount, setClaudeAccount] = useState<string | null>(null);
  const [claudeStatus, setClaudeStatus] = useState<string | null>(null);
  const [showProviderNames, setShowProviderNames] = useState(false);
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark" | "white">("auto");
  const [panelTheme, setPanelTheme] = useState<"light" | "dark">("dark");
  const [subDetail, setSubDetail] = useState<SubProvider | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [disabledAccounts, setDisabledAccounts] = useState<string[]>([]);
  const [cursorAccount, setCursorAccount] = useState<string | null>(null);
  const [cursorPlan, setCursorPlan] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [editKey, setEditKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [u, s] = await Promise.all([
      apiFetch("/api/accounts", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/settings", { cache: "no-store" }).then((r) => r.json()),
    ]);
    const disabled = s.settings?.disabledAccounts ?? [];
    const list = (u.accounts ?? []).map((a: AccountRow) => ({ email: a.email }));
    list.sort(
      (a: AccountRow, b: AccountRow) =>
        (disabled.includes(a.email.toLowerCase()) ? 1 : 0) -
        (disabled.includes(b.email.toLowerCase()) ? 1 : 0),
    );
    setAccounts(list);
    setCursorEnabled(s.settings?.cursorEnabled !== false);
    setGrokEnabled(s.settings?.grokEnabled !== false);
    setCodexEnabled(s.settings?.codexEnabled !== false);
    setClaudeEnabled(s.settings?.claudeEnabled !== false);
    setDeepseekPeakHourWarning(s.settings?.deepseekPeakHourWarning !== false);
    setShowProviderNames(s.settings?.showProviderNames === true);
    setThemeMode(s.settings?.themeMode ?? "auto");
    setPanelTheme(s.settings?.panelTheme === "light" ? "light" : "dark");
    setDisplayNames(s.settings?.displayNames ?? {});
    setDisabledAccounts(disabled);
    apiFetch("/api/cursor", { cache: "no-store" })
      .then((r) => r.json())
      .then((c) => {
        setCursorAccount(c.usage?.accountName ?? null);
        setCursorPlan(c.usage?.planName ?? null);
      })
      .catch(() => {
        // Expected when Cursor is not signed in locally
      });
    apiFetch("/api/codex", { cache: "no-store" })
      .then((r) => r.json())
      .then((c) => {
        setCodexAccount(c.usage?.email ?? null);
        setCodexPlan(c.usage?.planType ?? null);
      })
      .catch(() => {
        // Expected when Codex is not signed in locally
      });
    apiFetch("/api/claude", { cache: "no-store" })
      .then((r) => r.json())
      .then((c) => {
        setClaudeAccount(c.usage?.email ?? null);
        setClaudeStatus(
          c.usage == null
            ? "unavailable"
            : !c.usage.signedIn
              ? "not signed in"
              : c.usage.subscribed
                ? c.usage.subscriptionType ?? "subscribed"
                : "not subscribed",
        );
      })
      .catch(() => {
        // Expected when Claude Code is not signed in locally
      });
  }, []);

  useEffect(() => {
    // Load accounts and settings when the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load on mount
    refresh();
  }, [refresh]);

  const openDetail = async (email: string) => {
    setDetailEmail(email);
    setDetailKey(null);
    setEditKey(false);
    try {
      const res = await apiFetch(`/api/key?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        setDetailKey(null);
        return;
      }
      const json = await res.json();
      setDetailKey(typeof json.key === "string" ? json.key : null);
    } catch {
      setDetailKey(null);
    }
  };

  const saveNewKey = async () => {
    if (!detailEmail) return;
    setKeyBusy(true);
    try {
      const res = await apiFetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: detailEmail, key: newKeyValue }),
      });
      if (res.ok) {
        toastSuccess("API key updated");
        setDetailKey(newKeyValue);
        setNewKeyValue("");
        setEditKey(false);
        onChanged();
      } else {
        const json = await res.json();
        toastError(json.error ?? "Update failed");
      }
    } catch {
      toastError("Update failed");
    } finally {
      setKeyBusy(false);
    }
  };

  const saveSettingField = async (
    payload: Record<string, unknown>,
    successMsg: string,
    rollback?: () => void,
  ) => {
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toastSuccess(successMsg);
        onChanged();
      } else {
        toastError("Save failed");
        rollback?.();
      }
    } catch {
      toastError("Save failed");
      rollback?.();
    }
  };

  const saveDisplayName = async (key: string, name: string) => {
    const next = { ...displayNames, [key]: name };
    if (!name.trim()) delete next[key];
    setDisplayNames(next);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursorEnabled, displayNames: next }),
      });
      if (res.ok) {
        setSavedFlash(key);
        setTimeout(() => setSavedFlash((k) => (k === key ? null : k)), 1500);
        toastSuccess("Display name saved");
        onChanged();
      } else {
        toastError("Save failed");
      }
    } catch {
      toastError("Save failed");
    }
  };

  const toggleAccount = async (email: string, enabled: boolean) => {
    const lower = email.toLowerCase();
    const prev = disabledAccounts;
    const next = enabled
      ? disabledAccounts.filter((e) => e !== lower)
      : [...disabledAccounts.filter((e) => e !== lower), lower];
    setDisabledAccounts(next);
    await saveSettingField(
      { cursorEnabled, displayNames, disabledAccounts: next },
      enabled ? "Account enabled" : "Account disabled",
      () => setDisabledAccounts(prev),
    );
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/api/accounts", {
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
      const res = await apiFetch("/api/accounts", {
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

  return {
    tab,
    setTab,
    accounts,
    cursorEnabled,
    setCursorEnabled,
    grokEnabled,
    setGrokEnabled,
    codexEnabled,
    setCodexEnabled,
    codexAccount,
    codexPlan,
    claudeEnabled,
    setClaudeEnabled,
    deepseekPeakHourWarning,
    setDeepseekPeakHourWarning,
    claudeAccount,
    claudeStatus,
    showProviderNames,
    setShowProviderNames,
    themeMode,
    setThemeMode,
    panelTheme,
    setPanelTheme,
    subDetail,
    setSubDetail,
    displayNames,
    disabledAccounts,
    cursorAccount,
    cursorPlan,
    newEmail,
    setNewEmail,
    newKey,
    setNewKey,
    busy,
    detailEmail,
    setDetailEmail,
    detailKey,
    editKey,
    setEditKey,
    newKeyValue,
    setNewKeyValue,
    keyBusy,
    showAdd,
    setShowAdd,
    confirmRemove,
    setConfirmRemove,
    savedFlash,
    openDetail,
    saveNewKey,
    saveSettingField,
    saveDisplayName,
    toggleAccount,
    addAccount,
    removeAccount,
  };
}
