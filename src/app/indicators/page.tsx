import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { IndicatorsClient } from "./IndicatorsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="indicators" />
      <IndicatorsClient />
      <EngineQuickActions context="indicators" />
    </AppShell>
  );
}
