export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  PhoneEntry: undefined;
  OTP: { phone: string };
  CreateProfileStep1: undefined;
  CreateProfileStep2: { name: string; email?: string; language: string };
  CreateProfileStep3: {
    name: string;
    email?: string;
    language: string;
    idType: string;
    idNumber: string;
    vehicleType: string;
  };
  CreateProfileStep4: {
    name: string;
    email?: string;
    language: string;
    idType: string;
    idNumber: string;
    vehicleType: string;
    ghanaCardUri?: string;
    profilePhotoUri?: string;
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

export type MainStackParamList = {
  MainTabs: undefined;
  DeliveryRequest: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    itemType: string;
    price: number;
    pickupEta: number;
  };
  EnRoutePickup: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    itemType: string;
    price: number;
    pickupEta: number;
  };
  PackageCollected: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    itemType: string;
    price: number;
  };
  CameraCapture: {
    orderId: string;
    mode: "delivery_proof";
    amount?: number;
    pickupAddress?: string;
    dropoffAddress?: string;
    itemType?: string;
  };
  SubmitPhoto: {
    orderId: string;
    photoUri: string;
    amount?: number;
    pickupAddress?: string;
    dropoffAddress?: string;
    itemType?: string;
  };
  Withdraw: undefined;
  TransactionHistory: undefined;
  ActivityDetail: {
    activityId: string;
    destination: string;
    date: string;
    amount: number;
    status: "completed" | "cancelled";
  };
  DeliveryCompleted: {
    orderId: string;
    amount: number;
    pickupAddress: string;
    dropoffAddress: string;
    itemType: string;
  };
  RiderOffline: undefined;

  // Also add these to MainTabParamList sub-screens (or keep in MainStack — your choice):
  Profile: undefined;
  PaymentMethods: undefined;
  Notifications: undefined;
  Security: undefined;
  Support: undefined;
  Settings: undefined;
};
