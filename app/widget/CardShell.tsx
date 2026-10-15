"use client";

import type { ReactNode } from "react";

export type CardState = "default" | "inUse" | "exhausted" | "disabled";

export default function CardShell({
  state = "default",
  light,
  cardBg,
  children,
}: {
  state?: CardState;
  light: boolean;
  cardBg: string;
  children: ReactNode;
}) {
  const borderClass =
    state === "disabled"
      ? `${light ? "border border-zinc-300/70" : "border border-white/10"} opacity-55`
      : state === "exhausted"
        ? light
          ? "border border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border border-red-400/70 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
        : state === "inUse"
          ? light
            ? "border border-emerald-500/80 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
            : "border border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
          : light
            ? "border border-zinc-400/50"
            : "border border-white/15";

  return (
    <div className={`rounded-lg p-2 transition-colors duration-700 ${cardBg} ${borderClass}`}>
      {children}
    </div>
  );
}
