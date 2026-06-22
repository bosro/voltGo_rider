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

      if (!token) {
        set({ isAuthenticated: false, isHydrating: false });
        return;
      }

      // Try to refresh the token on startup to verify it's still valid
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/token/refresh`, {
            refresh_token: refreshToken,
          });
          const newAccess = data?.data?.access_token ?? data?.access_token;
          const newRefresh =
            data?.data?.refresh_token ?? data?.refresh_token ?? refreshToken;
          await setTokens(newAccess, newRefresh);
          const profile = profileRaw ? JSON.parse(profileRaw) : null;
          set({
            isAuthenticated: true,
            accessToken: newAccess,
            rider: profile,
          });
        } catch {
          // Refresh failed — token is truly expired
          await clearTokens();
          set({ isAuthenticated: false });
        }
      } else {
        await clearTokens();
        set({ isAuthenticated: false });
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


