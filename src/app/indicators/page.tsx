import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { EngineQuickActions } from "@/components/dashboard/EngineQuickActions";
import { IndicatorsClient } from "./IndicatorsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <IndicatorsClient />
      <EngineQuickActions context="indicators" />
    </AppShell>
  );
}
