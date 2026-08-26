import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { DataRoomClient } from "./DataRoomClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="data-room" />
      <DataRoomClient />
      <EngineQuickActions context="data-room" />
    </AppShell>
  );
}
