/**
 * riderStore.ts
 * ─────────────────────────────────────────────────────────────────
 * Zustand store for runtime rider state that changes frequently:
 *
 *  - online / offline status (optimistic toggle)
 *  - current active order (populated from API or incoming offer)
 *  - last-known GPS coordinates (updated by location heartbeat)
 *
 * This store intentionally does NOT hold all server state — use
 * TanStack Query hooks for data that benefits from caching,
 * background refresh, and loading/error lifecycle. This store
 * holds ephemeral, fast-changing UI state that multiple screens
 * need simultaneously without a query hierarchy.
 */

import { create } from "zustand";
import { Coordinates, Order, OrderOffer } from "../lib/api";

// ── Store shape ───────────────────────────────────────────────────────────────
interface RiderState {
  // Online status
  isOnline: boolean;
  isTogglingStatus: boolean; // true while PUT /rider/status is in-flight

  // Active order
  activeOrder: Order | null;
  pendingOffer: OrderOffer | null; // incoming offer waiting for accept/decline

  // Location
  currentCoords: Coordinates | null;

  // Actions
  setOnline: (online: boolean) => void;
  setTogglingStatus: (v: boolean) => void;
  setActiveOrder: (order: Order | null) => void;
  setPendingOffer: (offer: OrderOffer | null) => void;
  setCurrentCoords: (coords: Coordinates) => void;
  clearDelivery: () => void;
}

// ── Store implementation ──────────────────────────────────────────────────────
export const useRiderStore = create<RiderState>((set) => ({
  isOnline: true,
  isTogglingStatus: false,
  activeOrder: null,
  pendingOffer: null,
  currentCoords: null,

  setOnline: (isOnline) => set({ isOnline }),
  setTogglingStatus: (v) => set({ isTogglingStatus: v }),
  setActiveOrder: (activeOrder) => set({ activeOrder }),
  setPendingOffer: (pendingOffer) => set({ pendingOffer }),
  setCurrentCoords: (currentCoords) => set({ currentCoords }),

  /** Called when a delivery is completed or cancelled — resets order state. */
  clearDelivery: () => set({ activeOrder: null, pendingOffer: null }),
}));






