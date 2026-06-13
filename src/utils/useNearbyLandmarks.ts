// utils/useNearbyLandmarks.ts
import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "./mapConfig";

export interface Landmark {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
}

export function useNearbyLandmarks(
  coords: { latitude: number; longitude: number } | null
) {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coords) return;
    setLoading(true);

    fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${coords.latitude},${coords.longitude}` +
        `&radius=1500` +
        `&type=point_of_interest` + // or: bank|hospital|school|shopping_mall
        `&key=${GOOGLE_MAPS_API_KEY}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.results) setLandmarks(data.results.slice(0, 5));
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [coords?.latitude, coords?.longitude]);

  return { landmarks, loading };
}



