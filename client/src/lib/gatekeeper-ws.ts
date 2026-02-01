import { useEffect, useState, useCallback, useRef } from "react";

export type LockState = "LOCKED" | "UNLOCKED";

export interface AciState {
  aci_id: string;
  lock_state: LockState;
  last_verified_at: string | null;
  last_error: string | null;
  flygate: {
    reachable: boolean;
    last_seen_at: string | null;
  };
}

interface WebSocketMessage {
  type: "state_change";
  data: AciState;
}

export function useGatekeeperState() {
  const [state, setState] = useState<AciState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[gatekeeper-ws] Connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === "state_change") {
          setState(message.data);
        }
      } catch (e) {
        console.error("[gatekeeper-ws] Failed to parse message:", e);
      }
    };

    ws.onclose = () => {
      console.log("[gatekeeper-ws] Disconnected, reconnecting in 2s...");
      setConnected(false);
      wsRef.current = null;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (error) => {
      console.error("[gatekeeper-ws] Error:", error);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const manualUnlock = useCallback(async () => {
    try {
      const response = await fetch("/api/gatekeeper/unlock", { method: "POST" });
      const data = await response.json();
      if (data.state) {
        setState(data.state);
      }
    } catch (e) {
      console.error("[gatekeeper] Failed to unlock:", e);
    }
  }, []);

  const manualLock = useCallback(async () => {
    try {
      const response = await fetch("/api/gatekeeper/lock", { method: "POST" });
      const data = await response.json();
      if (data.state) {
        setState(data.state);
      }
    } catch (e) {
      console.error("[gatekeeper] Failed to lock:", e);
    }
  }, []);

  return {
    state,
    connected,
    isLocked: state?.lock_state === "LOCKED",
    isUnlocked: state?.lock_state === "UNLOCKED",
    manualUnlock,
    manualLock,
  };
}
