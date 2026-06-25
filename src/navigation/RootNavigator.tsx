import React, { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";

import SplashScreen from "../screens/auth/SplashScreen";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import PhoneEntryScreen from "../screens/auth/PhoneEntryScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import BiometricSetupScreen from "../screens/auth/BiometricSetupScreen";
import {
  CreateProfileStep2Screen,
  CreateProfileStep3Screen,
  CreateProfileStep4Screen,
} from "../screens/profile/CreateProfileScreens";
import MainNavigator from "./MainNavigator";
import NotificationPermissionScreen from "@/screens/main/onboarding/NotificationPermissionScreen";

import { useAuthStore } from "../store/authStore";
import ResetPasswordScreen from "@/screens/auth/ResetPassword";
import ForgotPasswordScreen from "@/screens/auth/ForgotPasswordScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BASE_URL,
  ordersApi,
  registerSessionExpiredHandler,
  setTokens,
  STORAGE_KEYS,
} from "@/lib/api";
import { navigationRef } from "./navigationRef";
import axios from "axios";
import { AppState, AppStateStatus } from "react-native";
import { useRiderStore } from "@/store/riderStore";
import { CommonActions } from "@react-navigation/native";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isHydrating, hydrate, logout } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const hasHydrated = useRef(false); // ← ADD THIS

  useEffect(() => {
    const resumeActiveDelivery = async () => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      try {
        const res = await ordersApi.getActiveOrder();
        const order = res.data?.data;
        if (!order) return;

        useRiderStore.getState().setActiveOrder(order);

        const currentRoute = navigationRef.current?.getCurrentRoute()?.name as
          | string
          | undefined;
        const safeToNavigate =
          !currentRoute ||
          [
            "HomeMap",
            "MainTabs",
            "Activities",
            "Wallet",
            "Account",
            "HomeMap",
          ].includes(currentRoute);
        if (!safeToNavigate) return;

        const pickupCoords = {
          latitude: parseFloat(order.pickup_lat),
          longitude: parseFloat(order.pickup_lng),
        };
        const dropoffCoords = {
          latitude: parseFloat(order.dropoff_lat),
          longitude: parseFloat(order.dropoff_lng),
        };

        const sharedParams = {
          orderId: order.id,
          customerName: order.customer?.full_name ?? "",
          customerPhone: order.customer?.phone ?? "",
          pickupAddress: order.pickup_address,
          dropoffAddress: order.dropoff_address,
          itemType: order.item_description ?? "Parcel",
          price: parseFloat(order.price_ghs ?? "0"),
          pickupCoords,
          dropoffCoords,
        };

        if (
          [
            "accepted",
            "assigned",
            "arrived",
            "rider_arriving",
            "collected",
            "in_transit",
          ].includes(order.status)
        ) {
          navigationRef.current?.dispatch(
            CommonActions.navigate({
              name: "ActiveDelivery",
              params: sharedParams,
            }),
          );
        }
      } catch {}
    };

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== "active") return;
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      // Silent token refresh
      try {
        const refreshToken = await AsyncStorage.getItem(
          STORAGE_KEYS.REFRESH_TOKEN,
        );
        if (!refreshToken) return;
        const { data } = await axios.post(`${BASE_URL}/token/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccess = data?.data?.access_token ?? data?.access_token;
        const newRefresh =
          data?.data?.refresh_token ?? data?.refresh_token ?? refreshToken;
        await setTokens(newAccess, newRefresh);
        useAuthStore.setState({ accessToken: newAccess });
      } catch {}

      // Resume delivery
      resumeActiveDelivery();
    };

    resumeActiveDelivery(); // cold start
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (hasHydrated.current) return; // ← prevent re-runs on re-mount
    hasHydrated.current = true;

    hydrate();
    AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED).then((val) => {
      setHasOnboarded(val === "true");
    });

    registerSessionExpiredHandler(async () => {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (!isAuthenticated) return;
      await logout();
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: "PhoneEntry" }],
      });
    });
  }, []);

  if (isHydrating || hasOnboarded === null) return null;

  // ← Derive the initial route
  const initialRoute = isAuthenticated
    ? "MainApp"
    : hasOnboarded
      ? "PhoneEntry"
      : "Splash";

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      {/* Auth screens — only rendered when NOT authenticated */}
      {!isAuthenticated && (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ animation: "fade" }}
          />
          <Stack.Screen
            name="PhoneEntry"
            component={PhoneEntryScreen}
            options={{ animation: "slide_from_right", gestureEnabled: true }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ animation: "slide_from_right", gestureEnabled: true }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ animation: "slide_from_right", gestureEnabled: true }}
          />
          <Stack.Screen
            name="OTP"
            component={OTPScreen}
            options={{ animation: "slide_from_right", gestureEnabled: true }}
          />
          <Stack.Screen
            name="CreateProfileStep2"
            component={CreateProfileStep2Screen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="CreateProfileStep3"
            component={CreateProfileStep3Screen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="CreateProfileStep4"
            component={CreateProfileStep4Screen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="BiometricSetup"
            component={BiometricSetupScreen}
            options={{ animation: "fade" }}
          />
          <Stack.Screen
            name="NotificationPermission"
            component={NotificationPermissionScreen}
            options={{ animation: "fade", gestureEnabled: false }}
          />
        </>
      )}

      {/* Main app — only rendered when authenticated */}
      {isAuthenticated && (
        <Stack.Screen
          name="MainApp"
          component={MainNavigator}
          options={{ animation: "fade" }}
        />
      )}
    </Stack.Navigator>
  );
}
