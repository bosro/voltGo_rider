import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SvgProps } from "react-native-svg";
import { MainStackParamList, MainTabParamList } from "./types";
import { Colors } from "../theme";

// ── Hooks (mounted once for the entire authenticated session) ──────
import { useSocket } from "../lib/useSocket";

// ── Tab screens ────────────────────────────────────────────────────
import HomeMapScreen from "../screens/main/HomeMapScreen";
import WalletScreen from "../screens/main/WalletScreen";
import ActivitiesScreen from "../screens/main/activities/ActivitiesScreen";
import AccountScreen from "../screens/main/Accounts/AccountScreen";

// ── Delivery flow screens ──────────────────────────────────────────
import DeliveryRequestScreen from "../screens/main/DeliveryRequestScreen";
import ActiveDeliveryScreen from "../screens/main/ActiveDeliveryScreen"; // replaces EnRoutePickup + PackageCollected
import CameraCaptureScreen from "../screens/main/CameraCaptureScreen";
import SubmitPhotoScreen from "../screens/main/SubmitPhotoScreen";
import DeliveryCompletedScreen from "@/screens/main/delivery/DeliveryCompletedScreen";
import RiderOfflineScreen from "@/screens/main/delivery/RiderOfflineScreen";

// ── Account sub-screens ────────────────────────────────────────────
import ProfileScreen from "../screens/main/Accounts/ProfileScreen";
import PaymentMethodsScreen from "@/screens/main/Accounts/PaymentMethodsScreen";
import AddPaymentMethodScreen from "@/screens/main/Accounts/AddPaymentMethodScreen";
import NotificationsScreen from "@/screens/main/Accounts/NotificationsScreen";
import SecurityScreen from "@/screens/main/Accounts/SecurityScreen";
import SupportScreen from "@/screens/main/Accounts/SupportScreen";
import SettingsScreen from "@/screens/main/Accounts/SettingsScreen";

// ── Wallet sub-screens ─────────────────────────────────────────────
import WithdrawScreen from "@/screens/main/wallet/WithdrawScreen";
import TransactionHistoryScreen from "@/screens/main/wallet/TransactionHistoryScreen";

// ── Activities sub-screens ─────────────────────────────────────────
import ActivityDetailScreen from "../screens/main/activities/ActivityDetailScreen";

// ── Tab icons ──────────────────────────────────────────────────────
import HomeDefault from "../../assets/icons/tab-home-default.svg";
import HomeActive from "../../assets/icons/tab-home-active.svg";
import WalletDefault from "../../assets/icons/tab-wallet-default.svg";
import WalletActive from "../../assets/icons/tab-wallet-active.svg";
import ActivitiesDefault from "../../assets/icons/tab-activities-default.svg";
import ActivitiesActive from "../../assets/icons/tab-activities-active.svg";
import AccountDefault from "../../assets/icons/tab-account-default.svg";
import AccountActive from "../../assets/icons/tab-account-active.svg";
import { useLocationTracking } from "@/hooks/rider/useLocationTracking";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Tab config ─────────────────────────────────────────────────────
const TABS: {
  name: keyof MainTabParamList;
  IconDefault: React.FC<SvgProps>;
  IconActive: React.FC<SvgProps>;
}[] = [
  { name: "HomeMap", IconDefault: HomeDefault, IconActive: HomeActive },
  { name: "Wallet", IconDefault: WalletDefault, IconActive: WalletActive },
  {
    name: "Activities",
    IconDefault: ActivitiesDefault,
    IconActive: ActivitiesActive,
  },
  { name: "Account", IconDefault: AccountDefault, IconActive: AccountActive },
];

// ── BottomTabBar ───────────────────────────────────────────────────
export function BottomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[tabStyles.bar, { paddingBottom: Math.max(insets.bottom, 18) }]}
    >
      <View style={tabStyles.inner}>
        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          const Icon = isActive ? tab.IconActive : tab.IconDefault;
          return (
            <TouchableOpacity
              key={tab.name}
              style={tabStyles.tab}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <Icon width={24} height={24} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
    paddingTop: 14,
  },
  inner: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
     paddingVertical: 8, 
  },
});

// ── MainTabs ───────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="HomeMap" component={HomeMapScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

// ── MainNavigator ──────────────────────────────────────────────────
const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  // Both hooks are mounted ONCE here and run for the entire authenticated
  // session regardless of which screen is visible.
  //
  // useSocket         → connects Socket.IO, wires order:assigned /
  //                     order:cancelled / order:status_changed to riderStore
  // useLocationTracking → expo-location watch → riderStore.currentCoords
  //                       + throttled PUT /rider/location every 8 s
  useSocket();
  useLocationTracking();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* ── Tabs (home) ─────────────────────────────────────── */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* ── Delivery flow ───────────────────────────────────── */}
      {/*
       * DeliveryRequest — slides up as a modal when an offer arrives.
       * gestureEnabled:false so the rider can't accidentally swipe it away.
       */}
      <Stack.Screen
        name="DeliveryRequest"
        component={DeliveryRequestScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />

      {/*
       * ActiveDelivery — single screen that replaces both EnRoutePickup
       * and PackageCollected. The map, polyline, and card stay mounted;
       * only the CTA changes as activeOrder.status progresses:
       *   accepted / rider_arriving / arrived → "I have arrived"
       *   collected / in_transit              → "Package collected" → camera
       * Status is driven by socket (order:status_changed) so the CTA
       * flips automatically without any navigation.
       */}
      <Stack.Screen
        name="ActiveDelivery"
        component={ActiveDeliveryScreen}
        options={{ animation: "fade", gestureEnabled: false }}
      />

      <Stack.Screen
        name="CameraCapture"
        component={CameraCaptureScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="SubmitPhoto"
        component={SubmitPhotoScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="DeliveryCompleted"
        component={DeliveryCompletedScreen}
        options={{ animation: "fade", gestureEnabled: false }}
      />
      <Stack.Screen
        name="RiderOffline"
        component={RiderOfflineScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: true }}
      />

      {/* ── Account sub-screens ──────────────────────────────── */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={AddPaymentMethodScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />

      {/* ── Wallet sub-screens ───────────────────────────────── */}
      <Stack.Screen
        name="Withdraw"
        component={WithdrawScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: true }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />

      {/* ── Activities sub-screens ───────────────────────────── */}
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}




