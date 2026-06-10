/**
 * socket.ts
 * ─────────────────────────────────────────────────────────────────
 * Socket.IO client for the VoltGo Rider app.
 *
 * Server: wss://api.voltgoapp.com  (root — no /api/v1 prefix)
 *
 * ── Rider emits ──────────────────────────────────────────────────
 *  connect_rider   → join rider room  (send on connect)
 *  connect_customer→ join customer room (for customer-facing use)
 *
 * ── Server listens ───────────────────────────────────────────────
 *  connected         → room join confirmed
 *  order:assigned    → dispatch sent rider a new order
 *  order:cancelled   → customer cancelled before accept
 *  order:status_changed → status update after accept (arrived/collected/in_transit/delivered)
 *  rider:location    → server ACK of GPS push
 *  error             → server-side error
 *
 * ── Usage ────────────────────────────────────────────────────────
 *  socketService.connect(riderId)   — call once after login
 *  socketService.disconnect()       — call on logout
 *  socketService.on(event, handler) — subscribe
 *  socketService.off(event, handler)— unsubscribe
 */

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

// ── Types (mirroring the socket-events spec) ──────────────────────────────────

export interface SocketOrderAssigned {
  order_id:        string;
  customer_id:     string;
  pickup_address:  string;
  pickup_lat:      number;
  pickup_lng:      number;
  dropoff_address: string;
  dropoff_lat:     number;
  dropoff_lng:     number;
  distance_km:     number;
  message:         string;
  timestamp:       string;
}

export interface SocketOrderCancelled {
  order_id:  string;
  message:   string;
  timestamp: string;
}

export type OrderStatusChangedStatus =
  | 'rider_arriving'
  | 'collected'
  | 'in_transit'
  | 'delivered';

export interface SocketOrderStatusChanged {
  order_id:               string;
  userId:                 string;
  status:                 OrderStatusChangedStatus;
  rider?: {
    id:         string;
    full_name:  string;
    phone:      string;
  };
  proof_of_delivery_url?: string;   // included on delivered only
  timestamp:              string;
}

export interface SocketRiderLocation {
  order_id:  string;
  lat:       number;
  lng:       number;
  timestamp: string;
}

export interface SocketError {
  message: string;
  code:    number;
}

export type SocketEventMap = {
  connected:            { message: string; socketId: string; timestamp: string; userId: string };
  'order:assigned':     SocketOrderAssigned;
  'order:cancelled':    SocketOrderCancelled;
  'order:status_changed': SocketOrderStatusChanged;
  'rider:location':     SocketRiderLocation;
  error:                SocketError;
};

// ── Internal singleton ────────────────────────────────────────────────────────
const SOCKET_URL = 'wss://api.voltgoapp.com';

class SocketService {
  private socket: Socket | null = null;
  private riderId: string | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 5;

  /** Connect + authenticate the socket for a given rider. */
  async connect(riderId: string): Promise<void> {
    // Avoid double-connecting
    if (this.socket?.connected && this.riderId === riderId) return;

    this.riderId = riderId;
    const token = await getAccessToken();

    this.socket = io(SOCKET_URL, {
      transports:         ['websocket'],
      reconnection:       true,
      reconnectionDelay:  1_500,
      reconnectionAttempts: this.MAX_RECONNECT,
      auth: { token: token ?? '' },
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      // Immediately join rider room after connecting
      this.socket?.emit('connect_rider', {
        riderId,
        socketId:  this.socket?.id,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts++;
      console.warn('[Socket] connect_error', err.message, `(attempt ${this.reconnectAttempts})`);
    });

    this.socket.on('disconnect', (reason) => {
      console.info('[Socket] disconnected:', reason);
    });
  }

  /** Cleanly disconnect and reset. */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.riderId = null;
    this.reconnectAttempts = 0;
  }

  /** Subscribe to a typed socket event. */
  on<K extends keyof SocketEventMap>(
    event: K,
    handler: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.on(event as string, handler as any);
  }

  /** Unsubscribe from a typed socket event. */
  off<K extends keyof SocketEventMap>(
    event: K,
    handler?: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.off(event as string, handler as any);
  }

  /** Emit any event (for future use). */
  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export a single shared instance
export const socketService = new SocketService();
