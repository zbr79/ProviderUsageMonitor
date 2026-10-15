"use client";

import type { ReactNode } from "react";

export default function Dialog({
  onClose,
  zIndexClass = "z-50",
  widthClass = "w-[420px]",
  paddingClass = "p-5",
  children,
}: {
  onClose: () => void;
  zIndexClass?: string;
  widthClass?: string;
  paddingClass?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 bg-transparent flex items-center justify-center p-4 ${zIndexClass}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-zinc-900 rounded-xl shadow-2xl ${widthClass} border border-zinc-700 ${paddingClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
