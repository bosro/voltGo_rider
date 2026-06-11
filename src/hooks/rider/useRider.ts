/**
 * useRider.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query hooks for rider profile, online status and location.
 *
 *  useRiderProfile    → GET  /rider/me
 *  useToggleStatus    → PUT  /rider/status
 *  useUpdateLocation  → PUT  /rider/location
 *  useLocationHeartbeat – useEffect wrapper that fires updateLocation
 *                         every HEARTBEAT_INTERVAL ms while online
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { riderApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useRiderStore } from "../../store/riderStore";

// ── Query keys ────────────────────────────────────────────────────────────────
export const RIDER_QUERY_KEYS = {
  profile: ["rider", "profile"] as const,
  activeOrder: ["rider", "activeOrder"] as const,
  myOrders: ["rider", "myOrders"] as const,
  offers: ["rider", "offers"] as const,
};

/** GPS push interval while the rider is online (15 seconds). */
const HEARTBEAT_INTERVAL = 15_000;

// ── Rider profile ─────────────────────────────────────────────────────────────
export function useRiderProfile() {
  const { isAuthenticated, updateRider } = useAuthStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.profile,
    queryFn: async () => {
      const res = await riderApi.getProfile();
      const raw = res.data.data as any;

      // Remap API shape → RiderProfile shape
      const profile = {
        ...raw,
        name: raw.full_name ?? raw.name ?? "",
        is_online: raw.active_status === "online",
      };

      updateRider(profile);
      return profile;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1_000,
    retry: 2,
  });
}

// ── Toggle online / offline ───────────────────────────────────────────────────
export function useToggleStatus() {
  const { setOnline, setTogglingStatus } = useRiderStore();
  const { updateRider } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (is_online: boolean) => riderApi.setStatus(is_online),

    onMutate: (is_online) => {
      // Optimistic update so the UI responds instantly
      setTogglingStatus(true);
      setOnline(is_online);
    },

    onSuccess: (response, is_online) => {
      updateRider({ is_online });
      queryClient.invalidateQueries({ queryKey: RIDER_QUERY_KEYS.profile });
    },

    onError: (_err, is_online) => {
      // Rollback optimistic update
      setOnline(!is_online);
    },

    onSettled: () => setTogglingStatus(false),
  });
}

// ── Update GPS location ───────────────────────────────────────────────────────
export function useUpdateLocation() {
  return useMutation({
    mutationFn: ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => riderApi.updateLocation(latitude, longitude),
    // Silent — no toast, no invalidation needed
  });
}

// ── Location heartbeat ────────────────────────────────────────────────────────
/**
 * Starts a recurring location push to the server while the rider is online.
 * Reads live coords from `useRiderStore`, no external deps needed.
 *
 * @param enabled  Pass `false` to pause the heartbeat (e.g. while offline)
 */
export function useLocationHeartbeat(enabled: boolean) {
  const { mutate: pushLocation } = useUpdateLocation();
  const { currentCoords, isOnline } = useRiderStore();
  const coordsRef = useRef(currentCoords);
  const isOnlineRef = useRef(isOnline);

  // Keep refs current without restarting the interval
  useEffect(() => {
    coordsRef.current = currentCoords;
  }, [currentCoords]);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      const coords = coordsRef.current;
      if (coords && isOnlineRef.current) {
        pushLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(id);
  }, [enabled]);
}
