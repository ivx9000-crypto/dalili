import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { DataRoomClient } from "./DataRoomClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <DataRoomClient />
      <EngineQuickActions context="data-room" />
    </AppShell>
  );
}
