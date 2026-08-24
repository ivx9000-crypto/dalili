import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { ReportsClient } from "./ReportsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <ReportsClient />
    </AppShell>
  );
}
