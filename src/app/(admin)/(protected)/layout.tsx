import { AdminGuard } from "@/components/admin/AdminGuard";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
