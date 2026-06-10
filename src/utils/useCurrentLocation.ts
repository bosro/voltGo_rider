// utils/useCurrentLocation.ts
import { useState, useEffect } from "react";
import * as Location from "expo-location";

export function useCurrentLocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>("Current Location");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      // Reverse geocode to get a readable address
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        setAddress(place.name ?? place.street ?? "Current Location");
      }
      setLoading(false);
    })();
  }, []);

  return { coords, address, loading };
}

