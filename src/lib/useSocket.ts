/**
 * useSocket.ts
 * ─────────────────────────────────────────────────────────────────
 * Mounts ONCE inside MainNavigator (or App root) after auth.
 *
 * Responsibilities:
 *  - Connect / disconnect as auth state changes
 *  - Wire server events → riderStore (no direct navigation here)
 *  - Navigation in response to socket events is handled by
 *    HomeMapScreen (watches pendingOffer) and ActiveDeliveryScreen
 *    (watches activeOrder.status). Keeping navigation out of this
 *    hook means it never competes with React Navigation's own state.
 *
 * ── Events handled ───────────────────────────────────────────────
 *  order:assigned       → setPendingOffer  (HomeMapScreen reacts)
 *  order:cancelled      → clear pending/active offer
 *  order:status_changed → update activeOrder.status in store
 *  error                → console.warn
 */

import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useRiderStore } from "../store/riderStore";
import { socketService, SocketOrderAssigned } from "./socket";
import { Order, ordersApi } from "./api";

export function useSocket() {
  const { isAuthenticated, rider } = useAuthStore();
  const { setActiveOrder, setPendingOffer, clearDelivery, activeOrder } =
    useRiderStore();

  // Stable ref so event handlers always see the latest activeOrder
  const activeOrderRef = useRef(activeOrder);
  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  useEffect(() => {
    if (!isAuthenticated || !rider?.id) {
      socketService.disconnect();
      return;
    }

    socketService.connect(rider.id);

    // ── order:assigned ─────────────────────────────────────────────
    const onOrderAssigned = async (payload: SocketOrderAssigned) => {
      // Build a basic offer immediately so the screen shows fast
      const offer: Order = {
        id: payload.order_id,
        status: "assigned",
        customer_name: payload.customer_name ?? "",
        customer_phone: payload.customer_phone ?? "",
        pickup_address: payload.pickup_address,
        dropoff_address: payload.dropoff_address,
        item_type: payload.item_type ?? "",
        price: payload.price ?? 0,
        pickup_eta: payload.pickup_eta,
        pickup_coords: {
          latitude: payload.pickup_lat,
          longitude: payload.pickup_lng,
        },
        dropoff_coords: {
          latitude: payload.dropoff_lat,
          longitude: payload.dropoff_lng,
        },
        created_at: payload.timestamp,
        updated_at: payload.timestamp,
      };
      setPendingOffer(offer);

      // Enrich with full order data in background
      try {
        const res = await ordersApi.getOffers();
        const full = (res.data?.data ?? []).find(
          (o: Order) => o.id === payload.order_id,
        );
        if (full) setPendingOffer(full);
      } catch {
        // silent — base offer already shown
      }
    };

    // ── order:cancelled ────────────────────────────────────────────
    // Customer cancelled BEFORE the rider accepted.
    // If rider already accepted and is mid-delivery, the same event
    // may fire — clearDelivery handles both cases.
    const onOrderCancelled = (payload: { order_id: string }) => {
      setPendingOffer(null);
      if (activeOrderRef.current?.id === payload.order_id) {
        clearDelivery();
        // ActiveDeliveryScreen watches activeOrder; when it becomes null
        // the screen navigates back to MainTabs automatically.
      }
    };

    // ── order:status_changed ───────────────────────────────────────
    // Note: spec status strings are rider_arriving | collected |
    // in_transit | delivered — NOT "arrived". Keep aligned with api.ts
    // OrderStatus union which now includes all these values.
    const onStatusChanged = (payload: {
      order_id: string;
      status: string;
      proof_of_delivery_url?: string;
    }) => {
      const current = activeOrderRef.current;
      if (!current || current.id !== payload.order_id) return;

      setActiveOrder({
        ...current,
        status: payload.status as Order["status"],
      });
      // ActiveDeliveryScreen's useEffect on activeOrder.status drives
      // the CTA and card content — no extra navigation needed here.
    };

    // ── error ──────────────────────────────────────────────────────
    const onError = (payload: { message: string; code: number }) => {
      console.warn("[Socket] server error:", payload.message, payload.code);
    };

    socketService.on("order:assigned", onOrderAssigned);
    socketService.on("order:cancelled", onOrderCancelled);
    socketService.on("order:status_changed", onStatusChanged);
    socketService.on("error", onError);

    return () => {
      socketService.off("order:assigned", onOrderAssigned);
      socketService.off("order:cancelled", onOrderCancelled);
      socketService.off("order:status_changed", onStatusChanged);
      socketService.off("error", onError);
      // Don't disconnect on cleanup — socket persists across tab navigation.
      // Disconnect only happens when isAuthenticated → false (above branch).
    };
  }, [isAuthenticated, rider?.id]);
}
