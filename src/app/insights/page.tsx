import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { InsightsClient } from "./InsightsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="insights" />
      <InsightsClient />
    </AppShell>
  );
}
