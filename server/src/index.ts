import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import walletRouter from "./routes/wallet";
import networkRouter from "./routes/network";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

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
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/network", networkRouter);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

// Socket.IO
io.on("connection", (socket) => {
  socket.on("join", (userId: string) => {
    socket.join(`user:${userId}`);
  });
  socket.on("disconnect", () => {});
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`BAUIN server running on port ${PORT}`);
});

export default app;
