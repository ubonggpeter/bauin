import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-light flex flex-col">
      {/* Hero Section */}
      <section className="bg-primary text-white py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            <span className="text-gold">BAUIN</span>
          </h1>
          <p className="text-xl font-semibold mb-2">
            Billionaires AI Users Income Network
          </p>
          <p className="text-primary-light text-lg max-w-2xl mx-auto mt-4">
            Empowering users to build sustainable wealth through AI-driven income
            streams and collaborative network growth.
          </p>
          <div className="mt-10 flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/register"
              className="bg-gold text-text-dark font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-text-dark text-center mb-12">
          Platform Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold text-primary mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-primary-dark text-white py-8 px-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} BAUIN Platform. All rights reserved.</p>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI Income Streams",
    description:
      "Leverage cutting-edge AI tools to generate passive and active income across multiple verticals.",
  },
  {
    icon: "🌐",
    title: "Network Growth",
    description:
      "Grow your referral network and earn from every level of your team's success with our multi-tier system.",
  },
  {
    icon: "📊",
    title: "Real-time Analytics",
    description:
      "Track your earnings, network size, and growth metrics with live dashboards and detailed reports.",
  },
  {
    icon: "🔒",
    title: "Secure Wallet",
    description:
      "Manage your BAUIN earnings, withdrawals, and transactions with bank-grade security.",
  },
  {
    icon: "🏆",
    title: "Rank & Rewards",
    description:
      "Advance through ranks from Member to Billionaire Elite and unlock exclusive bonuses and perks.",
  },
  {
    icon: "📄",
    title: "PDF Reports",
    description:
      "Download beautiful PDF summaries of your income, team performance, and account history.",
  },
];
