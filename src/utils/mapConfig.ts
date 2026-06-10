/**
 * mapsConfig.ts
 * ─────────────────────────────────────────────────────────
 * Single source of truth for your Google Maps API key.
 *
 * Replace the empty string with your actual key.
 * Make sure these APIs are enabled in Google Cloud Console:
 *   ✅ Maps SDK for Android
 *   ✅ Maps SDK for iOS
 *   ✅ Routes API           (replaces legacy Directions API)
 *   ✅ Places API (New)     (for autocomplete search)
 *   ✅ Geocoding API        (optional, for reverse geo)
 */

export const GOOGLE_MAPS_API_KEY = "AIzaSyDex_IKWvqGX2MQOXi7jUqy264s4z2E8xo";

/** Accra-area bias for Places Autocomplete */
export const PLACES_LOCATION_BIAS = {
  // Centre of Greater Accra — results ranked closer to here
  latitude: 5.603717,
  longitude: -0.186964,
  radius: 50000, // 50 km
};


