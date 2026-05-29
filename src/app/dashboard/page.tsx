import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-bg-light">
      {/* Sidebar + Main layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-primary text-white flex flex-col p-6 fixed left-0 top-0">
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-gold">BAUIN</h1>
            <p className="text-xs text-primary-light mt-0.5">Billionaires Network</p>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-primary-light/30">
            <button className="w-full text-sm text-primary-light hover:text-white transition-colors text-left">
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-text-dark mb-8">Dashboard Overview</h2>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-border rounded-2xl p-6 shadow-sm"
                >
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-dark">{stat.value}</p>
                  <p className="text-xs text-primary mt-1">{stat.change}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-text-dark mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                {quickActions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="bg-bg-light border border-border px-4 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    {a.icon} {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const navLinks = [
  { href: "/dashboard", icon: "📊", label: "Overview" },
  { href: "/dashboard/wallet", icon: "💰", label: "Wallet" },
  { href: "/dashboard/network", icon: "🌐", label: "Network" },
  { href: "/dashboard/reports", icon: "📄", label: "Reports" },
];

const stats = [
  { label: "Total Earnings", value: "$0.00", change: "+0% this month" },
  { label: "Network Size", value: "0", change: "0 active members" },
  { label: "Current Rank", value: "Member", change: "Next: Bronze" },
  { label: "Wallet Balance", value: "$0.00", change: "Available for withdrawal" },
];

const quickActions = [
  { href: "/dashboard/wallet", icon: "💸", label: "Withdraw" },
  { href: "/dashboard/network", icon: "👥", label: "Invite Members" },
  { href: "/dashboard/reports", icon: "📥", label: "Download Report" },
];
