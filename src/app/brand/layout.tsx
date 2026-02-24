import { DashboardShell } from "@/components/layout/DashboardShell";

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
