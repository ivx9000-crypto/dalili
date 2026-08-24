import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { InsightsClient } from "./InsightsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <InsightsClient />
    </AppShell>
  );
}
