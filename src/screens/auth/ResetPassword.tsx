import { useToast } from "@/components/common/Toast";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GhostButton, NavyButton } from "../../components/common";
import ConfirmModal from "../../components/common/ConfirmModal"; // ← adjust path
import { useForgotPassword, useResetPassword } from "../../hooks/auth/useAuth";
import { RootStackParamList } from "../../navigation/types";
import { Colors, Radius, Typography } from "../../theme";

type ResetPasswordRouteProp = RouteProp<RootStackParamList, "ResetPassword">;

const OTP_LENGTH = 5;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { phone } = route.params;

  const toast = useToast();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Success modal — needs a deliberate "Sign In" tap to navigate ──
  const [successModal, setSuccessModal] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const { mutateAsync: resetPassword, isPending } = useResetPassword();
  const { mutateAsync: forgotPassword, isPending: isResending } =
    useForgotPassword();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 58,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── OTP change handler ─────────────────────────────────────────────
  // Handles both normal single-digit typing AND a full code being
  // pasted/autofilled into one box (common with SMS autofill on both
  // iOS and Android, which drops the whole code into whichever field
  // is focused).
  const handleOtpChange = (text: string, index: number) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");

    if (digitsOnly.length > 1) {
      // Multi-digit input landed in one box → distribute across boxes
      // starting at the current index.
      const next = [...otp];
      let cursor = index;
      for (let i = 0; i < digitsOnly.length && cursor < OTP_LENGTH; i++) {
        next[cursor] = digitsOnly[i];
        cursor++;
      }
      setOtp(next);

      const lastFilledIndex = Math.min(cursor, OTP_LENGTH - 1);
      if (cursor >= OTP_LENGTH) {
        Keyboard.dismiss();
        inputRefs.current[OTP_LENGTH - 1]?.blur();
      } else {
        inputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    // Normal single-digit entry
    const digit = digitsOnly.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (digit && index === OTP_LENGTH - 1) {
      // Last digit entered → close the keyboard, code is complete
      Keyboard.dismiss();
      inputRefs.current[index]?.blur();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpValue = otp.join("");

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      await forgotPassword(phone);
      setResendCooldown(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      // ← Toast: lightweight confirmation that the code was sent, no action needed
      toast.success("A new reset code has been sent to your number.");
    } catch (err: any) {
      // ← Toast: transient error, rider stays on screen to retry
      const message =
        err?.response?.data?.message ?? "Could not resend. Try again.";
      toast.error(message);
    }
  };

  const handleReset = async () => {
    // ── Validation — toast keeps rider in context to fix the field ────
    if (otpValue.length !== OTP_LENGTH) {
      toast.error("Please enter the 5-digit code.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({ phone, otp: otpValue, password });
      // ← ConfirmModal: success state the rider must acknowledge before
      //   navigating away — the CTA ("Sign In") drives the next action.
      setSuccessModal(true);
    } catch (err: any) {
      // ← Toast: reset failure is transient; rider corrects code and retries
      const message =
        err?.response?.data?.message ??
        "Reset failed. Check your code and try again.";
      toast.error(message);
    }
  };

  const isSubmitDisabled =
    isPending ||
    otpValue.length !== OTP_LENGTH ||
    !password ||
    !confirmPassword;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* ── Password reset success modal ──────────────────────────── */}
      <ConfirmModal
        visible={successModal}
        title="Password Reset"
        message="Your password has been updated. Please sign in with your new password."
        primaryLabel="Sign In"
        onPrimary={() => {
          setSuccessModal(false);
          navigation.reset({ index: 0, routes: [{ name: "PhoneEntry" }] });
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.hero}>
          <Image
            source={require("../../../assets/images/onboarding2.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={styles.heading}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter the 5-digit code sent to{"\n"}
            <Text style={styles.phoneHighlight}>+233 {phone.slice(1)}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, i)}
                onKeyPress={(e) => handleOtpKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                textContentType={
                  Platform.OS === "ios" ? "oneTimeCode" : undefined
                }
                autoComplete={
                  Platform.OS === "android" ? "sms-otp" : "one-time-code"
                }
                importantForAutofill="yes"
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || isResending}
            >
              <Text
                style={[
                  styles.resendLink,
                  (resendCooldown > 0 || isResending) && styles.resendDisabled,
                ]}
              >
                {isResending
                  ? "Sending..."
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend code"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>New password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={Colors.textPlaceholder}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Image
                source={
                  showPassword
                    ? require("../../../assets/icons/eye-closed.png")
                    : require("../../../assets/icons/eye-open.png")
                }
                style={{ width: 20, height: 20, tintColor: "#0B3C5D" }}
              />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={{ marginTop: -8, marginBottom: 12 }}>
              <Text
                style={[styles.hint, password.length >= 8 && styles.hintOk]}
              >
                {password.length >= 8 ? "✓" : "✗"} At least 8 characters
              </Text>
              <Text
                style={[styles.hint, /[A-Z]/.test(password) && styles.hintOk]}
              >
                {/[A-Z]/.test(password) ? "✓" : "✗"} One uppercase letter
              </Text>
              <Text
                style={[styles.hint, /[0-9]/.test(password) && styles.hintOk]}
              >
                {/[0-9]/.test(password) ? "✓" : "✗"} One number
              </Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Confirm password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholderTextColor={Colors.textPlaceholder}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((p) => !p)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Image
                source={
                  showConfirm
                    ? require("../../../assets/icons/eye-closed.png")
                    : require("../../../assets/icons/eye-open.png")
                }
                style={{ width: 20, height: 20, tintColor: "#0B3C5D" }}
              />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && (
            <View style={{ marginTop: -8, marginBottom: 12 }}>
              <Text
                style={[
                  styles.hint,
                  password === confirmPassword && styles.hintOk,
                ]}
              >
                {password === confirmPassword ? "✓" : "✗"} Passwords match
              </Text>
            </View>
          )}

          <View style={{ height: 8 }} />

          <NavyButton
            label={isPending ? "Resetting..." : "Reset password"}
            onPress={handleReset}
            disabled={isSubmitDisabled}
          />

          <GhostButton
            label="Back"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 10,
    height: 220,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: Colors.navy,
  },
  heroImage: { width: "100%", height: "100%" },
  content: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  phoneHighlight: { fontFamily: "Poppins-SemiBold", color: Colors.navy },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: "center",
    // Pin the writing direction to LTR. Without this, on Android devices
    // where the system/app locale is RTL, the OS mirrors individual
    // glyph shapes inside text inputs — which is what was causing the
    // OTP digits to render flipped/upside-down.
    writingDirection: "ltr",
    fontSize: 22,
    fontFamily: "Poppins-SemiBold",
    color: Colors.textPrimary,
  },
  otpBoxFilled: { borderColor: Colors.navy, backgroundColor: Colors.white },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  resendLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  resendLink: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.navy,
    textDecorationLine: "underline",
  },
  resendDisabled: { color: Colors.textMuted, textDecorationLine: "none" },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 22 },
  fieldLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: 13,
  },
  eyeBtn: { paddingLeft: 10 },
  hint: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: "#E53935",
    marginBottom: 2,
  },
  hintOk: { color: "#2E7D32" },
});