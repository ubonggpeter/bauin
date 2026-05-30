import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

// Default game content (crypto/finance themed)
const DEFAULT_CONTENT = {
  flashCards: [
    { id: "f1", front: "Blockchain", back: "A decentralized, tamper-proof distributed ledger" },
    { id: "f2", front: "Smart Contract", back: "Self-executing code that lives on the blockchain" },
    { id: "f3", front: "DeFi", back: "Decentralized Finance — financial services without banks" },
    { id: "f4", front: "NFT", back: "Non-Fungible Token — a unique, verifiable digital asset" },
    { id: "f5", front: "Web3", back: "The next internet era built on decentralized protocols" },
    { id: "f6", front: "Tokenomics", back: "The supply, demand, and distribution model of a token" },
  ],
  memoryPairs: [
    { id: "p1", a: "Bitcoin",      b: "First Cryptocurrency" },
    { id: "p2", a: "Ethereum",     b: "Smart Contract Platform" },
    { id: "p3", a: "Wallet",       b: "Stores Private Keys" },
    { id: "p4", a: "Mining",       b: "Validates Transactions" },
    { id: "p5", a: "HODL",         b: "Hold On for Dear Life" },
    { id: "p6", a: "Bull Market",  b: "Prices Consistently Rising" },
    { id: "p7", a: "Bear Market",  b: "Prices Consistently Falling" },
    { id: "p8", a: "Gas Fee",      b: "Ethereum Transaction Cost" },
  ],
  sequence: [
    { id: "s1", text: "Create a secure crypto wallet", order: 1 },
    { id: "s2", text: "Complete identity verification (KYC)", order: 2 },
    { id: "s3", text: "Fund your account via bank transfer", order: 3 },
    { id: "s4", text: "Buy your first Bitcoin or Ethereum", order: 4 },
    { id: "s5", text: "Enable two-factor authentication", order: 5 },
    { id: "s6", text: "Diversify across multiple assets", order: 6 },
  ],
  fillGap: [
    { id: "g1", sentence: "Bitcoin was created by ___.", options: ["Satoshi Nakamoto", "Elon Musk", "Bill Gates", "Vitalik Buterin"], answer: "Satoshi Nakamoto" },
    { id: "g2", sentence: "The maximum supply of Bitcoin is ___ million coins.", options: ["21", "100", "50", "42"], answer: "21" },
    { id: "g3", sentence: "Ethereum was co-founded by ___.", options: ["Vitalik Buterin", "Satoshi Nakamoto", "Charlie Lee", "Roger Ver"], answer: "Vitalik Buterin" },
    { id: "g4", sentence: "You pay ___ fees to execute Ethereum transactions.", options: ["Gas", "Oil", "Miner", "Proof"], answer: "Gas" },
    { id: "g5", sentence: "A crypto ___ stores your private keys securely.", options: ["Wallet", "Bank", "Exchange", "Node"], answer: "Wallet" },
  ],
  trueFalse: [
    { id: "t1", statement: "Bitcoin has a fixed maximum supply of 21 million coins.", answer: true },
    { id: "t2", statement: "Ethereum was invented before Bitcoin.", answer: false },
    { id: "t3", statement: "Confirmed blockchain transactions can be reversed.", answer: false },
    { id: "t4", statement: "DeFi stands for Decentralized Finance.", answer: true },
    { id: "t5", statement: "You need a traditional bank account to use cryptocurrency.", answer: false },
  ],
};

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  const collection = await prisma.distributorCollection.findUnique({
    where: { publicLinkCode: code },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Find or create the active quiz session
  let session = await prisma.quizSession.findFirst({
    where: {
      distributorCollectionId: collection.id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entries: true } },
      bets:   { select: { stake: true } },
    },
  });

  if (!session) {
    // Auto-create a session when the first player lands on the lobby
    const created = await prisma.quizSession.create({
      data: {
        distributorCollectionId: collection.id,
        title: collection.name,
        status: "PENDING",
      },
      include: {
        _count: { select: { entries: true } },
        bets:   { select: { stake: true } },
      },
    });
    session = created;
  }

  const playerCount = session._count.entries;
  const betTotal    = session.bets.reduce((s, b) => s + Number(b.stake), 0);
  // Prize pool = bet total + base ₦500 per player entry
  const prizePool   = Math.round(betTotal + playerCount * 500);

  const royaltyPct = await getNumericSetting("STORY_ROYALTY_PCT_DEFAULT", 15);

  return NextResponse.json({
    collection: {
      id:                  collection.id,
      name:                collection.name,
      description:         collection.description,
      publicLinkCode:      collection.publicLinkCode,
      isInUse:             collection.isInUse,
      scheduledActivateAt: collection.scheduledActivateAt?.toISOString() ?? null,
      hostName:            collection.user?.name ?? "Host",
    },
    session: {
      id:         session.id,
      status:     session.status,
      title:      session.title ?? collection.name,
      startedAt:  session.startedAt?.toISOString()  ?? null,
      endedAt:    session.endedAt?.toISOString()    ?? null,
    },
    playerCount,
    prizePool,
    royaltyPct,
    gameContent: DEFAULT_CONTENT,
  });
}
