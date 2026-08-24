import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { ProjectsClient } from "./ProjectsClient";

export default function Page() {
  return (
    <AppShell>
      <Topbar />
      <ProjectsClient />
    </AppShell>
  );
}
