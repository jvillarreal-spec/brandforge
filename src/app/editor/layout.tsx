import { DashboardShell } from "@/components/layout/DashboardShell";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
