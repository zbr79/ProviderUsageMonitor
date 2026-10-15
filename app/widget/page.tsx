"use client";

import { useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/app/components/toast/toast";
import { apiFetch } from "@/lib/api-fetch";
import { usageWidget } from "@/lib/desktop-bridge";
import { getPeakInfo } from "@/lib/ranking";
import ClaudeCard from "./ClaudeCard";
import CodexCard from "./CodexCard";
import CursorCard from "./CursorCard";
import GrokCard from "./GrokCard";
import OpenCodeCard from "./OpenCodeCard";
import type { AccountRow } from "./types";
import { useWidgetData } from "./useWidgetData";

export default function Widget() {
  const {
    rows,
    sortedRows,
    activeRow,
    cursor,
    cursorError,
    cursorEnabled,
    grokEnabled,
    codexEnabled,
    deepseekPeakHourWarning,
    codex,
    claudeEnabled,
    claude,
    displayNames,
    showProviderNames,
    themeMode,
    increaseAt,
    failedPolls,
    serverState,
  } = useWidgetData();

  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const [bgBright, setBgBright] = useState<number | null>(null);

  useEffect(() => {
    const off = usageWidget()?.onBg?.((v: number) => {
      setBgBright((prev) => {
        const bright = v >= 0.45;
        const dark = v < 0.3;
        const wouldBeLight = prev !== null && prev < 0.5;
        const shouldSwitch =
          (dark && !wouldBeLight) ||
          (bright && wouldBeLight) ||
          prev === null;
        return shouldSwitch ? v : prev;
      });
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    const off = usageWidget()?.onToggleExpand?.(() => setExpanded((e) => !e));
    return () => off?.();
  }, []);

  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      usageWidget()?.showMenu?.();
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const widget = usageWidget();
    widget?.startDrag?.(e.screenX, e.screenY);
    const move = (ev: MouseEvent) => widget?.moveDrag?.(ev.screenX, ev.screenY);
    const up = () => {
      widget?.endDrag?.();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const light =
    themeMode === "light" || themeMode === "white"
      ? true
      : themeMode === "dark"
        ? false
        : bgBright !== null && bgBright < 0.5;
  const cardBg =
    themeMode === "white" ? "bg-white" : light ? "bg-zinc-200" : "bg-zinc-900";

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const h = document.body?.scrollHeight ?? 0;
      if (h > 0) usageWidget()?.resize?.(238, h + 6);
    }, 80);
    return () => clearTimeout(t);
  }, [expanded, rows, cursor]);

  const copyKey = async (email: string) => {
    try {
      const res = await apiFetch(`/api/key?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        toastError("Copy failed");
        return;
      }
      const json = await res.json();
      if (typeof json.key !== "string" || !json.key) {
        toastError("Copy failed");
        return;
      }
      await navigator.clipboard.writeText(json.key);
      toastSuccess("Key copied");
    } catch {
      toastError("Copy failed");
    }
  };

  const peakInfo = getPeakInfo(new Date(now));
  const showOffline = failedPolls >= 2 || serverState !== "online";
  const offlineLabel =
    serverState === "stopped"
      ? "Server stopped · right-click to refresh"
      : "Offline · retrying";

  const renderOpenCode = (row: AccountRow, withControls: boolean) => (
    <OpenCodeCard
      key={row.email}
      row={row}
      isInUse={row.enabled !== false && sortedRows?.[0]?.email === row.email}
      withControls={withControls}
      light={light}
      cardBg={cardBg}
      showProviderNames={showProviderNames}
      displayNames={displayNames}
      deepseekPeakHourWarning={deepseekPeakHourWarning}
      peakInfo={peakInfo}
      now={now}
      increaseAt={increaseAt}
      onDragStart={onDragStart}
      onCopyKey={copyKey}
    />
  );

  const renderProviderCards = () => (
    <>
      <CursorCard
        cursor={cursor}
        cursorError={cursorError}
        cursorEnabled={cursorEnabled}
        light={light}
        cardBg={cardBg}
        showProviderNames={showProviderNames}
        displayNames={displayNames}
        now={now}
        onDragStart={onDragStart}
      />
      <GrokCard
        cursor={cursor}
        grokEnabled={grokEnabled}
        light={light}
        cardBg={cardBg}
        showProviderNames={showProviderNames}
        displayNames={displayNames}
        now={now}
        onDragStart={onDragStart}
      />
      <CodexCard
        codex={codex}
        codexEnabled={codexEnabled}
        light={light}
        cardBg={cardBg}
        showProviderNames={showProviderNames}
        displayNames={displayNames}
        now={now}
        onDragStart={onDragStart}
      />
      <ClaudeCard
        claude={claude}
        claudeEnabled={claudeEnabled}
        light={light}
        cardBg={cardBg}
        showProviderNames={showProviderNames}
        displayNames={displayNames}
        onDragStart={onDragStart}
      />
    </>
  );

  return (
    <div className="w-screen p-1.5 select-none">
      <div className={expanded ? "space-y-1.5" : ""}>
        {showOffline && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg px-2 py-1 text-[10px] font-medium mb-1.5 ${
              light
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-amber-500/15 text-amber-200 border border-amber-400/30"
            }`}
          >
            {offlineLabel}
          </div>
        )}
        {rows === null ? (
          <div className={`text-[11px] px-1 py-2 ${light ? "text-zinc-500" : "text-zinc-400"}`}>
            Loading…
          </div>
        ) : expanded ? (
          <>
            {sortedRows?.map((row, i) => renderOpenCode(row, i === 0))}
            {renderProviderCards()}
          </>
        ) : (
          <>
            {activeRow ? renderOpenCode(activeRow, true) : null}
            {renderProviderCards()}
          </>
        )}
      </div>
    </div>
  );
}
