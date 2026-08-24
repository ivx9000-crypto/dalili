import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { QualityCheckClient } from "./QualityCheckClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <QualityCheckClient />
      <EngineQuickActions context="quality-check" />
    </AppShell>
  );
}
