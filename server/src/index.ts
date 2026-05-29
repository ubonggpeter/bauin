import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import walletRouter from "./routes/wallet";
import networkRouter from "./routes/network";
import paymentsRouter from "./routes/payments";
import adminAutoApprovalRouter from "./routes/admin/auto-approval";
import adminAuthRouter from "./routes/admin/auth";
import uploadRouter from "./routes/upload";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { seedAutoApprovalRules } from "./scripts/seed-auto-approval";
import { startEmailProcessor } from "./services/email";
import { initSockets } from "./sockets";

const app = express();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));

// Raw body for Paystack webhook signature verification — must precede express.json()
app.use("/api/payments/webhook", express.raw({ type: "*/*" }));

app.use(express.json());
app.use(rateLimiter);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/network", networkRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin/auto-approval", adminAutoApprovalRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/upload", uploadRouter);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

// Socket.IO namespaces (/quiz, /notifications, /betting) with JWT auth
initSockets(io);

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`BAUIN server running on port ${PORT}`);
  // Seed default auto-approval rules on every cold start (idempotent)
  seedAutoApprovalRules().catch((e) =>
    console.error("[seed] Auto-approval rules failed:", e)
  );
  // Start Bull email queue worker
  startEmailProcessor();
});

export default app;
