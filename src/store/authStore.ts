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
  RiderProfile,
  STORAGE_KEYS,
  clearTokens,
  registerSessionExpiredHandler,
  setTokens,
} from "../lib/api";
import { socketService } from "../lib/socket";

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
    try {
      const [accessEntry, profileEntry] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.RIDER_PROFILE,
      ]);

      const token = accessEntry[1];
      const profile = profileEntry[1]
        ? (JSON.parse(profileEntry[1]) as RiderProfile)
        : null;

      if (token && profile) {
        set({ isAuthenticated: true, accessToken: token, rider: profile });
        // Re-connect socket for persisted sessions
        socketService.connect(profile.id);
      } else {
        set({ isAuthenticated: false, accessToken: null, rider: null });
      }
    } catch {
      set({ isAuthenticated: false, accessToken: null, rider: null });
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

// Register the Axios interceptor callback
registerSessionExpiredHandler(() => {
  useAuthStore.getState().logout();
});


