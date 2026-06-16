/**
 * api.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralised Axios instance for the VoltGo Rider app.
 *
 * Changes vs previous version:
 *  - OrderStatus now includes 'rider_arriving' (socket spec) alongside
 *    'arrived' so both REST and socket status values are valid.
 *  - RiderProfile.is_online mapped from active_status correctly.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// ── Storage keys ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "@voltgo_rider_access_token",
  REFRESH_TOKEN: "@voltgo_rider_refresh_token",
  RIDER_PROFILE: "@voltgo_rider_profile",
} as const;

export const BASE_URL = "https://api.voltgoapp.com/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

// ── Token helpers ────────────────────────────────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function setTokens(
  access: string,
  refresh: string,
): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, access],
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

// ── Dev logger ───────────────────────────────────────────────────────────────
const isDev = __DEV__;

function logRequest(config: InternalAxiosRequestConfig): void {
  if (!isDev) return;
  const method = config.method?.toUpperCase() ?? "UNKNOWN";
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  console.log(`\n🚀 [REQUEST] ${method} ${url}`);
  if (config.data) {
    const isFormData = config.data instanceof FormData;
    console.log(
      "📤 Payload:",
      isFormData
        ? "[FormData]"
        : JSON.stringify(
            typeof config.data === "string"
              ? JSON.parse(config.data)
              : config.data,
            null,
            2,
          ),
    );
  }
}

function logResponse(
  status: number,
  url: string,
  data: unknown,
  isError = false,
): void {
  if (!isDev) return;
  const icon = isError ? "❌" : "✅";
  console.log(`\n${icon} [${isError ? "ERROR" : "RESPONSE"}] ${status} ${url}`);
  try {
    console.log("📥 Data:", JSON.stringify(data, null, 2));
  } catch {
    /* unserializable */
  }
}

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  logRequest(config);
  return config;
});

