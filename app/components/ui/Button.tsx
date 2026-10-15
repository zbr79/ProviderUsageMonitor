"use client";

import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variantClass =
    variant === "primary"
      ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
      : variant === "secondary"
        ? "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        : variant === "danger"
          ? "bg-red-600 hover:bg-red-500 text-white"
          : "text-zinc-300 hover:bg-zinc-800";

  return (
    <button
      {...props}
      className={`rounded-lg transition-colors disabled:opacity-50 ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}
