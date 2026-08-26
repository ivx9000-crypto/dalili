import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { MapsClient } from "./MapsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="maps" />
      <MapsClient />
      <EngineQuickActions context="maps" />
    </AppShell>
  );
}
