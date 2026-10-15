"use client";

export default function Checkbox({
  checked,
  onChange,
  title,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
        checked ? "bg-emerald-600 border-emerald-500" : "bg-role-surface border-role-field"
      }`}
    >
      {checked && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2.5 w-2.5"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
