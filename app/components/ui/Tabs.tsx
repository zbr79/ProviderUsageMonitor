"use client";

import type { ReactNode } from "react";

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
    <div className="flex gap-5 px-5 border-b border-zinc-800 mb-3">
      {items.map((item) => {
        const isSelected = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`${item.icon ? "flex items-center gap-1.5 " : ""}px-0.5 pb-2 pt-1 -mb-px text-sm border-b-2 transition-colors ${
              isSelected
                ? `border-emerald-400 text-zinc-100${boldActive ? " font-medium" : ""}`
                : "border-transparent text-zinc-500 hover:text-zinc-300"
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
