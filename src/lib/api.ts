/**
 * api.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralised Axios instance for the VoltGo Rider app.
 *
 *  - Base URL: https://api.voltgoapp.com/api/v1
 *  - Request interceptor:  attaches Bearer token from AsyncStorage
 *  - Response interceptor: on 401, attempts silent token refresh,
 *    retries original request once; on second failure clears tokens
 *    and notifies auth store.
 *  - All Rider API surface covered per the provided Swagger spec.
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Storage keys ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@voltgo_rider_access_token',
  REFRESH_TOKEN: '@voltgo_rider_refresh_token',
  RIDER_PROFILE: '@voltgo_rider_profile',
} as const;

// ── Base instance ────────────────────────────────────────────────────────────
export const BASE_URL = 'https://api.voltgoapp.com/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN,  access],
    [STORAGE_KEYS.REFRESH_TOKEN, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.RIDER_PROFILE,
  ]);
}

// ── Request interceptor – attach Authorization header ─────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor – silent refresh on 401 ─────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

// Weak ref to onSessionExpired so we avoid a hard circular dep on the store
let _onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(cb: () => void) {
  _onSessionExpired = cb;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request until the refresh resolves
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${BASE_URL}/token/refresh`, {
        refresh_token: refreshToken,
      });

      const newAccess: string  = data?.data?.access_token  ?? data?.access_token;
      const newRefresh: string = data?.data?.refresh_token ?? data?.refresh_token ?? refreshToken;

      await setTokens(newAccess, newRefresh);
      processQueue(null, newAccess);

      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      _onSessionExpired?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Typed API surface  (Rider-side Swagger endpoints)  ───────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ─── Common / Auth ────────────────────────────────────────────────────────────
export const authApi = {
  /** POST /rider/auth/send-otp */
  sendOtp: (phone: string) =>
    api.post('/rider/auth/send-otp', { phone }),

  /** POST /rider/auth/verify-phone */
  verifyPhone: (phone: string, otp: string) =>
    api.post<VerifyPhoneResponse>('/rider/auth/verify-phone', { phone, otp }),

  /** POST /rider/auth/login */
  login: (phone: string, password: string) =>
    api.post<LoginResponse>('/rider/auth/login', { phone, password }),

  /** POST /rider/auth/register */
  register: (payload: RegisterPayload) =>
    api.post<LoginResponse>('/rider/auth/register', payload),

  /** GET /rider/auth/me */
  me: () =>
    api.get<{ data: RiderProfile }>('/rider/auth/me'),

  /** POST /rider/auth/logout */
  logout: () =>
    api.post('/rider/auth/logout'),

  /** POST /rider/auth/forgot-password */
  forgotPassword: (phone: string) =>
    api.post('/rider/auth/forgot-password', { phone }),

  /** POST /rider/auth/reset-password */
  resetPassword: (phone: string, otp: string, password: string) =>
    api.post('/rider/auth/reset-password', { phone, otp, password }),

  /** POST /token/refresh */
  refreshToken: (refresh_token: string) =>
    api.post<TokenPair>('/token/refresh', { refresh_token }),

  /** POST /token/revoke */
  revokeToken: (refresh_token: string) =>
    api.post('/token/revoke', { refresh_token }),
};

