"use client";

import type { InputHTMLAttributes } from "react";
import { SETTINGS_TYPE_SCALE } from "@/lib/theme";

export default function Field({
  className = "",
  mono = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      {...props}
      className={`bg-role-surface border border-role-field ${SETTINGS_TYPE_SCALE.body} text-role-text placeholder:text-role-muted ${
        mono ? "font-mono" : ""
      } ${className}`}
    />
  );
}
