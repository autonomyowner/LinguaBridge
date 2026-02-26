/**
 * WebSocketManager — health-monitored WebSocket with auto-reconnect.
 *
 * Features:
 * - State machine: disconnected → connecting → connected → reconnecting
 * - Keepalive pings at configurable interval
 * - Stale-connection detection (no messages for N seconds → reconnect)
 * - Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
 * - Only reconnects from onclose (never onerror — avoids double-counting)
 */

export type WsState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface WsManagerConfig {
  /** Factory that returns the URL to connect to (called on each attempt). */
  createUrl: () => string;
  /** WebSocket sub-protocols (e.g. Deepgram token auth). */
  protocols?: string[];
  /** Periodic keepalive message. */
  keepalive?: {
    intervalMs: number;
    createMessage: () => string | ArrayBuffer;
  };
  /** If no messages arrive within this window, treat connection as stale. */
  healthCheck?: {
    staleTimeoutMs: number;
  };
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;   // ms
  reconnectMaxDelay: number;    // ms
  /** Called for every message received. */
  onMessage: (event: MessageEvent) => void;
  /** Called when state changes. */
  onStateChange: (state: WsState) => void;
  /** Called on errors or max-reconnect. */
  onError: (code: string, message: string, recoverable: boolean) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private _state: WsState = 'disconnected';
  private config: WsManagerConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private healthTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCloseCode = 0;
  private intentionalClose = false;

  constructor(config: WsManagerConfig) {
    this.config = config;
  }

  get state(): WsState { return this._state; }

  private setState(s: WsState): void {
    if (this._state === s) return;
    this._state = s;
    this.config.onStateChange(s);
  }

  connect(): void {
    if (this._state === 'connecting' || this._state === 'connected') return;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    if (this.ws) {
      try { this.ws.close(1000, 'client disconnect'); } catch (_) {}
      this.ws = null;
    }
    this.setState('disconnected');
  }

  /** Send data. Returns true if sent, false if not connected. */
  send(data: string | ArrayBuffer): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  get isConnected(): boolean {
    return this._state === 'connected' && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Returns a Promise that resolves when the WebSocket reaches 'connected' state,
   * or rejects on timeout / disconnect.
   */
  waitForConnected(timeoutMs: number = 10000): Promise<void> {
    if (this._state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`WebSocket did not connect within ${timeoutMs}ms`));
      }, timeoutMs);

      const originalOnStateChange = this.config.onStateChange;
      const cleanup = () => {
        clearTimeout(timer);
        this.config.onStateChange = originalOnStateChange;
      };

      this.config.onStateChange = (state: WsState) => {
        originalOnStateChange(state);
        if (state === 'connected') {
          cleanup();
          resolve();
        } else if (state === 'disconnected') {
          cleanup();
          reject(new Error('WebSocket disconnected before connecting'));
        }
      };
    });
  }

  // --- Internal ---

  private doConnect(): void {
    if (this.intentionalClose) return;

    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const url = this.config.createUrl();
    try {
      this.ws = this.config.protocols
        ? new WebSocket(url, this.config.protocols)
        : new WebSocket(url);
    } catch (err) {
      console.error('[WsManager] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      if (this.intentionalClose) { this.ws?.close(); return; }
      console.log('[WsManager] Connected');
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.startKeepalive();
      this.resetHealthCheck();
    };

    this.ws.onmessage = (event) => {
      this.resetHealthCheck();
      this.config.onMessage(event);
    };

    this.ws.onerror = () => {
      // Don't reconnect here — onclose always fires after onerror
      console.error('[WsManager] WebSocket error');
    };

    this.ws.onclose = (e) => {
      this.lastCloseCode = e.code;
      console.warn('[WsManager] Closed. Code:', e.code, 'Reason:', e.reason);
      this.ws = null;
      this.stopKeepalive();
      this.stopHealthCheck();

      if (this.intentionalClose) {
        this.setState('disconnected');
        return;
      }

      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const codeHint = this.lastCloseCode === 1008 ? ' (policy violation — check API key)'
        : this.lastCloseCode === 1006 ? ' (network issue)'
        : this.lastCloseCode ? ` (code ${this.lastCloseCode})`
        : '';
      this.config.onError(
        'max_reconnect',
        `Connection lost after ${this.config.maxReconnectAttempts} attempts${codeHint}. Please restart.`,
        false,
      );
      this.setState('disconnected');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectMaxDelay,
    );

    this.setState('reconnecting');
    this.config.onError(
      'reconnecting',
      `Reconnecting... (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`,
      true,
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.intentionalClose) return;
      this.doConnect();
    }, delay);
  }

  // --- Keepalive ---

  private startKeepalive(): void {
    this.stopKeepalive();
    if (!this.config.keepalive) return;

    const { intervalMs, createMessage } = this.config.keepalive;
    this.keepaliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try { this.ws.send(createMessage()); } catch (_) {}
      }
    }, intervalMs);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) { clearInterval(this.keepaliveTimer); this.keepaliveTimer = null; }
  }

  // --- Health check (stale detection) ---

  private resetHealthCheck(): void {
    this.stopHealthCheck();
    if (!this.config.healthCheck) return;

    this.healthTimer = setTimeout(() => {
      if (this._state !== 'connected' || this.intentionalClose) return;
      console.warn('[WsManager] Connection stale — no messages for', this.config.healthCheck!.staleTimeoutMs, 'ms. Forcing reconnect.');
      // Force close so onclose fires and reconnect logic kicks in
      if (this.ws) {
        try { this.ws.close(4000, 'stale connection'); } catch (_) {}
      }
    }, this.config.healthCheck.staleTimeoutMs);
  }

  private stopHealthCheck(): void {
    if (this.healthTimer) { clearTimeout(this.healthTimer); this.healthTimer = null; }
  }

  private clearTimers(): void {
    this.stopKeepalive();
    this.stopHealthCheck();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}
