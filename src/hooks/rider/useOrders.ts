/**
 * useOrders.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query hooks for the full rider order lifecycle.
 *
 * Changes vs previous version:
 *  - useMarkDelivered appends the file with the correct field name
 *    matching the API spec (`proof_photo`).
 *  - All mutation onSuccess handlers re-use the same setActiveOrder
 *    pattern for consistency.
 *  - No functional changes to query keys or poll intervals.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, ordersApi } from "../../lib/api";
import { socketService } from "../../lib/socket";
import { useAuthStore } from "../../store/authStore";
import { useRiderStore } from "../../store/riderStore";
import { RIDER_QUERY_KEYS } from "./useRider";

function getOfferPollInterval(isOnline: boolean): number | false {
  if (!isOnline) return false;
  return socketService.isConnected ? 30_000 : 5_000;
}

// ── Offers (socket-primary, REST fallback) ────────────────────────────────────
export function useOrderOffers() {
  const { isAuthenticated } = useAuthStore();
  const { isOnline, setPendingOffer } = useRiderStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.offers,
    queryFn: async () => {
      try {
        const res = await ordersApi.getOffers();
        const offers = res.data?.data ?? [];
        if (offers.length > 0) setPendingOffer(offers[0]);
        return offers;
      } catch (err: any) {
        if (err?.response?.status === 403) return [];
        throw err;
      }
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
      const raw = res.data?.data;
      return Array.isArray(raw) ? raw : [];
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

// ── Accept ────────────────────────────────────────────────────────────────────
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

// ── Decline ───────────────────────────────────────────────────────────────────
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

// ── Arrived at pickup ─────────────────────────────────────────────────────────
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

// ── Collected ─────────────────────────────────────────────────────────────────
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

// ── In transit ────────────────────────────────────────────────────────────────
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

// ── Delivered (multipart proof photo) ────────────────────────────────────────
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




