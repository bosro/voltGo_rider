/**
 * useAuth.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query mutations for every auth flow a rider goes through.
 *
 *  useSendOtp         → POST /rider/auth/send-otp
 *  useVerifyOtp       → POST /rider/auth/verify-phone
 *  useRegisterRider   → POST /rider/auth/register
 *  useLoginRider      → POST /rider/auth/login
 *  useLogoutRider     → POST /rider/auth/logout  (+  token revoke)
 *  useRiderMe         → GET  /rider/auth/me  (query)
 *  useForgotPassword  → POST /rider/auth/forgot-password
 *  useResetPassword   → POST /rider/auth/reset-password
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, RegisterPayload, riderApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useRiderStore } from "../../store/riderStore";

// ── Query keys ────────────────────────────────────────────────────────────────
export const AUTH_QUERY_KEYS = {
  me: ["rider", "me"] as const,
};

// ── Send OTP ──────────────────────────────────────────────────────────────────
export function useSendOtp() {
  return useMutation({
    mutationFn: (phone: string) => authApi.sendOtp(phone),
  });
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
/**
 * Verifies OTP.
 * If the backend returns tokens + rider profile → logs in directly.
 * If it returns `requires_registration: true` → the screen should
 * navigate to CreateProfileStep1 (profile creation / KYC flow).
 */
export function useVerifyOtp() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) =>
      authApi.verifyPhone(phone, otp),

    onSuccess: async (response) => {
      const payload = response.data?.data;
      if (payload?.access_token && payload?.refresh_token && payload?.rider) {
        await login(payload.access_token, payload.refresh_token, payload.rider);
      }
      // If requires_registration → caller navigates to registration flow
    },
  });
}

// ── Register rider (called after KYC form completion) ────────────────────────
export function useRegisterRider() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),

    onSuccess: async (response) => {
      const { access_token, refresh_token, rider } = response.data.data;
      await login(access_token, refresh_token, rider);
      queryClient.setQueryData(AUTH_QUERY_KEYS.me, rider);
    },
  });
}

// ── Login (phone + password) ──────────────────────────────────────────────────
export function useLoginRider() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phone, password }: { phone: string; password: string }) =>
      authApi.login(phone, password),

    onSuccess: async (response) => {
      const { access_token, refresh_token, rider } = response.data.data;
      await login(access_token, refresh_token, rider);
      queryClient.setQueryData(AUTH_QUERY_KEYS.me, rider);
    },
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────
export function useLogoutRider() {
  const { logout } = useAuthStore();
  const { clearDelivery } = useRiderStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        // Best-effort: revoke refresh token on the server
        await authApi.logout();
      } catch {
        // Proceed with local logout even if network call fails
      }
    },
    onSettled: async () => {
      await logout();
      clearDelivery();
      queryClient.clear();
    },
  });
}

// ── Fetch current rider profile ───────────────────────────────────────────────
export function useRiderMe() {
  const { isAuthenticated, updateRider } = useAuthStore();

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: async () => {
      const response = await riderApi.getProfile();
      const profile = response.data.data;
      updateRider(profile); // keep Zustand store in sync
      return profile;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1_000, // 5 minutes
    retry: 2,
  });
}

// ── Forgot password ───────────────────────────────────────────────────────────
export function useForgotPassword() {
  return useMutation({
    mutationFn: (phone: string) => authApi.forgotPassword(phone),
  });
}

// ── Reset password ────────────────────────────────────────────────────────────
export function useResetPassword() {
  return useMutation({
    mutationFn: ({
      phone,
      otp,
      password,
    }: {
      phone: string;
      otp: string;
      password: string;
    }) => authApi.resetPassword(phone, otp, password),
  });
}
