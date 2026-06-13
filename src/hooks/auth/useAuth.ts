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
import { authApi, RegisterPayload, riderApi, RiderProfile } from "../../lib/api";
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

      // Normalize both field-name shapes
      const accessToken = payload?.access_token ?? (payload as any)?.token;
      const refreshToken =
        payload?.refresh_token ?? (payload as any)?.refreshToken ?? "";

      if (accessToken) {
        await login(
          accessToken,
          refreshToken,
          payload?.rider ?? {
            id: (payload as any)?.id ?? "",
            name: "",
            phone: "",
            is_online: false,
            kyc_status: "pending",
            created_at: "",
          },
        );
      }
    },
  });
}

// ── Register rider (called after KYC form completion) ────────────────────────
export function useRegisterRider() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    // No onSuccess needed — screen handles navigation to OTP
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
      const data:any = response.data?.data;
 
      // Normalise both field-name shapes the API might return
      const accessToken  = data?.access_token  ?? data?.token;
      const refreshToken = data?.refresh_token ?? data?.refreshToken ?? "";
 
      if (!accessToken) {
        // Defensive — shouldn't happen on a 200 but surface it clearly
        throw new Error("Login response missing token.");
      }
 
      // Build a RiderProfile from the flat fields
      const rider: RiderProfile = {
        id:           data.id           ?? "",
        name:         data.full_name    ?? data.name ?? "",
        full_name:    data.full_name,
        phone:        data.phone        ?? "",
        email:        data.email        ?? null,
        avatar_url:   data.avatar_url   ?? null,
        is_online:    data.active_status === "online" || data.is_online === true,
        active_status: data.active_status,
        kyc_status:   data.kyc_status   ?? "pending",
        vehicle_type: data.vehicle_type ?? null,
        rating:       data.rating,
        total_deliveries: data.total_deliveries,
        wallet_balance:   data.wallet_balance,
        created_at:   data.created_at  ?? new Date().toISOString(),
      };
 
      await login(accessToken, refreshToken, rider);
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





