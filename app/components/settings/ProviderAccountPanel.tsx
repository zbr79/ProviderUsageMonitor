"use client";

import IconButton, { GearIcon } from "@/app/components/ui/IconButton";
import { SETTINGS_TYPE_SCALE } from "@/lib/theme";
import type { SubProvider } from "./types";

export function providerBadgeStyle(variant: "blue" | "emerald" | "zinc"): string {
  if (variant === "emerald") return "role-badge-emerald";
  if (variant === "zinc") return "role-badge-muted";
  return "role-badge-blue";
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
      <div className="bg-role-surface border border-role-border rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`flex-1 min-w-0 ${SETTINGS_TYPE_SCALE.body} text-role-text truncate`}>
            {account ?? "account unavailable"}
          </span>
          <IconButton
            onClick={() => onOpenDetail(provider)}
            title={`${title} details`}
            className="p-1 rounded text-role-muted hover:text-role-text hover:bg-role-bg"
          >
            <GearIcon />
          </IconButton>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`flex-1 min-w-0 ${SETTINGS_TYPE_SCALE.caption} text-role-muted truncate`}>
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
