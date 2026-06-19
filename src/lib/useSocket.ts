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
 *  order:assigned       → setPendingOffer + setActiveOrder
 *  order:cancelled      → clear pending/active offer
 *  order:status_changed → update activeOrder.status in store
 *  error                → console.warn
 *
 * ── Changes vs previous version ─────────────────────────────────
 *  FIX A  onOrderAssigned now calls setActiveOrder(offer) in addition
 *         to setPendingOffer(offer). Without this, activeOrder was
 *         always null in the store, causing all socket status updates
 *         to be silently dropped (the guard current.id === payload.order_id
 *         never matched null). Also syncs the enriched full order.
 *
 *  FIX B  onStatusChanged now handles "delivered" explicitly by
 *         calling clearDelivery() so the store cleans up correctly
 *         when the server confirms delivery, not just on cancellation.
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
        customer_id: payload.customer_id ?? "",
        rider_id: "",
        customer: {
          id: payload.customer_id ?? "",
          full_name: payload.customer_name ?? "",
          phone: payload.customer_phone ?? "",
        },
        pickup_address: payload.pickup_address,
        dropoff_address: payload.dropoff_address,
        item_description: payload.item_type ?? "",
        price_ghs: String(payload.price ?? "0"),
        pickup_coords: {
          latitude: payload.pickup_lat,
          longitude: payload.pickup_lng,
        },
        dropoff_coords: {
          latitude: payload.dropoff_lat,
          longitude: payload.dropoff_lng,
        },
        pickup_lat: String(payload.pickup_lat),
        pickup_lng: String(payload.pickup_lng),
        dropoff_lat: String(payload.dropoff_lat),
        dropoff_lng: String(payload.dropoff_lng),
        vehicle_type: "motorcycle",
        payment_method: "bundle",
        credits_used: 0,
        distance_km: payload.distance_km ?? null,
        estimated_duration_mins: null,
        proof_of_delivery_url: null,
        scheduled_at: null,
        assigned_at: null,
        collected_at: null,
        delivered_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        package_type: null,
        special_instructions: null,
        stops: [],
        saved_payment_method: null,
        created_at: payload.timestamp,
        updated_at: payload.timestamp,
      };

      // Show the offer card on HomeMapScreen
      setPendingOffer(offer);

      // FIX A: also populate activeOrder so the store is ready before
      // the rider taps Accept. useAcceptOrder.onSuccess will overwrite
      // this with the full REST response once they accept.
      setActiveOrder(offer);

      // Enrich with full order data in background
      try {
        const res = await ordersApi.getOffers();
        const full = (res.data?.data ?? []).find(
          (o: Order) => o.id === payload.order_id,
        );
        if (full) {
          setPendingOffer(full);
          // FIX A: keep activeOrder in sync with the enriched data
          setActiveOrder(full);
        }
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

      // FIX B: "delivered" means the delivery is fully complete —
      // clean up the store so ActiveDeliveryScreen navigates away.
      if (payload.status === "delivered") {
        clearDelivery();
        return;
      }

      setActiveOrder({
        ...current,
        status: payload.status as Order["status"],
        ...(payload.proof_of_delivery_url
          ? { proof_of_delivery_url: payload.proof_of_delivery_url }
          : {}),
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

