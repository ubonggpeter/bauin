import type { Server, Namespace } from "socket.io";
import { socketAuthMiddleware, type SocketData } from "./socket.auth";

// ── Event payload types ───────────────────────────────────────────────────────

export interface ScoreUpdatedPayload {
  userId: string;
  name: string;
  score: number;
  rank: number;
  sessionId: string;
}

export interface LeaderboardUpdatePayload {
  sessionId: string;
  entries: Array<{
    userId: string;
    name: string;
    score: number;
    rank: number;
    avatarUrl?: string;
  }>;
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

interface ServerToClientEvents {
  score_updated: (data: ScoreUpdatedPayload) => void;
  leaderboard_update: (data: LeaderboardUpdatePayload) => void;
  quiz_closed: (data: QuizClosedPayload) => void;
  prize_distributed: (data: PrizeDistributedPayload) => void;
}

interface ClientToServerEvents {
  join_session: (sessionId: string) => void;
  leave_session: (sessionId: string) => void;
}

// ── Module-level namespace reference ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nsp: Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData> | null = null;

export function initQuizNamespace(io: Server): void {
  _nsp = io.of("/quiz");
  _nsp.use(socketAuthMiddleware as never);

  _nsp.on("connection", (socket) => {
    const userId = socket.data.userId;
    // Auto-join personal room for direct pushes
    socket.join(`user:${userId}`);

    socket.on("join_session", (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on("leave_session", (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {});
  });
}

// ── Emitters (callable from any server-side service) ─────────────────────────

export function emitScoreUpdated(sessionId: string, data: ScoreUpdatedPayload): void {
  _nsp?.to(`session:${sessionId}`).emit("score_updated", data);
}

export function emitLeaderboardUpdate(
  sessionId: string,
  data: LeaderboardUpdatePayload
): void {
  _nsp?.to(`session:${sessionId}`).emit("leaderboard_update", data);
}

export function emitQuizClosed(sessionId: string, data: QuizClosedPayload): void {
  _nsp?.to(`session:${sessionId}`).emit("quiz_closed", data);
}

export function emitPrizeDistributed(
  sessionId: string,
  data: PrizeDistributedPayload
): void {
  _nsp?.to(`session:${sessionId}`).emit("prize_distributed", data);
}
