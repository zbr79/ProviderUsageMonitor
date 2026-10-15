"use client";

import type { InputHTMLAttributes } from "react";

export default function Field({
  className = "",
  mono = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      {...props}
      className={`bg-zinc-800 border border-zinc-600 text-sm text-zinc-100 placeholder:text-zinc-500 ${
        mono ? "font-mono" : ""
      } ${className}`}
    />
  );
}
