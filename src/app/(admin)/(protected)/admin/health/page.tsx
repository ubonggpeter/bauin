import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getAdminSession } from "@/lib/adminSession";

const AdminHealthDashboard = dynamic(
  () => import("@/components/health/AdminHealthDashboard"),
  { ssr: false }
);

export default async function AdminHealthPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-dark">System Health</h1>
        <p className="text-sm text-text-muted mt-1">
          Live metrics — auto-refreshes every 30 s. Alerts emailed when DB/Redis down or queue depth &gt; 1 000.
        </p>
      </div>
      <AdminHealthDashboard />
    </div>
  );
}
