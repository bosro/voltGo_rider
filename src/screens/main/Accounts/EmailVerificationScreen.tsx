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

  // FIX: destructure refetch so we can force a fresh profile fetch on
  // mount, the same way the customer app does. This screen can be reached
  // from HomeMapScreen's go-online gate as well as ProfileScreen, so we
  // can't assume the cached profile is current — and the original
  // one-shot `handleSend(true)` in an empty-dependency effect used
  // whatever `email` happened to be in the closure on the very first
  // render, silently no-op'ing forever if the profile hadn't loaded yet.
  const { data: profileRes, refetch: refetchProfile } = useRiderProfile();
  // FIX: useRiderProfile's queryFn returns the profile object directly
  // (see useRider.ts — `return profile;`), not wrapped in an extra `data`
  // field. The previous `profileRes?.data?.email` was reaching one level
  // too deep and was always undefined, which meant `email` was always
  // falsy here — handleSend's `if (!email) return` guard silently blocked
  // every auto-send AND every manual "Send code" tap, so the countdown
  // never started and /rider/send-otp-email was never actually hit.
  const email = (profileRes as any)?.email as string | null | undefined;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const sendOtpMutation = useSendRiderEmailOtp();
  const verifyMutation = useVerifyRiderEmailOtp();

  const didAutoSend = useRef(false);
  const [freshChecked, setFreshChecked] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  // Force a fresh profile fetch every time this screen mounts.
  useEffect(() => {
    refetchProfile().finally(() => setFreshChecked(true));
  }, []);

  // Auto-send only once the fresh fetch has completed AND we have a real
  // email to send to.
  useEffect(() => {
    if (email && freshChecked && !didAutoSend.current) {
      didAutoSend.current = true;
      handleSend(true);
    }
  }, [email, freshChecked]);

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

  // FIX: while the forced refetch hasn't resolved yet, show loading copy
  // and keep controls disabled — mirrors the customer screen.
  const stillResolving = !freshChecked;

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
          {stillResolving ? (
            <Text style={styles.subtitle}>Checking your account…</Text>
          ) : (
            <Text style={styles.subtitle}>
              {email
                ? `Enter the 5-digit code we sent to ${email}`
                : "Add an email address in your profile to verify it."}
            </Text>
          )}

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
                editable={!!email && !stillResolving}
                selectionColor={Colors.primary}
                caretHidden
              />
            ))}
          </Animated.View>

          <TouchableOpacity
            onPress={() => handleSend(false)}
            disabled={countdown > 0 || sendOtpMutation.isPending || !email || stillResolving}
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
              (verifyMutation.isPending || !email || stillResolving) && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            onPress={handleVerify}
            disabled={verifyMutation.isPending || !email || stillResolving}
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