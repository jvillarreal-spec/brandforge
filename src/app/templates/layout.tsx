import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
