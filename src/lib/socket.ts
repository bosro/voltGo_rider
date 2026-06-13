/**
 * socket.ts
 * ─────────────────────────────────────────────────────────────────
 * Socket.IO client for the VoltGo Rider app.
 *
 * Server: wss://api.voltgoapp.com  (root — no /api/v1 prefix)
 *
 * ── Rider emits ──────────────────────────────────────────────────
 *  connect_rider        → join rider room  (send immediately on connect)
 *
 * ── Server emits to rider ────────────────────────────────────────
 *  connected            → room join confirmed
 *  order:assigned       → dispatch assigned a new order
 *  order:cancelled      → customer cancelled before rider accepted
 *  order:status_changed → status update after accept
 *  rider:location       → server ACK of GPS push
 *  error                → server-side error
 *
 * STATUS VALUES from spec:
 *  rider_arriving | collected | in_transit | delivered
 */

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SocketOrderAssigned {
  order_id: string;
  customer_id: string;
  customer_name: string; // ← add
  customer_phone: string; // ← add
  item_type: string; // ← add
  price: number; // ← add
  pickup_eta?: number; // ← add
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number;
  message: string;
  timestamp: string;
}

export interface SocketOrderCancelled {
  order_id: string;
  message: string;
  timestamp: string;
}

/** Exact status strings as defined in the socket-events spec */
export type OrderStatusChangedStatus =
  | "rider_arriving" // rider accepted → heading to pickup
  | "collected" // rider collected the package
  | "in_transit" // rider on the way to drop-off
  | "delivered"; // proof submitted, delivery done

export interface SocketOrderStatusChanged {
  order_id: string;
  userId: string;
  status: OrderStatusChangedStatus;
  /** Only present on rider_arriving — rider identity */
  rider?: {
    id: string;
    full_name: string;
    phone: string;
  };
  /** Only present on delivered */
  proof_of_delivery_url?: string;
  timestamp: string;
}

export interface SocketRiderLocation {
  order_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface SocketError {
  message: string;
  code: number;
}

export type SocketEventMap = {
  connected: {
    message: string;
    socketId: string;
    timestamp: string;
    userId: string;
  };
  "order:assigned": SocketOrderAssigned;
  "order:cancelled": SocketOrderCancelled;
  "order:status_changed": SocketOrderStatusChanged;
  "rider:location": SocketRiderLocation;
  error: SocketError;
};

// ── Singleton ─────────────────────────────────────────────────────────────────
const SOCKET_URL = "wss://api.voltgoapp.com";

class SocketService {
  private socket: Socket | null = null;
  private riderId: string | null = null;
  private readonly MAX_RECONNECT = 5;

  async connect(riderId: string): Promise<void> {
    if (this.socket?.connected && this.riderId === riderId) return;

    this.riderId = riderId;
    const token = await getAccessToken();

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1_500,
      reconnectionAttempts: this.MAX_RECONNECT,
      auth: { token: token ?? "" },
    });

    this.socket.on("connect", () => {
      this.socket?.emit("connect_rider", {
        riderId,
        socketId: this.socket?.id,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on("connect_error", (err) => {
      console.warn("[Socket] connect_error", err.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.info("[Socket] disconnected:", reason);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.riderId = null;
  }

  on<K extends keyof SocketEventMap>(
    event: K,
    handler: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.on(event as string, handler as any);
  }

  off<K extends keyof SocketEventMap>(
    event: K,
    handler?: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.off(event as string, handler as any);
  }

  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  onConnectionChange(onConnect: () => void, onDisconnect: () => void): void {
    this.socket?.on("connect", onConnect);
    this.socket?.on("disconnect", onDisconnect);
  }

  offConnectionChange(onConnect: () => void, onDisconnect: () => void): void {
    this.socket?.off("connect", onConnect);
    this.socket?.off("disconnect", onDisconnect);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
