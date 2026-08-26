import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { WorkspaceClient } from "./WorkspaceClient";

export default function WorkspacePage() {
  return (
    <AppShell>
      <Topbar />
      <WorkspaceClient />
    </AppShell>
  );
}
