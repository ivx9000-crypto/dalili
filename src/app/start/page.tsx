import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { StartAnalysisClient } from "./StartAnalysisClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <StartAnalysisClient />
    </AppShell>
  );
}
