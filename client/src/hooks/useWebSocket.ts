import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type Listener = (event: 'connection' | 'message' | 'auth') => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private _isConnected = false;
  private _isAuthenticated = false;
  private _lastMessage: WebSocketMessage | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private currentUserId: string | null = null;
  private connecting = false;

  get isConnected() { return this._isConnected; }
  get isAuthenticated() { return this._isAuthenticated; }
  get lastMessage() { return this._lastMessage; }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: 'connection' | 'message' | 'auth') {
    this.listeners.forEach(l => l(event));
  }

  async connect(userId: string) {
    if (this.currentUserId === userId && (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.connecting) return;
    this.connecting = true;

    this.cleanupConnection();
    this.currentUserId = userId;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = async () => {
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.connecting = false;
        this.notify('connection');

        try {
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              ws.send(JSON.stringify({
                type: 'auth',
                token: session.access_token,
              }));
            }
          }
        } catch (error) {
          console.error('Failed to get Supabase session for WebSocket auth:', error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'auth_success') {
            this._isAuthenticated = true;
            console.log('WebSocket authenticated successfully');
            this.notify('auth');
          } else if (message.type === 'auth_failed') {
            this._isAuthenticated = false;
            console.error('WebSocket authentication failed:', message.message);
            this.notify('auth');
          }

          this._lastMessage = message;
          this.notify('message');
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        this.connecting = false;
      };

      ws.onclose = () => {
        this._isConnected = false;
        this._isAuthenticated = false;
        this.connecting = false;
        this.notify('connection');

        if (this.currentUserId && this.reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            if (this.currentUserId) {
              this.connect(this.currentUserId);
            }
          }, delay);
        }
      };
    } catch (error) {
      this.connecting = false;
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private cleanupConnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  disconnect() {
    this.cleanupConnection();
    this.currentUserId = null;
    this._isConnected = false;
    this._isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.notify('connection');
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this._isAuthenticated) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

const wsManager = new WebSocketManager();

export function useWebSocket() {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(wsManager.isConnected);
  const [isAuthenticated, setIsAuthenticated] = useState(wsManager.isAuthenticated);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(wsManager.lastMessage);

  useEffect(() => {
    const unsub = wsManager.subscribe((event) => {
      if (event === 'connection') {
        setIsConnected(wsManager.isConnected);
        setIsAuthenticated(wsManager.isAuthenticated);
      } else if (event === 'auth') {
        setIsAuthenticated(wsManager.isAuthenticated);
      } else if (event === 'message') {
        setLastMessage(wsManager.lastMessage);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const userId = (user as any)?.claims?.sub || (user as any)?.id;
    if (userId && userId !== userIdRef.current) {
      userIdRef.current = userId;
      wsManager.connect(userId);
    } else if (!userId && userIdRef.current) {
      userIdRef.current = null;
      wsManager.disconnect();
    }
  }, [user]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    wsManager.send(message);
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  return {
    isConnected,
    isAuthenticated,
    lastMessage,
    sendMessage,
    disconnect,
  };
}
