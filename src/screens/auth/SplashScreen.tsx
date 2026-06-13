/**
 * SplashScreen.tsx
 *
 * On boot:
 *  1. Show animated logo/splash for ~1.8 s
 *  2. Check if biometric is enabled (@voltgo_biometric_enabled)
 *  3a. If YES → prompt Face ID / Touch ID immediately
 *      - Success → navigate to MainApp (session already hydrated by authStore)
 *      - Failure/Cancel → navigate to Welcome (let rider log in manually)
 *  3b. If NO  → navigate to Welcome as before
 *
 * Note: authStore.hydrate() is called in RootNavigator before this screen
 * mounts, so isAuthenticated is already set. We use it to decide whether
 * biometric prompt makes sense (no point prompting if not authenticated).
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, StatusBar, Image, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "../../store/authStore";

const BIOMETRIC_KEY = "@voltgo_biometric_enabled";

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      // Fade out before navigating
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        await handlePostSplash();
      });
    }, 1_800);

    return () => clearTimeout(timer);
  }, []);

  const handlePostSplash = async () => {
    try {
      // Only attempt biometric if there is a stored session
      if (!isAuthenticated) {
        navigation.replace("Welcome");
        return;
      }

      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (biometricEnabled !== "true") {
        // Biometric not set up — go straight to the app
        navigation.replace("MainApp");
        return;
      }

      // Check hardware + enrollment
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Device no longer supports / has biometrics — skip
        navigation.replace("MainApp");
        return;
      }

      // Prompt biometric
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to VoltGo Rider",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        navigation.replace("MainApp");
      } else if (
        result.error === "user_cancel" ||
        result.error === "system_cancel"
      ) {
        // Rider cancelled — send to Welcome so they can log in with phone
        navigation.replace("Welcome");
      } else {
        // Any other failure (lockout, etc.) — fall back to phone login
        navigation.replace("Welcome");
      }
    } catch {
      navigation.replace("Welcome");
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0D3558"
        translucent
      />
      <Animated.Image
        source={require("../../../assets/images/android-logo.png")}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B3C5D",
  },
  bg: { ...StyleSheet.absoluteFill },
  logo: {
    width: 420,
    height: 300,
  },
});
