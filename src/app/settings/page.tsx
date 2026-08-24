import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsClient } from "./SettingsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <SettingsClient />
    </AppShell>
  );
}
