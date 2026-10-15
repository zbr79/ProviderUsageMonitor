"use client";

import type { ReactNode } from "react";
import { SETTINGS_TYPE_SCALE } from "@/lib/theme";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

export default function Tabs<T extends string>({
  items,
  active,
  onSelect,
  boldActive = false,
}: {
  items: TabItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  boldActive?: boolean;
}) {
  return (
    <div className="flex gap-5 px-5 border-b border-role-border mb-3">
      {items.map((item) => {
        const isSelected = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`${item.icon ? "flex items-center gap-1.5 " : ""}px-0.5 pb-2 pt-1 -mb-px ${SETTINGS_TYPE_SCALE.body} border-b-2 transition-colors ${
              isSelected
                ? `border-role-accent text-role-text${boldActive ? " font-medium" : ""}`
                : "border-transparent text-role-muted hover:text-role-text"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
