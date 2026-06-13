/**
 * authStorage.ts
 * Kept for backward compatibility. 
 * New code should use STORAGE_KEYS from src/lib/api.ts and
 * the useAuthStore from src/store/authStore.ts instead.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** @deprecated Use STORAGE_KEYS.ACCESS_TOKEN from lib/api.ts */
export const AUTH_TOKEN_KEY = '@voltgo_rider_access_token';

/** @deprecated Use setTokens() from lib/api.ts */
export async function saveAuthToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** @deprecated Use clearTokens() from lib/api.ts */
export async function clearAuthToken() {
  await AsyncStorage.multiRemove([
    '@voltgo_rider_access_token',
    '@voltgo_rider_refresh_token',
    '@voltgo_rider_profile',
  ]);
}


