/**
 * usePayments.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query hooks for saved payment methods.
 *
 *  usePaymentMethods   → GET    /payment-methods
 *  useAddPayment       → POST   /payment-methods
 *  useSetDefaultPayment→ POST   /payment-methods/{id}/default
 *  useRemovePayment    → DELETE /payment-methods/{id}
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AddPaymentMethodPayload, paymentApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const PAYMENTS_KEY = ["payments", "methods"] as const;

// ── List payment methods ──────────────────────────────────────────────────────
export function usePaymentMethods() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: PAYMENTS_KEY,
    queryFn: async () => {
      const res = await paymentApi.list();
      return res.data?.data ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1_000,
  });
}

// ── Add a payment method ──────────────────────────────────────────────────────
export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddPaymentMethodPayload) => paymentApi.add(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}

// ── Set default payment method ────────────────────────────────────────────────
export function useSetDefaultPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}

// ── Remove a payment method ───────────────────────────────────────────────────
export function useRemovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}
