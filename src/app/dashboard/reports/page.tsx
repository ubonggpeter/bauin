export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-bg-light p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-text-dark mb-8">Reports</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((r) => (
            <div
              key={r.title}
              className="bg-white border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{r.icon}</div>
              <h3 className="font-semibold text-text-dark mb-1">{r.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{r.description}</p>
              <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const reportTypes = [
  {
    icon: "💰",
    title: "Income Report",
    description: "Full breakdown of all earnings, bonuses, and income sources.",
  },
  {
    icon: "🌐",
    title: "Network Report",
    description: "Your downline structure, member activity, and team performance.",
  },
  {
    icon: "📈",
    title: "Growth Report",
    description: "Month-over-month growth trends for earnings and network size.",
  },
  {
    icon: "🏦",
    title: "Transaction Report",
    description: "Complete record of all deposits, withdrawals, and transfers.",
  },
];
