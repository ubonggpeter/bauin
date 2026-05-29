import type { Server, Namespace } from "socket.io";
import { socketAuthMiddleware, type SocketData } from "./socket.auth";

// ── Event payload types ───────────────────────────────────────────────────────

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

interface ServerToClientEvents {
  results_announced: (data: ResultsAnnouncedPayload) => void;
}

interface ClientToServerEvents {
  join_session: (sessionId: string) => void;
  leave_session: (sessionId: string) => void;
}

// ── Module-level namespace reference ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nsp: Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData> | null = null;

export function initBettingNamespace(io: Server): void {
  _nsp = io.of("/betting");
  _nsp.use(socketAuthMiddleware as never);

  _nsp.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);

    socket.on("join_session", (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on("leave_session", (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {});
  });
}

// ── Emitters ─────────────────────────────────────────────────────────────────

export function emitResultsAnnounced(
  sessionId: string,
  data: ResultsAnnouncedPayload
): void {
  _nsp?.to(`session:${sessionId}`).emit("results_announced", data);
}
