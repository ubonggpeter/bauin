export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-bg-light p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-text-dark mb-8">My Network</h2>

        {/* Referral card */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-text-dark mb-2">Your Referral Link</h3>
          <div className="flex gap-3 mt-3">
            <input
              readOnly
              value="https://bauin.app/ref/YOUR_CODE"
              className="flex-1 border border-border rounded-lg px-4 py-2.5 text-sm bg-bg-light text-gray-600"
            />
            <button className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              Copy
            </button>
          </div>
        </div>

        {/* Network tree placeholder */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-text-dark mb-4">Network Tree</h3>
          <div className="text-center py-16 text-gray-400 text-sm">
            Your network is empty. Share your referral link to start building!
          </div>
        </div>
      </div>
    </div>
  );
}
