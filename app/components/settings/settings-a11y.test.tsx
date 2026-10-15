import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GeneralTab from "./GeneralTab";
import OpenCodeAccountsPanel from "./OpenCodeAccountsPanel";
import OpenCodeDetailDialog from "./OpenCodeDetailDialog";
import ProviderAccountPanel from "./ProviderAccountPanel";
import ProviderDetailDialog from "./ProviderDetailDialog";
import UpdateKeyDialog from "./UpdateKeyDialog";
import Tabs from "@/app/components/ui/Tabs";

function assertAccessibleButtonsAndInputs(html: string) {
  const buttonMatches = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  expect(buttonMatches.length).toBeGreaterThan(0);
  for (const [, attrs, inner] of buttonMatches) {
    const textContent = inner.replace(/<[^>]+>/g, "").trim();
    const hasAriaLabel = /aria-label="[^"]+"/.test(attrs);
    expect(
      Boolean(textContent || hasAriaLabel),
      `Button without accessible name: <button${attrs}>${inner}</button>`,
    ).toBe(true);
  }

  const inputMatches = [...html.matchAll(/<input\b([^>]*)\/?>/g)];
  for (const [, attrs] of inputMatches) {
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const hasAriaLabel = /aria-label="[^"]+"/.test(attrs);
    if (!hasAriaLabel) {
      expect(idMatch?.[1], `Input missing id: <input${attrs}>`).toBeTruthy();
      const id = idMatch![1];
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(
        new RegExp(`<label[^>]*\\bfor="${escaped}"[^>]*>[\\s\\S]*?<\\/label>`).test(html),
        `Input #${id} has no matching <label for="${id}">`,
      ).toBe(true);
    }
  }
}

describe("Settings accessibility markup", () => {
  it("renders accessible tabs with role=tablist, role=tab, aria-selected, and roving tabindex", () => {
    const html = renderToStaticMarkup(
      <Tabs
        ariaLabel="Settings sections"
        active="accounts"
        onSelect={() => {}}
        items={[
          { id: "system", label: "General" },
          { id: "accounts", label: "Accounts" },
        ]}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
    assertAccessibleButtonsAndInputs(html);
  });

  it("renders GeneralTab with accessible checkbox roles and group labels", () => {
    const html = renderToStaticMarkup(
      <GeneralTab
        panelTheme="dark"
        themeMode="auto"
        showProviderNames={false}
        deepseekPeakHourWarning={true}
        onSetPanel={() => {}}
        onSetTheme={() => {}}
        onToggleProviderNames={() => {}}
        onToggleDeepseekPeakHourWarning={() => {}}
      />,
    );
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    assertAccessibleButtonsAndInputs(html);
  });

  it("renders OpenCodeAccountsPanel with labeled inputs and named icon buttons", () => {
    const html = renderToStaticMarkup(
      <OpenCodeAccountsPanel
        accounts={[{ email: "work-main@opencode.ai" }]}
        disabledAccounts={[]}
        displayNames={{ "work-main@opencode.ai": "work-main" }}
        showAdd={true}
        newEmail=""
        newKey=""
        busy={false}
        confirmRemove={null}
        onToggleAdd={() => {}}
        onChangeEmail={() => {}}
        onChangeKey={() => {}}
        onSubmitAdd={() => {}}
        onOpenDetail={() => {}}
        onConfirmRemove={() => {}}
        onRemoveAccount={() => {}}
      />,
    );
    expect(html).toContain("Email or label");
    expect(html).toContain("API key");
    expect(html).toContain('aria-label="Account details for work-main@opencode.ai"');
    expect(html).toContain('aria-label="Remove account work-main@opencode.ai"');
    assertAccessibleButtonsAndInputs(html);
  });

  it("renders ProviderAccountPanel and all 3 detail/update dialogs with role=dialog and labeled controls", () => {
    const panelHtml = renderToStaticMarkup(
      <ProviderAccountPanel
        provider="cursor"
        title="Cursor"
        account="dev@cursor.com"
        nickname="crsr-pro"
        badgeText="Pro"
        badgeVariant="blue"
        onOpenDetail={() => {}}
      />,
    );
    assertAccessibleButtonsAndInputs(panelHtml);

    const openCodeDialogHtml = renderToStaticMarkup(
      <OpenCodeDetailDialog
        email="work-main@opencode.ai"
        detailKey="sk-opencode-123456"
        disabled={false}
        nickname="work-main"
        savedFlash={false}
        onClose={() => {}}
        onToggleAccount={() => {}}
        onSaveNickname={() => {}}
        onStartEditKey={() => {}}
      />,
    );
    expect(openCodeDialogHtml).toContain('role="dialog"');
    expect(openCodeDialogHtml).toContain('aria-modal="true"');
    assertAccessibleButtonsAndInputs(openCodeDialogHtml);

    const updateKeyHtml = renderToStaticMarkup(
      <UpdateKeyDialog
        email="work-main@opencode.ai"
        value="sk-new"
        busy={false}
        onChange={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );
    expect(updateKeyHtml).toContain('role="dialog"');
    expect(updateKeyHtml).toContain("New API key");
    assertAccessibleButtonsAndInputs(updateKeyHtml);

    const providerDialogHtml = renderToStaticMarkup(
      <ProviderDetailDialog
        provider="cursor"
        enabled={true}
        account="dev@cursor.com"
        badgeText="Pro"
        badgeVariant="blue"
        nickname="crsr-pro"
        savedFlash={false}
        onClose={() => {}}
        onToggleMonitoring={() => {}}
        onSaveNickname={() => {}}
      />,
    );
    expect(providerDialogHtml).toContain('role="dialog"');
    expect(providerDialogHtml).toContain('aria-label="Monitor Cursor"');
    assertAccessibleButtonsAndInputs(providerDialogHtml);
  });
});
