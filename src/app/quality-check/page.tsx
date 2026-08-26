import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { QualityCheckClient } from "./QualityCheckClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="quality" />
      <QualityCheckClient />
      <EngineQuickActions context="quality-check" />
    </AppShell>
  );
}
