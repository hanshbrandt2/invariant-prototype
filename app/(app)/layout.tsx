import { AppShell } from "@/components/app/app-shell";
import { listWorkspaces } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspaces = await listWorkspaces();
  const recents = [...workspaces]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 3)
    .map((w) => ({ id: w.id, name: w.name }));

  return <AppShell recents={recents}>{children}</AppShell>;
}
