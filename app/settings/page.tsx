"use client";

import SettingsModal from "@/app/components/SettingsModal";

export default function SettingsPage() {
  return (
    <div className="w-screen h-screen">
      <SettingsModal
        onClose={() => (window as any).settingsWindow?.close()}
        onChanged={() => {}}
      />
    </div>
  );
}