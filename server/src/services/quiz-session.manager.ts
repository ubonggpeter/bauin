import { getLeaderboardTop, updateLeaderboardScore, getQuizSessionState, setQuizSessionState, deleteLeaderboard, deleteQuizSessionState, type LeaderboardEntry, type QuizSessionState } from "./redis.service";
import { emitLeaderboardUpdate, emitQuizClosed, emitPrizeDistributed } from "../sockets/quiz.namespace";

const BROADCAST_INTERVAL_MS = 10_000; // 10 seconds
const TOP_N_BROADCAST = 20;

// ── QuizSessionManager singleton ──────────────────────────────────────────────

class QuizSessionManager {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  // ── Session lifecycle ───────────────────────────────────────────────────────

  async startSession(sessionId: string, totalPrizePool = 0): Promise<void> {
    if (this.intervals.has(sessionId)) return; // already running

    const state: QuizSessionState = {
      sessionId,
      status: "ACTIVE",
      startedAt: Date.now(),
      participantCount: 0,
      totalPrizePool,
    };
    await setQuizSessionState(sessionId, state);

    // Immediately broadcast current standings, then every 10 s
    await this._broadcastTop20(sessionId);

    const handle = setInterval(() => {
      this._broadcastTop20(sessionId).catch((err) =>
        console.error("[QuizSessionManager] broadcast error:", err)
      );
    }, BROADCAST_INTERVAL_MS);

    this.intervals.set(sessionId, handle);
    console.log(`[QuizSessionManager] Session ${sessionId} started`);
  }

  async stopSession(
    sessionId: string,
    reason = "Session ended"
  ): Promise<void> {
    const handle = this.intervals.get(sessionId);
    if (handle) {
      clearInterval(handle);
      this.intervals.delete(sessionId);
    }

    const state = await getQuizSessionState(sessionId);
    if (state) {
      await setQuizSessionState(sessionId, {
        ...state,
        status: "CLOSED",
        endedAt: Date.now(),
      });
    }

    emitQuizClosed(sessionId, {
      sessionId,
      reason,
      endedAt: Date.now(),
    });

    console.log(`[QuizSessionManager] Session ${sessionId} stopped: ${reason}`);
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const handle = this.intervals.get(sessionId);
    if (handle) {
      clearInterval(handle);
      this.intervals.delete(sessionId);
    }
    await Promise.all([
      deleteLeaderboard(sessionId),
      deleteQuizSessionState(sessionId),
    ]);
  }

  // ── Score management ────────────────────────────────────────────────────────

  async updateScore(
    sessionId: string,
    entry: Omit<LeaderboardEntry, "rank">
  ): Promise<void> {
    await updateLeaderboardScore(sessionId, entry);

    // Update participant count in session state
    const state = await getQuizSessionState(sessionId);
    if (state) {
      const top = await getLeaderboardTop(sessionId, 10000); // all entries
      const isNew = !top.some((e) => e.userId === entry.userId) || top.length === 1;
      if (isNew) {
        await setQuizSessionState(sessionId, {
          ...state,
          participantCount: top.length,
        });
      }
    }
  }

  // ── Prize distribution ──────────────────────────────────────────────────────

  async distributePrizes(
    sessionId: string,
    prizeMap: Array<{ rank: number; prizeNaira: number }>
  ): Promise<void> {
    const top = await getLeaderboardTop(sessionId, Math.max(...prizeMap.map((p) => p.rank)));
    const state = await getQuizSessionState(sessionId);

    const winners = prizeMap
      .map(({ rank, prizeNaira }) => {
        const entry = top[rank - 1];
        if (!entry) return null;
        return { userId: entry.userId, name: entry.name, rank, prizeNaira };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    emitPrizeDistributed(sessionId, {
      sessionId,
      winners,
      totalPrizePool: state?.totalPrizePool ?? 0,
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _broadcastTop20(sessionId: string): Promise<void> {
    const entries = await getLeaderboardTop(sessionId, TOP_N_BROADCAST);
    emitLeaderboardUpdate(sessionId, {
      sessionId,
      entries,
      timestamp: Date.now(),
    });
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  isRunning(sessionId: string): boolean {
    return this.intervals.has(sessionId);
  }

  activeSessions(): string[] {
    return Array.from(this.intervals.keys());
  }
}

export const quizSessionManager = new QuizSessionManager();
