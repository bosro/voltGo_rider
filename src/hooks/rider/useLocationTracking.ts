/**
 * useLocationTracking.ts
 * ─────────────────────────────────────────────────────────────────
 * Starts a foreground location watch as soon as the rider is online.
 * Every update:
 *  1. Writes to riderStore.currentCoords  (consumed by map screens)
 *  2. PUTs to /rider/location every HEARTBEAT_MS (throttled)
 *
 * Mount ONCE in MainNavigator alongside useSocket().
 *
 * Permissions: make sure expo-location is in app.json plugins and
 * the user has granted "While Using" or "Always" location access.
 */

import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuthStore } from '@/store/authStore';
import { useRiderStore } from '@/store/riderStore';
import { riderApi } from '@/lib/api';


const HEARTBEAT_MS = 8_000; // PUT /rider/location at most every 8 s

export function useLocationTracking() {
  const { isAuthenticated } = useAuthStore();
  const { isOnline, setCurrentCoords } = useRiderStore();

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPutRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !isOnline) {
      // Stop tracking when offline or logged out
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      // Seed the store immediately with a one-shot read so the map
      // has a location before the first watch event fires.
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCurrentCoords({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        }
      } catch (_) {
        // Non-fatal — watch will provide updates shortly
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,       // metres — avoid excessive updates when standing still
          timeInterval: 3_000,        // ms floor between callbacks
        },
        (loc) => {
          if (cancelled) return;

          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          // Always update the in-memory store (map re-renders cheaply)
          setCurrentCoords(coords);

          // Throttle the network PUT
          const now = Date.now();
          if (now - lastPutRef.current >= HEARTBEAT_MS) {
            lastPutRef.current = now;
            riderApi
              .updateLocation(coords.latitude, coords.longitude)
              .catch(() => {
                // Silent — location updates are best-effort
              });
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isAuthenticated, isOnline]);
}



