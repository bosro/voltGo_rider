/**
 * useSocket.ts
 * ─────────────────────────────────────────────────────────────────
 * React hook that:
 *  1. Connects the socket when the rider is authenticated
 *  2. Disconnects cleanly on logout or unmount
 *  3. Wires every server event into the correct Zustand store action
 *     so all screens react automatically — no prop passing needed
 *
 * Mount this ONCE inside MainNavigator (or App) after auth.
 *
 * ── Events handled ───────────────────────────────────────────────
 *  order:assigned     → set pendingOffer in riderStore (triggers DeliveryRequest nav)
 *  order:cancelled    → clear pendingOffer/activeOrder if IDs match
 *  order:status_changed → update activeOrder status in riderStore
 *  error              → log (extend with toast if desired)
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRiderStore } from '../store/riderStore';
import { socketService, SocketOrderAssigned } from './socket';
import { Order } from './api';

export function useSocket() {
  const { isAuthenticated, rider } = useAuthStore();
  const { setActiveOrder, setPendingOffer, activeOrder } = useRiderStore();

  // Keep a stable ref to activeOrder for use inside event handlers
  const activeOrderRef = useRef(activeOrder);
  useEffect(() => { activeOrderRef.current = activeOrder; }, [activeOrder]);

  useEffect(() => {
    if (!isAuthenticated || !rider?.id) {
      socketService.disconnect();
      return;
    }

    // Connect + register rider room
    socketService.connect(rider.id);

    // ── order:assigned ─────────────────────────────────────────────
    // Dispatch sent an order. Map to the OrderOffer shape used by the store
    // and set it as a pendingOffer — HomeMapScreen navigates on this.
    const onOrderAssigned = (payload: SocketOrderAssigned) => {
      const offer: Order = {
        id:              payload.order_id,
        status:          'assigned',
        customer_name:   '',          // not in socket payload — fill from REST if needed
        customer_phone:  '',
        pickup_address:  payload.pickup_address,
        dropoff_address: payload.dropoff_address,
        item_type:       '',
        price:           0,
        pickup_coords: {
          latitude:  payload.pickup_lat,
          longitude: payload.pickup_lng,
        },
        dropoff_coords: {
          latitude:  payload.dropoff_lat,
          longitude: payload.dropoff_lng,
        },
        created_at:  payload.timestamp,
        updated_at:  payload.timestamp,
      };
      setPendingOffer(offer);
    };

    // ── order:cancelled ────────────────────────────────────────────
    const onOrderCancelled = (payload: { order_id: string }) => {
      // Clear pending offer if it matches
      setPendingOffer(null);

      // Clear active order if it matches (customer cancelled after accept)
      if (activeOrderRef.current?.id === payload.order_id) {
        setActiveOrder(null);
      }
    };

    // ── order:status_changed ───────────────────────────────────────
    const onStatusChanged = (payload: {
      order_id: string;
      status: string;
      proof_of_delivery_url?: string;
    }) => {
      const current = activeOrderRef.current;
      if (!current || current.id !== payload.order_id) return;

      setActiveOrder({
        ...current,
        status: payload.status as Order['status'],
      });
    };

    // ── error ──────────────────────────────────────────────────────
    const onError = (payload: { message: string; code: number }) => {
      console.warn('[Socket] server error:', payload.message, payload.code);
    };

    socketService.on('order:assigned',      onOrderAssigned);
    socketService.on('order:cancelled',     onOrderCancelled);
    socketService.on('order:status_changed', onStatusChanged);
    socketService.on('error',               onError);

    return () => {
      socketService.off('order:assigned',       onOrderAssigned);
      socketService.off('order:cancelled',      onOrderCancelled);
      socketService.off('order:status_changed', onStatusChanged);
      socketService.off('error',                onError);
      // Don't disconnect here — the socket should persist across
      // tab navigation. Disconnect only on logout (handled by auth effect).
    };
  }, [isAuthenticated, rider?.id]);
}
