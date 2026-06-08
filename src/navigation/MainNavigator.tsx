import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SvgProps } from "react-native-svg";
import { MainStackParamList, MainTabParamList } from "./types";
import { Colors } from "../theme";

import HomeMapScreen from "../screens/main/HomeMapScreen";
import WalletScreen from "../screens/main/WalletScreen";
import DeliveryRequestScreen from "../screens/main/DeliveryRequestScreen";
import EnRoutePickupScreen from "../screens/main/EnRoutePickupScreen";
import PackageCollectedScreen from "../screens/main/PackageCollectedScreen";
import CameraCaptureScreen from "../screens/main/CameraCaptureScreen";
import SubmitPhotoScreen from "../screens/main/SubmitPhotoScreen";
import PaymentMethodsScreen from "@/screens/main/Accounts/PaymentMethodsScreen";
import NotificationsScreen from "@/screens/main/Accounts/NotificationsScreen";
import SecurityScreen from "@/screens/main/Accounts/SecurityScreen";
import SettingsScreen from "@/screens/main/Accounts/SettingsScreen";
import SupportScreen from "@/screens/main/Accounts/SupportScreen";
import DeliveryCompletedScreen from "@/screens/main/delivery/DeliveryCompletedScreen";
import RiderOfflineScreen from "@/screens/main/delivery/RiderOfflineScreen";
import TransactionHistoryScreen from "@/screens/main/wallet/TransactionHistoryScreen";
import WithdrawScreen from "@/screens/main/wallet/WithdrawScreen";
import ActivitiesScreen from "@/screens/main/activities/ActivitiesScreen";
import AccountScreen from "@/screens/main/Accounts/AccountScreen";
import ActivityDetailScreen from "@/screens/main/activities/ActivityDetailScreen";
import ProfileScreen from "@/screens/main/Accounts/ProfileScreen";

import HomeDefault from "../../assets/icons/tab-home-default.svg";
import HomeActive from "../../assets/icons/tab-home-active.svg";
import WalletDefault from "../../assets/icons/tab-wallet-default.svg";
import WalletActive from "../../assets/icons/tab-wallet-active.svg";
import ActivitiesDefault from "../../assets/icons/tab-activities-default.svg";
import ActivitiesActive from "../../assets/icons/tab-activities-active.svg";
import AccountDefault from "../../assets/icons/tab-account-default.svg";
import AccountActive from "../../assets/icons/tab-account-active.svg";

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
  return (
    <View style={tabStyles.bar}>
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
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 10,
    height: Platform.OS === "ios" ? 72 : 58,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    width: "60%",
    justifyContent: "space-between",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Delivery flow */}
      <Stack.Screen
        name="DeliveryRequest"
        component={DeliveryRequestScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="EnRoutePickup"
        component={EnRoutePickupScreen}
        options={{ animation: "fade", gestureEnabled: false }}
      />
      <Stack.Screen
        name="PackageCollected"
        component={PackageCollectedScreen}
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

      {/* Account sub-screens */}
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

      {/* Wallet sub-screens */}
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

      {/* Activities sub-screens */}
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
