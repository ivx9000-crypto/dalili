import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { DocumentsClient } from "./DocumentsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <DocumentsClient />
      <EngineQuickActions context="documents" />
    </AppShell>
  );
}
