export default function WalletPage() {
  return (
    <div className="min-h-screen bg-bg-light p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-text-dark mb-8">Wallet</h2>

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-primary rounded-2xl p-6 text-white">
            <p className="text-primary-light text-sm">Available Balance</p>
            <p className="text-4xl font-bold mt-2">$0.00</p>
            <button className="mt-4 bg-gold text-text-dark font-semibold px-5 py-2 rounded-lg hover:bg-yellow-400 transition-colors text-sm">
              Withdraw
            </button>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6">
            <p className="text-gray-500 text-sm">Total Earned (All Time)</p>
            <p className="text-4xl font-bold text-text-dark mt-2">$0.00</p>
            <p className="text-xs text-primary mt-4">Pending: $0.00</p>
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-text-dark mb-4">Transaction History</h3>
          <div className="text-center py-12 text-gray-400 text-sm">
            No transactions yet. Start earning by growing your network!
          </div>
        </div>
      </div>
    </div>
  );
}
