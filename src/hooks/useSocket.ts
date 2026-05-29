"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

interface UseSocketReturn<
  ServerToClient extends Record<string, (...args: never[]) => void> = Record<string, (...args: never[]) => void>,
  ClientToServer extends Record<string, (...args: never[]) => void> = Record<string, (...args: never[]) => void>
> {
  socket: Socket<ServerToClient, ClientToServer> | null;
  isConnected: boolean;
  error: string | null;
  /** Manually reconnect (e.g. after a token refresh). */
  reconnect: () => void;
}

/**
 * Connect to a Socket.IO namespace with JWT authentication.
 * The JWT is taken from the active NextAuth session's backendToken.
 *
 * @param namespace - e.g. "/quiz", "/notifications", "/betting"
 *
 * @example
 * const { socket, isConnected } = useSocket<QuizServerToClientEvents, QuizClientToServerEvents>('/quiz');
 * useEffect(() => {
 *   if (!socket) return;
 *   socket.emit('join_session', sessionId);
 *   socket.on('leaderboard_update', handler);
 *   return () => { socket.off('leaderboard_update', handler); };
 * }, [socket, sessionId]);
 */
export function useSocket<
  ServerToClient extends Record<string, (...args: never[]) => void> = Record<string, (...args: never[]) => void>,
  ClientToServer extends Record<string, (...args: never[]) => void> = Record<string, (...args: never[]) => void>
>(namespace: string): UseSocketReturn<ServerToClient, ClientToServer> {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket<ServerToClient, ClientToServer> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Increment to force a reconnect
  const [reconnectKey, setReconnectKey] = useState(0);

  const token = session?.user?.backendToken;

  useEffect(() => {
    // Wait until the session is resolved and a token is available
    if (status === "loading" || !token) return;

    const url = `${SOCKET_URL}${namespace}`;

    const socket = io(url, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      autoConnect: true,
    }) as Socket<ServerToClient, ClientToServer>;

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err: Error) => {
      setError(err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
    // reconnectKey forces a full disconnect/reconnect when manually triggered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, token, status, reconnectKey]);

  const reconnect = useCallback(() => {
    setReconnectKey((k) => k + 1);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    reconnect,
  };
}
