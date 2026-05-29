import { getAdminSession } from "@/lib/adminSession";

export const metadata = { title: "Admin Dashboard — BAUIN" };

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      {/* Top bar */}
      <header className="bg-[#1A6659] px-8 py-4 flex items-center justify-between">
        <span className="text-2xl font-black text-[#F0B429] tracking-widest font-serif">
          BAUIN
        </span>
        <span className="text-xs text-[#2B8A72] font-medium uppercase tracking-wider">
          {session?.role.replace("_", " ")}
        </span>
      </header>

      <main className="p-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Welcome back. Select a module from the sidebar to get started.
        </p>

        {/* Placeholder grid — replace with real admin widgets */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["Users", "Stories", "Investments", "Withdrawals", "Audit Log", "Settings"].map(
            (label) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#1A6659]
                           transition-colors cursor-pointer"
              >
                <p className="font-semibold text-[#1A1A2E]">{label}</p>
                <p className="text-xs text-gray-400 mt-1">Manage {label.toLowerCase()}</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
