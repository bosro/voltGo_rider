/**
 * useOrders.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query hooks covering the full rider order lifecycle.
 *
 *  useOrderOffers     → GET  /rider/orders/offers
 *                       Polls every 30 s as a FALLBACK.
 *                       Socket.IO (order:assigned) is the primary path.
 *  useMyOrders        → GET  /rider/orders/my
 *  useActiveOrder     → GET  /rider/orders/active
 *  useAcceptOrder     → POST /rider/orders/{id}/accept
 *  useDeclineOrder    → POST /rider/orders/{id}/decline
 *  useMarkArrived     → POST /rider/orders/{id}/arrived
 *  useMarkCollected   → POST /rider/orders/{id}/collected
 *  useMarkInTransit   → POST /rider/orders/{id}/in-transit
 *  useMarkDelivered   → POST /rider/orders/{id}/delivered  (multipart)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, ordersApi } from "../../lib/api";
import { socketService } from "../../lib/socket";
import { useAuthStore } from "../../store/authStore";
import { useRiderStore } from "../../store/riderStore";
import { RIDER_QUERY_KEYS } from "./useRider";

/**
 * REST fallback poll interval.
 * When socket is connected we use a long interval to avoid wasted requests.
 * When socket is down we drop to 5 s to keep the rider responsive.
 */
function getOfferPollInterval(isOnline: boolean): number | false {
  if (!isOnline) return false;
  return socketService.isConnected ? 30_000 : 5_000;
}

// ── Order offers (socket-primary, REST fallback) ───────────────────────────────
export function useOrderOffers() {
  const { isAuthenticated } = useAuthStore();
  const { isOnline, setPendingOffer } = useRiderStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.offers,
    queryFn: async () => {
      const res = await ordersApi.getOffers();
      const offers = res.data?.data ?? [];
      // Surface first offer to store — HomeMapScreen navigates on this
      if (offers.length > 0) setPendingOffer(offers[0]);
      return offers;
    },
    enabled: isAuthenticated && isOnline,
    refetchInterval: () => getOfferPollInterval(isOnline),
    staleTime: 0,
  });
}

// ── Order history ─────────────────────────────────────────────────────────────
export function useMyOrders() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.myOrders,
    queryFn: async () => {
      const res = await ordersApi.getMyOrders();
      return res.data?.data ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1_000,
  });
}

// ── Active order ──────────────────────────────────────────────────────────────
export function useActiveOrder() {
  const { isAuthenticated } = useAuthStore();
  const { setActiveOrder } = useRiderStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.activeOrder,
    queryFn: async () => {
      const res = await ordersApi.getActiveOrder();
      const order = res.data?.data ?? null;
      setActiveOrder(order);
      return order;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: 1,
  });
}

// ── Accept offer ──────────────────────────────────────────────────────────────
export function useAcceptOrder() {
  const queryClient = useQueryClient();
  const { setActiveOrder, setPendingOffer } = useRiderStore();

  return useMutation({
    mutationFn: (id: string) => ordersApi.acceptOrder(id),

    onSuccess: (response) => {
      const order = response.data?.data;
      if (order) {
        setActiveOrder(order);
        setPendingOffer(null);
        queryClient.setQueryData<Order | null>(
          RIDER_QUERY_KEYS.activeOrder,
          order,
        );
        queryClient.invalidateQueries({ queryKey: RIDER_QUERY_KEYS.offers });
      }
    },
  });
}

// ── Decline offer ─────────────────────────────────────────────────────────────
export function useDeclineOrder() {
  const queryClient = useQueryClient();
  const { setPendingOffer } = useRiderStore();

  return useMutation({
    mutationFn: (id: string) => ordersApi.declineOrder(id),

    onSettled: () => {
      setPendingOffer(null);
      queryClient.invalidateQueries({ queryKey: RIDER_QUERY_KEYS.offers });
    },
  });
}

// ── Mark arrived at pickup ────────────────────────────────────────────────────
export function useMarkArrived() {
  const queryClient = useQueryClient();
  const { setActiveOrder } = useRiderStore();

  return useMutation({
    mutationFn: (id: string) => ordersApi.markArrived(id),

    onSuccess: (response) => {
      const order = response.data?.data;
      if (order) {
        setActiveOrder(order);
        queryClient.setQueryData<Order | null>(
          RIDER_QUERY_KEYS.activeOrder,
          order,
        );
      }
    },
  });
}

// ── Mark package collected ────────────────────────────────────────────────────
export function useMarkCollected() {
  const queryClient = useQueryClient();
  const { setActiveOrder } = useRiderStore();

  return useMutation({
    mutationFn: (id: string) => ordersApi.markCollected(id),

    onSuccess: (response) => {
      const order = response.data?.data;
      if (order) {
        setActiveOrder(order);
        queryClient.setQueryData<Order | null>(
          RIDER_QUERY_KEYS.activeOrder,
          order,
        );
      }
    },
  });
}

// ── Mark in transit ───────────────────────────────────────────────────────────
export function useMarkInTransit() {
  const queryClient = useQueryClient();
  const { setActiveOrder } = useRiderStore();

  return useMutation({
    mutationFn: (id: string) => ordersApi.markInTransit(id),

    onSuccess: (response) => {
      const order = response.data?.data;
      if (order) {
        setActiveOrder(order);
        queryClient.setQueryData<Order | null>(
          RIDER_QUERY_KEYS.activeOrder,
          order,
        );
      }
    },
  });
}

// ── Mark delivered (proof of delivery photo) ──────────────────────────────────
export function useMarkDelivered() {
  const queryClient = useQueryClient();
  const { clearDelivery } = useRiderStore();

  return useMutation({
    mutationFn: ({ id, photoUri }: { id: string; photoUri: string }) => {
      const form = new FormData();
      form.append("proof_photo", {
        uri: photoUri,
        name: "proof_of_delivery.jpg",
        type: "image/jpeg",
      } as any);
      return ordersApi.markDelivered(id, form);
    },

    onSuccess: () => {
      clearDelivery();
      queryClient.removeQueries({ queryKey: RIDER_QUERY_KEYS.activeOrder });
      queryClient.invalidateQueries({ queryKey: RIDER_QUERY_KEYS.myOrders });
    },
  });
}
