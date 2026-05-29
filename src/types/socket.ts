// Shared Socket.IO event payload types for the Next.js client.
// Mirror the server-side definitions in server/src/sockets/*.namespace.ts

// ── /quiz ─────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
  avatarUrl?: string;
}

export interface ScoreUpdatedPayload {
  userId: string;
  name: string;
  score: number;
  rank: number;
  sessionId: string;
}

export interface LeaderboardUpdatePayload {
  sessionId: string;
  entries: LeaderboardEntry[];
  timestamp: number;
}

export interface QuizClosedPayload {
  sessionId: string;
  reason: string;
  endedAt: number;
}

export interface PrizeDistributedPayload {
  sessionId: string;
  winners: Array<{
    userId: string;
    name: string;
    rank: number;
    prizeNaira: number;
  }>;
  totalPrizePool: number;
}

export interface QuizServerToClientEvents {
  score_updated: (data: ScoreUpdatedPayload) => void;
  leaderboard_update: (data: LeaderboardUpdatePayload) => void;
  quiz_closed: (data: QuizClosedPayload) => void;
  prize_distributed: (data: PrizeDistributedPayload) => void;
}

export interface QuizClientToServerEvents {
  join_session: (sessionId: string) => void;
  leave_session: (sessionId: string) => void;
}

// ── /notifications ────────────────────────────────────────────────────────────

export interface WalletCreditedPayload {
  userId: string;
  amountNaira: number;
  newBalance: number;
  description: string;
  transactionId: string;
}

export interface JobAlertPayload {
  title: string;
  body: string;
  url?: string;
  category?: string;
  postedAt: number;
}

export interface NotificationsServerToClientEvents {
  wallet_credited: (data: WalletCreditedPayload) => void;
  job_alert: (data: JobAlertPayload) => void;
}

// ── /betting ──────────────────────────────────────────────────────────────────

export interface BettingResult {
  userId: string;
  name: string;
  betType: "TOP1" | "TOP3" | "TOP5" | "TOP10";
  stake: number;
  payout: number;
  won: boolean;
  rank: number;
}

export interface ResultsAnnouncedPayload {
  sessionId: string;
  results: BettingResult[];
  announcedAt: number;
}

export interface BettingServerToClientEvents {
  results_announced: (data: ResultsAnnouncedPayload) => void;
}

export interface BettingClientToServerEvents {
  join_session: (sessionId: string) => void;
  leave_session: (sessionId: string) => void;
}
