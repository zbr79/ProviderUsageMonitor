"use client";

import Checkbox from "@/app/components/ui/Checkbox";
import Dialog from "@/app/components/ui/Dialog";
import Field from "@/app/components/ui/Field";
import IconButton, { CloseIcon, EditIcon } from "@/app/components/ui/IconButton";

function maskKey(k: string): string {
  return `${k.slice(0, Math.ceil(k.length / 2))}***`;
}

export default function OpenCodeDetailDialog({
  email,
  detailKey,
  disabled,
  nickname,
  savedFlash,
  onClose,
  onToggleAccount,
  onSaveNickname,
  onStartEditKey,
}: {
  email: string;
  detailKey: string | null;
  disabled: boolean;
  nickname: string;
  savedFlash: boolean;
  onClose: () => void;
  onToggleAccount: (email: string, enabled: boolean) => void;
  onSaveNickname: (key: string, name: string) => void;
  onStartEditKey: () => void;
}) {
  return (
    <Dialog onClose={onClose} zIndexClass="z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-zinc-100">OpenCode</h3>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30">
              Go
            </span>
            <Checkbox
              checked={!disabled}
              onChange={() => onToggleAccount(email, disabled)}
              title={disabled ? "Enable account" : "Disable account"}
            />
          </div>
          <div className="text-xs text-zinc-500 truncate">{email}</div>
        </div>
        <IconButton
          onClick={onClose}
          title="Close"
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <CloseIcon />
        </IconButton>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-400 shrink-0">Nickname</div>
          <Field
            defaultValue={nickname}
            placeholder="nickname"
            onBlur={(e) => onSaveNickname(email, e.target.value)}
            className="flex-1 min-w-0 rounded px-2 py-1"
          />
          {savedFlash && <span className="text-[10px] text-emerald-400 shrink-0">✓ saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-400 shrink-0">API key</div>
          <div className="flex-1 min-w-0 text-xs font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 break-all">
            {detailKey ? maskKey(detailKey) : "…"}
          </div>
          <IconButton
            onClick={onStartEditKey}
            title="Update API key"
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <EditIcon />
          </IconButton>
        </div>
      </div>
    </Dialog>
  );
}
