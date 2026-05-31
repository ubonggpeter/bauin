import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are a friendly, concise support assistant for BAUIN — Billionaires AI Users Income Network.

BAUIN is an AI-powered income platform. Key features:
- **Earning**: Complete quizzes, AI tasks, leaderboard competitions, and job marketplace assignments
- **Referrals**: Earn 10% of every referred member's lifetime earnings. Viewer referrals unlock after 5 worker referrals
- **Job Marketplace**: Post or apply for jobs (escrow payments). Workers need a category certificate to apply
- **Categories**: AI Content Creator, Data Analyst, AI Developer, Digital Marketer, AI Tutor, Video Editor, Crypto/DeFi — registration fee required, certification by quiz
- **Wallet & Withdrawals**: Withdraw via Paystack on Tuesdays, Thursdays, and Saturdays
- **KYC**: NIN required for withdrawals. Auto-approved if account is 90+ days old with no fraud flags
- **Affiliate Programme**: ₦2,000 per new user registration via your promo link (manual approval required)
- **Investments**: Tool pools and investment schemes with tracked returns
- **Competitions**: Weekly leaderboard with prize pools; daily quiz challenges

Guidelines:
- Be brief: 2–4 sentences maximum per reply
- Use plain text, avoid excessive formatting
- For account-specific issues (missing payment, locked account, dispute, KYC rejection), tell the user to type "agent" to reach a human
- Never make up specific account details`;

export async function getAiReply(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "Our AI assistant is temporarily unavailable. Type **agent** to connect with a human agent.";
  }

  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 300,
      system:     SYSTEM,
      messages:   history,
    });
    const block = resp.content[0];
    return block.type === "text"
      ? block.text
      : "Sorry, I couldn't generate a response. Type **agent** for human support.";
  } catch {
    return "I'm having trouble connecting. Type **agent** to reach a human support agent.";
  }
}
