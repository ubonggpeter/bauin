import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminSession";

interface AdminGuardProps {
  children: React.ReactNode;
  /** Restrict further to SUPER_ADMIN only (default: ADMIN + SUPER_ADMIN). */
  superAdminOnly?: boolean;
}

/**
 * Server component guard for the admin section.
 * Place in the layout of any route group that requires admin authentication.
 *
 * - Unauthenticated → redirect to /login
 * - Wrong role when superAdminOnly → redirect to /admin (back to dashboard)
 */
export async function AdminGuard({ children, superAdminOnly = false }: AdminGuardProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  if (superAdminOnly && session.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return <>{children}</>;
}
