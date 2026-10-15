"use client";

import IconButton, { GearIcon } from "@/app/components/ui/IconButton";
import type { SubProvider } from "./types";

export function providerBadgeStyle(variant: "blue" | "emerald" | "zinc"): string {
  if (variant === "emerald") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
  }
  if (variant === "zinc") {
    return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
  return "bg-blue-500/15 text-blue-300 border-blue-400/30";
}

export default function ProviderAccountPanel({
  provider,
  title,
  account,
  nickname,
  badgeText,
  badgeVariant,
  onOpenDetail,
}: {
  provider: SubProvider;
  title: string;
  account: string | null;
  nickname: string | undefined;
  badgeText: string | null;
  badgeVariant: "blue" | "emerald" | "zinc";
  onOpenDetail: (p: SubProvider) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">
            {account ?? "account unavailable"}
          </span>
          <IconButton
            onClick={() => onOpenDetail(provider)}
            title={`${title} details`}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
          >
            <GearIcon />
          </IconButton>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 min-w-0 text-xs text-zinc-500 truncate">
            {nickname ?? "no nickname"}
          </span>
          {badgeText && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${providerBadgeStyle(
                badgeVariant,
              )}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