// ─── Rider / KYC ─────────────────────────────────────────────────────────────
export const kycApi = {
  /** POST /rider/kyc  (multipart) */
  submitKyc: (formData: FormData) =>
    api.post('/rider/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Rider / Profile & Status ─────────────────────────────────────────────────
export const riderApi = {
  /** GET /rider/me */
  getProfile: () =>
    api.get<{ data: RiderProfile }>('/rider/me'),

  /** PUT /rider/status */
  setStatus: (is_online: boolean) =>
    api.put<{ data: { is_online: boolean } }>('/rider/status', { is_online }),

  /** PUT /rider/location */
  updateLocation: (latitude: number, longitude: number) =>
    api.put('/rider/location', { latitude, longitude }),
};

// ─── Rider / Orders ───────────────────────────────────────────────────────────
export const ordersApi = {
  /** GET /rider/orders/offers */
  getOffers: () =>
    api.get<{ data: OrderOffer[] }>('/rider/orders/offers'),

  /** GET /rider/orders/my */
  getMyOrders: () =>
    api.get<{ data: Order[] }>('/rider/orders/my'),

  /** GET /rider/orders/active */
  getActiveOrder: () =>
    api.get<{ data: Order | null }>('/rider/orders/active'),

  /** POST /rider/orders/{id}/accept */
  acceptOrder: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/accept`),

  /** POST /rider/orders/{id}/decline */
  declineOrder: (id: string) =>
    api.post(`/rider/orders/${id}/decline`),

  /** POST /rider/orders/{id}/arrived */
  markArrived: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/arrived`),

  /** POST /rider/orders/{id}/collected */
  markCollected: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/collected`),

  /** POST /rider/orders/{id}/in-transit */
  markInTransit: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/in-transit`),

  /** POST /rider/orders/{id}/delivered  (multipart — proof of delivery photo) */
  markDelivered: (id: string, formData: FormData) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/delivered`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Common / Payment Methods ────────────────────────────────────────────────
export const paymentApi = {
  /** GET /payment-methods */
  list: () =>
    api.get<{ data: PaymentMethod[] }>('/payment-methods'),

  /** POST /payment-methods */
  add: (payload: AddPaymentMethodPayload) =>
    api.post<{ data: PaymentMethod }>('/payment-methods', payload),

  /** POST /payment-methods/{id}/default */
  setDefault: (id: string) =>
    api.post(`/payment-methods/${id}/default`),

  /** DELETE /payment-methods/{id} */
  remove: (id: string) =>
    api.delete(`/payment-methods/${id}`),

  /** GET /payment-methods/options */
  getOptions: () =>
    api.get('/payment-methods/options'),
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Shared type definitions ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export interface TokenPair {
  access_token:  string;
  refresh_token: string;
}

export interface LoginResponse {
  data: {
    access_token:  string;
    refresh_token: string;
    rider:         RiderProfile;
  };
}

export interface VerifyPhoneResponse {
  data: {
    access_token?:  string;
    refresh_token?: string;
    rider?:         RiderProfile;
    /** true when OTP was valid but rider has not yet registered */
    requires_registration?: boolean;
  };
}

export interface RegisterPayload {
  phone:        string;
  name:         string;
  email?:       string;
  language?:    string;
  id_type?:     string;
  id_number?:   string;
  vehicle_type?: string;
}

export interface RiderProfile {
  id:           string;
  name:         string;
  phone:        string;
  email?:       string;
  avatar_url?:  string;
  is_online:    boolean;
  kyc_status:   'pending' | 'approved' | 'rejected' | 'under_review';
  vehicle_type?: string;
  rating?:      number;
  total_deliveries?: number;
  wallet_balance?: number;
  created_at:   string;
}

export interface Coordinates {
  latitude:  number;
  longitude: number;
}

export type OrderStatus =
  | 'pending'
  | 'searching'
  | 'assigned'
  | 'accepted'
  | 'arrived'
  | 'collected'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id:               string;
  status:           OrderStatus;
  customer_name:    string;
  customer_phone:   string;
  pickup_address:   string;
  dropoff_address:  string;
  item_type:        string;
  price:            number;
  pickup_eta?:      number;
  pickup_coords?:   Coordinates;
  dropoff_coords?:  Coordinates;
  created_at:       string;
  updated_at:       string;
}

/** Lightweight order offer shown for accept/decline */
export type OrderOffer = Order;

export interface PaymentMethod {
  id:         string;
  type:       'momo' | 'card';
  label:      string;
  number:     string;
  is_default: boolean;
}

export interface AddPaymentMethodPayload {
  type:           'momo' | 'card';
  account_number: string;
  account_name:   string;
  provider?:      string;
}
