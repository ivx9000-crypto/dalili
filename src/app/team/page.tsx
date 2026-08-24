import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { TeamClient } from "./TeamClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <TeamClient />
    </AppShell>
  );
}
