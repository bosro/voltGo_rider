import React, { useEffect, useState } from "react";
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
import { STORAGE_KEYS } from "@/lib/api";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isHydrating, hydrate } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
    AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED).then((val) => {
      setHasOnboarded(val === "true");
    });
  }, []);

  if (isHydrating || hasOnboarded === null) return null;

  return (
    <Stack.Navigator
      initialRouteName={
        isAuthenticated
          ? "MainApp"
          : hasOnboarded
            ? "PhoneEntry" // ← returning user goes straight to login
            : "Splash" // ← first ever open sees Splash → Welcome → PhoneEntry
      }
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
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
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
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
        name="MainApp"
        component={MainNavigator}
        options={{ animation: "fade" }}
      />
      <Stack.Screen
        name="NotificationPermission"
        component={NotificationPermissionScreen}
        options={{ animation: "fade", gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}


