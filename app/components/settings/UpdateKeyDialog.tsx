"use client";

import Button from "@/app/components/ui/Button";
import Dialog from "@/app/components/ui/Dialog";
import Field from "@/app/components/ui/Field";

export default function UpdateKeyDialog({
  email,
  value,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  email: string;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog onClose={onCancel} zIndexClass="z-[60]">
      <h3 className="text-base font-bold text-zinc-100 mb-4">Update API key · {email}</h3>
      <div className="flex flex-col gap-3">
        <Field
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="new sk-... key"
          mono
          className="w-full rounded px-2 py-1"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel} className="px-3 py-1.5 text-sm">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={busy || !value.trim()}
            className="px-3 py-1.5 text-sm"
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
