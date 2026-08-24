import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { AIAssistantClient } from "./AIAssistantClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <AIAssistantClient />
    </AppShell>
  );
}
