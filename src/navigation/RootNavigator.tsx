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
import { registerSessionExpiredHandler, STORAGE_KEYS } from "@/lib/api";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isHydrating, hydrate, logout } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
    AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED).then((val) => {
      setHasOnboarded(val === "true");
    });

    registerSessionExpiredHandler(async () => {
      const { isAuthenticated, logout } = useAuthStore.getState();

      // Don't trigger session expiry during a fresh login attempt
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


