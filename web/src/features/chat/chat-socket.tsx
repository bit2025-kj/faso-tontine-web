import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from '../auth/auth-context';

type Frame = Record<string, any>;
type Listener = (frame: Frame) => void;

interface ChatSocketValue {
  /** Returns false (without throwing) if the socket isn't open right now — callers must check this instead of assuming the send went through. */
  send: (payload: Frame) => boolean;
  subscribe: (listener: Listener) => () => void;
}

const ChatSocketContext = createContext<ChatSocketValue | undefined>(undefined);

/**
 * One persistent WebSocket to the BFF's chat bridge (/api/chat/ws), shared
 * app-wide — mirrors the single ChatWsService singleton on the Flutter side.
 * Reconnects with exponential backoff (1s -> 60s cap) on any drop, same as
 * the mobile client.
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<Listener>());
  const attemptRef = useRef(0);
  const stoppedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (stoppedRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/chat/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
    };
    ws.onmessage = (event) => {
      let frame: Frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      listenersRef.current.forEach((listener) => listener(frame));
    };
    ws.onclose = () => {
      if (stoppedRef.current) return;
      const delay = Math.min(1000 * 2 ** attemptRef.current, 60_000);
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, connect]);

  const send = useCallback((payload: Frame): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  return <ChatSocketContext.Provider value={{ send, subscribe }}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket(): ChatSocketValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error('useChatSocket must be used within ChatSocketProvider');
  return ctx;
}
