import type { Server } from "socket.io";
import { initQuizNamespace } from "./quiz.namespace";
import { initNotificationsNamespace } from "./notifications.namespace";
import { initBettingNamespace } from "./betting.namespace";

export function initSockets(io: Server): void {
  initQuizNamespace(io);
  initNotificationsNamespace(io);
  initBettingNamespace(io);
  console.log("[sockets] Namespaces registered: /quiz, /notifications, /betting");
}

// Re-export all emitters so callers import from a single location
export {
  emitScoreUpdated,
  emitLeaderboardUpdate,
  emitQuizClosed,
  emitPrizeDistributed,
} from "./quiz.namespace";

export {
  emitWalletCredited,
  emitJobAlert,
  broadcastJobAlert,
} from "./notifications.namespace";

export { emitResultsAnnounced } from "./betting.namespace";

// Re-export payload types
export type { ScoreUpdatedPayload, LeaderboardUpdatePayload, QuizClosedPayload, PrizeDistributedPayload } from "./quiz.namespace";
export type { WalletCreditedPayload, JobAlertPayload } from "./notifications.namespace";
export type { BettingResult, ResultsAnnouncedPayload } from "./betting.namespace";
