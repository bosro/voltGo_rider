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
import EmailVerificationScreen from "@/screens/main/Accounts/EmailVerificationScreen";

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
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: true }}
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












/**
 * EmailVerificationScreen.tsx
 *
 * Backend now enforces email verification before a rider can go online or
 * accept orders (PUT /rider/status, POST /rider/orders/{id}/accept). This
 * screen sends/verifies the OTP via POST /rider/send-otp-email +
 * POST /rider/verify-email.
 *
 * Reached from:
 *  - ProfileScreen, when the rider taps "Verify" next to their email
 *  - The go-online gate on HomeMapScreen
 *
 * route.params.returnTo (optional) — screen name to navigate back to on
 * successful verification.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius } from "../../../theme";
import {
  useRiderProfile,
  useSendRiderEmailOtp,
  useVerifyRiderEmailOtp,
} from "../../../hooks/rider/useRider";
import { useToast } from "@/components/common/Toast";

const OTP_LENGTH = 5;
const backArrow = require("../../../../assets/icons/back-arrow.png");

export default function EmailVerificationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const returnTo: string | undefined = route.params?.returnTo;
  const returnParams = route.params?.returnParams;
  const toast = useToast();

  const { data: profileRes } = useRiderProfile();
  const email = (profileRes?.data as any)?.email as string | null | undefined;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const sendOtpMutation = useSendRiderEmailOtp();
  const verifyMutation = useVerifyRiderEmailOtp();

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    handleSend(true);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSend = async (silent = false) => {
    if (!email) {
      if (!silent) toast.error("Add an email address in your profile first.");
      return;
    }
    try {
      await sendOtpMutation.mutateAsync();
      setSentOnce(true);
      setCountdown(30);
      if (!silent) toast.success("A verification code has been sent to your email.");
    } catch (err: any) {
      if (!silent)
        toast.error(
          err?.response?.data?.message ?? "Could not send the code. Please try again.",
        );
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      digits.forEach((d, i) => {
        if (i < OTP_LENGTH) newOtp[i] = d;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      shake();
      return;
    }
    try {
      await verifyMutation.mutateAsync(code);
      toast.success("Email verified — you're all set.");
      if (returnTo) {
        navigation.navigate(returnTo, returnParams);
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      shake();
      toast.error(err?.response?.data?.message ?? "Invalid or expired code.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={backArrow} style={{ width: 18, height: 18 }} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={{ width: 32 }} />
        </View>

        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          <Text style={styles.heading}>Confirm it's you</Text>
          <Text style={styles.subtitle}>
            {email
              ? `Enter the 5-digit code we sent to ${email}`
              : "Add an email address in your profile to verify it."}
          </Text>

          <Animated.View
            style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textAlign="center"
                editable={!!email}
                selectionColor={Colors.primary}
                caretHidden
              />
            ))}
          </Animated.View>

          <TouchableOpacity
            onPress={() => handleSend(false)}
            disabled={countdown > 0 || sendOtpMutation.isPending || !email}
          >
            <Text style={[styles.resend, countdown === 0 && email && styles.resendActive]}>
              {sendOtpMutation.isPending
                ? "Sending..."
                : countdown > 0
                  ? `Resend in ${countdown}s`
                  : sentOnce
                    ? "Resend code"
                    : "Send code"}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[
              styles.button,
              (verifyMutation.isPending || !email) && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            onPress={handleVerify}
            disabled={verifyMutation.isPending || !email}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  heading: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  otpBox: {
    width: 56,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.white,
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.textPrimary,
  },
  otpBoxFilled: { backgroundColor: Colors.otpBg },
  resend: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: Colors.textMuted,
  },
  resendActive: { color: Colors.primary },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: Colors.navy,
  },
});
