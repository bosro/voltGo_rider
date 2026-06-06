export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  PhoneEntry: undefined;
  OTP: { phone: string };
  CreateProfileStep1: undefined;
  CreateProfileStep2: { name: string; email?: string; language: string };
  CreateProfileStep3: { name: string; email?: string; language: string; idType: string; idNumber: string; vehicleType: string };
  CreateProfileStep4: { name: string; email?: string; language: string; idType: string; idNumber: string; vehicleType: string; ghanaCardUri?: string; profilePhotoUri?: string };
  BiometricSetup: undefined;
  MainApp: undefined;
};

export type MainTabParamList = {
  HomeMap: undefined;
  Wallet: undefined;
  Activities: undefined;
  Account: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  DeliveryRequest: { orderId: string; customerName: string; customerPhone: string; pickupAddress: string; dropoffAddress: string; itemType: string; price: number; pickupEta: number };
  EnRoutePickup: { orderId: string; customerName: string; customerPhone: string; pickupAddress: string; dropoffAddress: string; itemType: string; price: number; pickupEta: number };
  PackageCollected: { orderId: string; customerName: string; customerPhone: string; pickupAddress: string; dropoffAddress: string; itemType: string; price: number };
  CameraCapture: { orderId: string; mode: 'delivery_proof' };
  SubmitPhoto: { orderId: string; photoUri: string };
};
