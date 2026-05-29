import type { Server, Namespace } from "socket.io";
import { socketAuthMiddleware, type SocketData } from "./socket.auth";

// ── Event payload types ───────────────────────────────────────────────────────

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

interface ServerToClientEvents {
  wallet_credited: (data: WalletCreditedPayload) => void;
  job_alert: (data: JobAlertPayload) => void;
}

// Notifications are entirely server-pushed; no client events needed
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ClientToServerEvents {}

// ── Module-level namespace reference ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nsp: Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData> | null = null;

export function initNotificationsNamespace(io: Server): void {
  _nsp = io.of("/notifications");
  _nsp.use(socketAuthMiddleware as never);

  _nsp.on("connection", (socket) => {
    // Auto-join user's personal room on connect
    socket.join(`user:${socket.data.userId}`);
    socket.on("disconnect", () => {});
  });
}

// ── Emitters ─────────────────────────────────────────────────────────────────

export function emitWalletCredited(
  userId: string,
  data: WalletCreditedPayload
): void {
  _nsp?.to(`user:${userId}`).emit("wallet_credited", data);
}

export function emitJobAlert(userId: string, data: JobAlertPayload): void {
  _nsp?.to(`user:${userId}`).emit("job_alert", data);
}

/** Broadcast a job alert to all connected users (e.g. new platform opportunity). */
export function broadcastJobAlert(data: JobAlertPayload): void {
  _nsp?.emit("job_alert", data);
}
