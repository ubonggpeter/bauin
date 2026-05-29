import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

export interface SocketData {
  userId: string;
}

type SocketWithData = Socket & { data: SocketData };

/**
 * Socket.IO middleware that validates the JWT token sent in handshake.auth.token.
 * Sets socket.data.userId on success; calls next(err) on failure.
 */
export function socketAuthMiddleware(
  socket: SocketWithData,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication token required"));
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "changeme"
    ) as { userId: string };

    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
