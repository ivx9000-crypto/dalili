import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkflowNudge } from "@/components/workflow/WorkflowNudge";
import { ReportsClient } from "./ReportsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <WorkflowNudge context="reports" />
      <ReportsClient />
    </AppShell>
  );
}
