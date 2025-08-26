"use client";

import ProfilesPanel from "./profile/ProfilesPanel";


export function RightSidebar({ label }: { label: string }) {
  if (label === "Profiles") return <ProfilesPanel />;

  return (
    <aside className="h-full overflow-y-auto p-6">
      <h2 className="text-lg font-semibold">{label}</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Content for <span className="font-medium">{label}</span> will appear here.
      </p>
    </aside>
  );
}

export default RightSidebar;
