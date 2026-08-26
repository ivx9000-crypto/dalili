import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { AIAssistantClient } from "./AIAssistantClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="assistant" />
      <AIAssistantClient />
    </AppShell>
  );
}
