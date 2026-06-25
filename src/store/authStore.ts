/**
 * authStore.ts
 * ─────────────────────────────────────────────────────────────────
 * Zustand store for authentication & rider identity.
 *
 * Responsibilities:
 *  - Hold decoded rider profile in memory (fast reads for UI)
 *  - Persist tokens to AsyncStorage via the api helpers
 *  - Expose login / logout / hydrate actions
 *  - Connect / disconnect Socket.IO on auth changes
 *  - Register the session-expired handler so the Axios interceptor
 *    can trigger a logout without importing the store directly
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  BASE_URL,
  RiderProfile,
  STORAGE_KEYS,
  clearTokens,
  registerSessionExpiredHandler,
  setTokens,
} from "../lib/api";
import { socketService } from "../lib/socket";
import axios from "axios";

// ── Store shape ───────────────────────────────────────────────────────────────
interface AuthState {
  isAuthenticated: boolean;
  isHydrating: boolean;
  rider: RiderProfile | null;
  accessToken: string | null;

  hydrate: () => Promise<void>;
  login: (
    access: string,
    refresh: string,
    rider: RiderProfile,
  ) => Promise<void>;
  updateRider: (partial: Partial<RiderProfile>) => void;
  logout: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isHydrating: true,
  rider: null,
  accessToken: null,

  /**
   * Restore session from AsyncStorage on boot.
   * Called once in RootNavigator.
   */
  hydrate: async () => {
    set({ isHydrating: true });
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN,
      );
      const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.RIDER_PROFILE);

      if (!token || !refreshToken) {
        set({ isAuthenticated: false, isHydrating: false });
        return;
      }

      // Restore from cache immediately — don't wait for network
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      set({ isAuthenticated: true, accessToken: token, rider: profile });

      // Then silently try to refresh in the background
      try {
        const { data } = await axios.post(`${BASE_URL}/token/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccess = data?.data?.access_token ?? data?.access_token;
        const newRefresh =
          data?.data?.refresh_token ?? data?.refresh_token ?? refreshToken;
        await setTokens(newAccess, newRefresh);
        set({ accessToken: newAccess });
      } catch (err: any) {
        // ✅ Only clear session on a definitive 401 from the server
        // Network errors, timeouts, etc. should NOT log the user out
        const status = err?.response?.status;
        if (status === 401) {
          await clearTokens();
          set({ isAuthenticated: false, accessToken: null, rider: null });
        }
        // else: keep the user logged in — Axios interceptor will handle
        // token refresh on the next real API call
      }
    } finally {
      set({ isHydrating: false });
    }
  },

  /**
   * Called after successful OTP verification or login response.
   */
  login: async (access, refresh, rider) => {
    await setTokens(access, refresh);
    await AsyncStorage.setItem(
      STORAGE_KEYS.RIDER_PROFILE,
      JSON.stringify(rider),
    );
    set({ isAuthenticated: true, accessToken: access, rider });
    // Connect socket immediately after login
    socketService.connect(rider.id);
  },

  /**
   * Patch rider fields in-memory and persist.
   */
  updateRider: (partial) => {
    const current = get().rider;
    if (!current) return;
    const updated = { ...current, ...partial };
    set({ rider: updated });
    AsyncStorage.setItem(
      STORAGE_KEYS.RIDER_PROFILE,
      JSON.stringify(updated),
    ).catch(() => {});
  },

  /**
   * Full logout — clears tokens, store, socket.
   */
  logout: async () => {
    socketService.disconnect();
    await clearTokens();
    set({ isAuthenticated: false, accessToken: null, rider: null });
  },
}));
