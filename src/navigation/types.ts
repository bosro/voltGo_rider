export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  PhoneEntry: undefined;
  ResetPassword: { phone: string };
  ForgotPassword: undefined;
  OTP: { phone: string; isNewRider: boolean };
  CreateProfileStep1: undefined;
  CreateProfileStep2: { name: string; email?: string; language: string };
  CreateProfileStep3: {
    name: string;
    email?: string;
    language: string;
    ghanaCardNo: string;
    licenseNo?: string;
    vehicleTypePreference: string;
  };
  CreateProfileStep4: {
    name: string;
    email?: string;
    language: string;
    ghanaCardNo: string;
    licenseNo?: string;
    vehicleTypePreference: string;
    ghanaCardUri: string;
    profilePhotoUri: string;
  };
  BiometricSetup: undefined;
  MainApp: undefined;
  NotificationPermission: undefined;
};

export type MainTabParamList = {
  HomeMap: undefined;
  Wallet: undefined;
  Activities: undefined;
  Account: undefined;
};

// ── Shared coordinate type ─────────────────────────────────────────────────────
export type LatLng = {
  latitude: number;
  longitude: number;
};

// ── Shared order params — used by every delivery-flow screen ───────────────────
// All coord fields are optional so screens that don't receive them from the
// socket payload (e.g. legacy REST path) still type-check cleanly.
type OrderParams = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  itemType: string;
  price: number;
  pickupEta?: number;
  pickupCoords?: LatLng;
  dropoffCoords?: LatLng;
};

export type MainStackParamList = {
  // ── Tabs ──────────────────────────────────────────────────────────────────
  MainTabs: undefined;

  // ── Delivery flow ──────────────────────────────────────────────────────────

  /** Incoming order offer — slides up, 28 s countdown, accept/decline. */
  DeliveryRequest: OrderParams;

  /**
   * Active delivery screen.
   * Replaces EnRoutePickup + PackageCollected.
   * The CTA and polyline direction adapt based on activeOrder.status from
   * riderStore (kept fresh by the order:status_changed socket event):
   *   accepted | rider_arriving | arrived  →  "I have arrived"
   *   collected | in_transit               →  "Package collected" → camera
   */
  ActiveDelivery: OrderParams;

  /** Proof-of-delivery camera. */
  CameraCapture: {
    orderId: string;
    amount?: number;
    pickupAddress?: string;
    dropoffAddress?: string;
    itemType?: string;
  };

  /** Review captured photo, submit or retake. */
  SubmitPhoto: {
    orderId: string;
    photoUri: string;
    amount?: number;
    pickupAddress?: string;
    dropoffAddress?: string;
    itemType?: string;
  };

  /** Shown after POST /rider/orders/{id}/delivered succeeds. */
  DeliveryCompleted: {
    orderId: string;
    amount: number;
    pickupAddress: string;
    dropoffAddress: string;
    itemType: string;
  };

  /** Shown when rider goes offline mid-session. */
  RiderOffline: undefined;

  // ── Wallet sub-screens ─────────────────────────────────────────────────────
  Withdraw: undefined;
  TransactionHistory: undefined;

  // ── Activities sub-screens ─────────────────────────────────────────────────
  ActivityDetail: {
    activityId: string;
    destination: string;
    date: string;
    amount: number;
    status: "completed" | "cancelled";
  };

  // ── Account sub-screens ────────────────────────────────────────────────────
  Profile: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  Notifications: undefined;
  Security: undefined;
  Support: undefined;
  Settings: undefined;
};

