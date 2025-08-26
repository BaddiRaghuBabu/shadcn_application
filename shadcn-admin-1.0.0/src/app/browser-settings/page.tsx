"use client";

import { useState } from "react";
import { RightSidebar } from "./components/right-sidebar";
import { SettingsSidebar } from "./components/sidebar";

export default function BrowserSettingsLikeEdge() {
  const [activeLabel, setActiveLabel] = useState("Profiles");

  return (
    <main className="h-screen overflow-hidden bg-white text-neutral-900">
      {/* Two columns so the main pane has enough width */}
      <div className="grid h-full grid-cols-[320px_minmax(0,1fr)]">
        <SettingsSidebar activeLabel={activeLabel} onItemClick={setActiveLabel} />
        <RightSidebar label={activeLabel} />
      </div>
    </main>
  );
}
