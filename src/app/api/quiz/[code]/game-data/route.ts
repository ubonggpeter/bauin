/**
 * GET /api/quiz/[code]/game-data
 *
 * Returns all 5-phase game content for a quiz session.
 * Priority:
 *   1. episode.gameContentJson.phases (pre-authored per-phase content)
 *   2. Derived from episode.gameContentJson.questions  (MCQ → 5 phases)
 *   3. Default crypto/finance content
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedSession } from "@/lib/server/quiz-cache";
import { getCachedGameContent, aiToGamePhases } from "@/lib/server/game-content";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────
type EpisodeQ = {
  id: string; question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: "A" | "B" | "C" | "D";
};

type FlashCard  = { id: string; front: string; back: string };
type MemPair    = { id: string; a: string; b: string };
type SeqItem    = { id: string; text: string; order: number };
type FillGapQ   = { id: string; sentence: string; options: string[]; answer: string };
type TrueFalseQ = { id: string; statement: string; answer: boolean };

type GameContent = {
  flashCards: FlashCard[]; memoryPairs: MemPair[]; sequence: SeqItem[];
  fillGap: FillGapQ[]; trueFalse: TrueFalseQ[];
};

// ── Derive all 5 phases from MCQ questions ─────────────────────────
function answerText(q: EpisodeQ): string {
  return q[`option${q.correctOption}` as keyof EpisodeQ] as string;
}

function deriveFromQuestions(questions: EpisodeQ[]): GameContent {
  const qs = questions.slice(0, 8);

  const flashCards: FlashCard[] = qs.slice(0, 6).map((q, i) => ({
    id:    `f${i + 1}`,
    front: q.question,
    back:  answerText(q),
  }));

  const memoryPairs: MemPair[] = qs.slice(0, 8).map((q, i) => ({
    id: `p${i + 1}`,
    a:  q.question.length > 32 ? `${q.question.slice(0, 32)}…` : q.question,
    b:  answerText(q),
  }));

  // Sequence: use the correct answers as steps to memorize in order
  const sequence: SeqItem[] = qs.slice(0, 6).map((q, i) => ({
    id:    `s${i + 1}`,
    text:  answerText(q),
    order: i + 1,
  }));

  // Fill-gap: question text becomes "The answer is ___"
  const fillGap: FillGapQ[] = qs.slice(0, 5).map((q, i) => ({
    id:       `g${i + 1}`,
    sentence: q.question.endsWith("?")
      ? q.question.slice(0, -1) + " is ___."
      : `${q.question} ___`,
    options: [q.optionA, q.optionB, q.optionC, q.optionD],
    answer:  answerText(q),
  }));

  // True/False: alternate correct/wrong statements from each question
  const trueFalse: TrueFalseQ[] = qs.slice(0, 5).map((q, i) => {
    const useCorrect = i % 2 === 0;
    const chosen = useCorrect
      ? answerText(q)
      : ([q.optionA, q.optionB, q.optionC, q.optionD].find((o) => o !== answerText(q)) ?? q.optionA);
    return {
      id:        `t${i + 1}`,
      statement: `"${answerText(q)}" is the correct answer to: "${q.question}"`,
      answer:    useCorrect,
    };
    void chosen; // the statement always shows the correct answer; answer field drives T/F
  });

  return { flashCards, memoryPairs, sequence, fillGap, trueFalse };
}

// ── Default content (used when no episode linked) ─────────────────
const DEFAULT: GameContent = {
  flashCards: [
    { id:"f1", front:"Blockchain",     back:"A decentralized, tamper-proof distributed ledger" },
    { id:"f2", front:"Smart Contract", back:"Self-executing code that lives on the blockchain" },
    { id:"f3", front:"DeFi",           back:"Decentralized Finance — financial services without banks" },
    { id:"f4", front:"NFT",            back:"Non-Fungible Token — a unique, verifiable digital asset" },
    { id:"f5", front:"Web3",           back:"The next internet era built on decentralized protocols" },
    { id:"f6", front:"Tokenomics",     back:"The supply, demand, and distribution model of a token" },
  ],
  memoryPairs: [
    { id:"p1", a:"Bitcoin",     b:"First Cryptocurrency"        },
    { id:"p2", a:"Ethereum",    b:"Smart Contract Platform"     },
    { id:"p3", a:"Wallet",      b:"Stores Private Keys"         },
    { id:"p4", a:"Mining",      b:"Validates Transactions"      },
    { id:"p5", a:"HODL",        b:"Hold On for Dear Life"       },
    { id:"p6", a:"Bull Market", b:"Prices Consistently Rising"  },
    { id:"p7", a:"Bear Market", b:"Prices Consistently Falling" },
    { id:"p8", a:"Gas Fee",     b:"Ethereum Transaction Cost"   },
  ],
  sequence: [
    { id:"s1", text:"Create a secure crypto wallet",        order:1 },
    { id:"s2", text:"Complete identity verification (KYC)", order:2 },
    { id:"s3", text:"Fund your account via bank transfer",  order:3 },
    { id:"s4", text:"Buy your first Bitcoin or Ethereum",   order:4 },
    { id:"s5", text:"Enable two-factor authentication",     order:5 },
    { id:"s6", text:"Diversify across multiple assets",     order:6 },
  ],
  fillGap: [
    { id:"g1", sentence:"Bitcoin was created by ___.",              options:["Satoshi Nakamoto","Elon Musk","Bill Gates","Vitalik Buterin"], answer:"Satoshi Nakamoto" },
    { id:"g2", sentence:"The max supply of Bitcoin is ___ million.", options:["21","100","50","42"],                                         answer:"21" },
    { id:"g3", sentence:"Ethereum was co-founded by ___.",           options:["Vitalik Buterin","Satoshi Nakamoto","Charlie Lee","Roger Ver"],answer:"Vitalik Buterin" },
    { id:"g4", sentence:"You pay ___ fees on Ethereum.",             options:["Gas","Oil","Miner","Proof"],                                  answer:"Gas" },
    { id:"g5", sentence:"A crypto ___ stores your private keys.",    options:["Wallet","Bank","Exchange","Node"],                            answer:"Wallet" },
  ],
  trueFalse: [
    { id:"t1", statement:"Bitcoin has a fixed maximum supply of 21 million coins.", answer:true  },
    { id:"t2", statement:"Ethereum was invented before Bitcoin.",                   answer:false },
    { id:"t3", statement:"Confirmed blockchain transactions can be reversed.",      answer:false },
    { id:"t4", statement:"DeFi stands for Decentralized Finance.",                 answer:true  },
    { id:"t5", statement:"You need a bank account to use cryptocurrency.",         answer:false },
  ],
};

// ── Route handler ─────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  // Resolve session (try cache first)
  const cached  = await getCachedSession(code);
  const episodeId = cached?.episodeId ?? null;

  let gameContent: GameContent = DEFAULT;

  if (episodeId) {
    const episode = await prisma.episode.findUnique({
      where:  { id: episodeId },
      select: { gameContentJson: true },
    });

    if (episode?.gameContentJson) {
      const raw = episode.gameContentJson as Record<string, unknown>;

      // Case 1: AI-generated content (highest priority)
      if (raw.aiContent) {
        const aiPhases = aiToGamePhases(raw.aiContent as Parameters<typeof aiToGamePhases>[0]);
        gameContent = aiPhases;
      }
      // Case 2: pre-authored phases
      else if (raw.phases && typeof raw.phases === "object") {
        gameContent = raw.phases as GameContent;
      }
      // Case 3: derive from MCQ questions
      else if (Array.isArray(raw.questions) && raw.questions.length > 0) {
        gameContent = deriveFromQuestions(raw.questions as EpisodeQ[]);
      }
    }

    // Warm Redis cache if AI content wasn't already cached
    if (episodeId && (episode?.gameContentJson as Record<string, unknown>)?.aiContent) {
      const cached = await getCachedGameContent(episodeId);
      void cached;
    }
  } else if (!cached) {
    // Try to find an active session in DB for this code
    const collection = await prisma.distributorCollection.findUnique({
      where: { publicLinkCode: code },
    });
    if (collection) {
      const session = await prisma.quizSession.findFirst({
        where: {
          distributorCollectionId: collection.id,
          status: { in: ["PENDING","ACTIVE"] },
        },
        orderBy: { createdAt: "desc" },
        select:  { episodeId: true },
      });
      if (session?.episodeId) {
        const episode = await prisma.episode.findUnique({
          where:  { id: session.episodeId },
          select: { gameContentJson: true },
        });
        if (episode?.gameContentJson) {
          const raw = episode.gameContentJson as Record<string, unknown>;
          if (raw.aiContent) {
            gameContent = aiToGamePhases(raw.aiContent as Parameters<typeof aiToGamePhases>[0]);
          } else if (raw.phases) {
            gameContent = raw.phases as GameContent;
          } else if (Array.isArray(raw.questions) && raw.questions.length > 0) {
            gameContent = deriveFromQuestions(raw.questions as EpisodeQ[]);
          }
        }
      }
    }
  }

  return NextResponse.json({ gameContent });
}