// ── Response interceptor — silent 401 refresh ─────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (t: string) => void;
  reject: (e: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

let _onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(cb: () => void) {
  _onSessionExpired = cb;
}

api.interceptors.response.use(
  (response) => {
    logResponse(response.status, response.config.url ?? "", response.data);
    return response;
  },
  async (error: AxiosError) => {
    logResponse(
      error.response?.status ?? 0,
      error.config?.url ?? "",
      error.response?.data ?? error.message,
      true,
    );

    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || original._retry)
      return Promise.reject(error);

    if (isRefreshing) {
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
      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN,
      );
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(`${BASE_URL}/token/refresh`, {
        refresh_token: refreshToken,
      });
      const newAccess: string = data?.data?.access_token ?? data?.access_token;
      const newRefresh: string =
        data?.data?.refresh_token ?? data?.refresh_token ?? refreshToken;

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
// ── API surface ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export const authApi = {
  sendOtp: (phone: string) => api.post("/rider/auth/send-otp", { phone }),
  verifyPhone: (phone: string, otp: string) =>
    api.post<VerifyPhoneResponse>("/rider/auth/verify-phone", { phone, otp }),
  login: (phone: string, password: string) =>
    api.post<LoginResponse>("/rider/auth/login", { phone, password }),
  register: (payload: RegisterPayload) =>
    api.post<LoginResponse>("/rider/auth/register", payload),
  me: () => api.get<{ data: RiderProfile }>("/rider/auth/me"),
  logout: () => api.post("/rider/auth/logout"),
  forgotPassword: (phone: string) =>
    api.post("/rider/auth/forgot-password", { phone }),
  resetPassword: (phone: string, otp: string, password: string) =>
    api.post("/rider/auth/reset-password", {
      phone,
      otp,
      new_password: password,
    }),
  refreshToken: (refresh_token: string) =>
    api.post<TokenPair>("/token/refresh", { refresh_token }),
  revokeToken: (refresh_token: string) =>
    api.post("/token/revoke", { refresh_token }),
};

export const kycApi = {
  submitKyc: (formData: FormData) =>
    api.post("/rider/kyc", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const riderApi = {
  getProfile: () => api.get<{ data: RiderProfile }>("/rider/me"),
  setStatus: (is_online: boolean) =>
    api.put<{ data: { active_status: string } }>("/rider/status", {
      active_status: is_online ? "online" : "offline",
    }),
  /** PUT /rider/location — called by useLocationTracking heartbeat */
  updateLocation: (latitude: number, longitude: number) =>
    api.put("/rider/location", { lat: latitude, lng: longitude }),
};

export const ordersApi = {
  getOffers: () => api.get<{ data: OrderOffer[] }>("/rider/orders/offers"),
  getMyOrders: () => api.get<{ data: Order[] }>("/rider/orders/my"),
  getActiveOrder: () => api.get<{ data: Order | null }>("/rider/orders/active"),
  acceptOrder: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/accept`),
  declineOrder: (id: string) => api.post(`/rider/orders/${id}/decline`),
  markArrived: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/arrived`),
  markCollected: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/collected`),
  markInTransit: (id: string) =>
    api.post<{ data: Order }>(`/rider/orders/${id}/in-transit`),
 markDelivered: (id: string, body: { proof_of_delivery_image: string }) =>
  api.post<{ data: Order }>(`/rider/orders/${id}/delivered`, body),

};

export const paymentApi = {
  list: () => api.get<{ data: PaymentMethod[] }>("/payment-methods"),
  add: (payload: AddPaymentMethodPayload) =>
    api.post<{ data: PaymentMethod }>("/payment-methods", payload),
  setDefault: (id: string) => api.post(`/payment-methods/${id}/default`),
  remove: (id: string) => api.delete(`/payment-methods/${id}`),
  getOptions: () => api.get("/payment-methods/options"),
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Types ─────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    token: string;           // API returns "token", not "access_token"
    refreshToken: string;    // API returns "refreshToken", not "refresh_token"
    id: string;
    full_name: string;
    phone: string;
    kyc_status: string;
    phone_verified: boolean;
  };
}


export interface VerifyPhoneResponse {
  data: {
    access_token?: string;
    refresh_token?: string;
    rider?: RiderProfile;
    requires_registration?: boolean;
  };
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  language?: string;
  id_type?: string;
  id_number?: string;
  vehicle_type?: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  full_name?: string;
  phone: string;
  email?: string | null;
  avatar_url?: string | null;
  is_online: boolean;
  active_status?: string;
  kyc_status: "pending" | "approved" | "rejected" | "under_review";
  vehicle_type?: string | null;
  rating?: number | string;
  total_deliveries?: number;
  wallet_balance?: number;
  created_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * OrderStatus covers:
 *  - REST lifecycle:   pending → searching → assigned → accepted →
 *                      arrived → collected → in_transit → delivered → cancelled
 *  - Socket additions: rider_arriving (maps to "heading to pickup" phase)
 *
 * Both 'arrived' (REST) and 'rider_arriving' (socket) represent the same
 * real-world moment; the UI treats them identically.
 */
export type OrderStatus =
  | "pending"
  | "searching"
  | "assigned"
  | "accepted"
  | "arrived"
  | "rider_arriving" // ← socket spec name for the same phase
  | "collected"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  status: OrderStatus;
  customer_id: string;
  rider_id: string;
  customer: {
    id: string;
    full_name: string;
    phone: string;
  };
  pickup_address: string;
  pickup_lat: string;
  pickup_lng: string;
  dropoff_address: string;
  dropoff_lat: string;
  dropoff_lng: string;
  item_description: string;
  package_type: string | null;
  vehicle_type: string;
  special_instructions: string | null;
  payment_method: string;
  price_ghs: string;
  credits_used: number;
  distance_km: number | null;
  estimated_duration_mins: number | null;
  proof_of_delivery_url: string | null;
  scheduled_at: string | null;
  assigned_at: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  stops: any[];
  saved_payment_method: any | null;

  // ── Navigation-only extras (set by socket handler, not REST) ──
  pickup_coords?: { latitude: number; longitude: number };
  dropoff_coords?: { latitude: number; longitude: number };
  pickup_eta?: number;
  // customer_name/phone shortcuts used before customer object is populated
  customer_name?: string;
  customer_phone?: string;
  item_type?: string;
}

export interface PaginatedOrders {
  total: number;
  page: number;
  pages: number;
  items: Order[];
}

export type OrderOffer = Order;

export interface PaymentMethod {
  id: string;
  type: "momo" | "card";
  provider: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
  is_active: boolean;
}

export interface AddPaymentMethodPayload {
  type: "momo" | "card";
  account_number: string;
  account_name: string;
  provider?: string;
}











