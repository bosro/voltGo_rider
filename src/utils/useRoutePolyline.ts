/**
 * useRoutePolyline.ts
 * ─────────────────────────────────────────────────────────
 * Fetches a real driving/bicycling route from Google's Routes API
 * (the replacement for the legacy Directions API, required for API
 * keys created after March 2025).
 *
 * Returns decoded LatLng[] coordinates ready for a <Polyline> and
 * the duration in minutes.
 *
 * Usage:
 *   const { coords, etaMinutes, loading, error } = useRoutePolyline({
 *     origin:      { latitude: 5.5968, longitude: -0.1869 },
 *     destination: { latitude: 5.6502, longitude: -0.1870 },
 *     mode:        "BICYCLE",   // "DRIVE" | "BICYCLE" | "WALK" | "TWO_WHEELER"
 *   });
 *
 * Dependencies:
 *   npm install @mapbox/polyline
 *   npm install --save-dev @types/mapbox__polyline
 */

import { useState, useEffect, useRef } from "react";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY } from "./mapConfig";

export type TravelMode = "DRIVE" | "BICYCLE" | "WALK" | "TWO_WHEELER";

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface Options {
  origin: LatLng;
  destination: LatLng;
  mode?: TravelMode;
  /** Set true to skip the fetch (e.g. when coordinates are not yet known) */
  skip?: boolean;
}

interface Result {
  coords: LatLng[];
  etaMinutes: number | null;
  loading: boolean;
  error: string | null;
}

const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

export function useRoutePolyline({
  origin,
  destination,
  mode = "DRIVE",
  skip = false,
}: Options): Result {
  const [coords, setCoords] = useState<LatLng[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avoid re-fetching when object refs change but values stay the same
  const originKey = `${origin.latitude},${origin.longitude}`;
  const destKey = `${destination.latitude},${destination.longitude}`;

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skip) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        const body = {
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: mode,
          routingPreference:
            mode === "DRIVE" ? "TRAFFIC_AWARE" : "ROUTING_PREFERENCE_UNSPECIFIED",
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
          },
          languageCode: "en-US",
          units: "METRIC",
        };

        const res = await fetch(ROUTES_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            // Field mask — only request what we need (keeps response small & cheaper)
            "X-Goog-FieldMask":
              "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Routes API error ${res.status}: ${errText}`);
        }

        const data = await res.json();

        if (!data.routes || data.routes.length === 0) {
          throw new Error("No routes found");
        }

        const route = data.routes[0];

        // Decode polyline → [{ latitude, longitude }]
        const decoded = polyline
          .decode(route.polyline.encodedPolyline)
          .map(([lat, lng]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));

        setCoords(decoded);

        // Duration comes back as e.g. "312s"
        if (route.duration) {
          const seconds = parseInt(route.duration.replace("s", ""), 10);
          setEtaMinutes(Math.round(seconds / 60));
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("[useRoutePolyline]", err.message);
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, destKey, mode, skip]);

  return { coords, etaMinutes, loading, error };
}




