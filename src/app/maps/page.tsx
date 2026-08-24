import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { MapsClient } from "./MapsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <MapsClient />
      <EngineQuickActions context="maps" />
    </AppShell>
  );
}
