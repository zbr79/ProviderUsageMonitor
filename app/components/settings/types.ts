export interface AccountRow {
  email: string;
}

export type ProviderTab = "opencode" | "cursor" | "grok" | "codex" | "claude";
export type SubProvider = "cursor" | "grok" | "codex" | "claude";
export type MainTab = "system" | "accounts";
