import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NavyButton } from "../../components/common";
import { Colors, Radius, Typography } from "../../theme";

import { useToast } from "@/components/common/Toast";
import { SafeAreaView } from "react-native-safe-area-context";
import ChevronDown from "../../../assets/icons/chevron-down-sm.svg";
import GhanaFlag from "../../../assets/icons/flag-ghana.svg";
import GoogleIcon from "../../../assets/icons/google.svg";
import {
  useLoginRider,
  useRegisterRider,
  useSendOtp,
} from "../../hooks/auth/useAuth";

export default function PhoneEntryScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast(); // ← replaces Alert.alert
  const [isNewRider, setIsNewRider] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const { mutateAsync: sendOtp, isPending: isSendingOtp } = useSendOtp();
  const { mutateAsync: register, isPending: isRegistering } =
    useRegisterRider();
  const { mutateAsync: loginRider, isPending: isLoggingIn } = useLoginRider();

  const isPending = isSendingOtp || isRegistering || isLoggingIn;

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

  const handleTabSwitch = (newRider: boolean) => {
    setIsNewRider(newRider);
    setPhone("");
    setFullName("");
    setPassword("");
    setShowPassword(false);
  };

  const handleContinue = async () => {
    const trimmed = phone.trim();

    // Normalize: strip leading 0 if user typed the full number
    const digits = trimmed.startsWith("0") ? trimmed.slice(1) : trimmed;

    if (digits.length !== 9) {
      toast.error("Please enter a valid 9-digit phone number.");
      return;
    }

    const fullPhone = `0${digits}`;

    if (isNewRider) {
      if (!fullName.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }

      try {
        await register({
          fullName: fullName.trim(),
          phone: fullPhone,
          password,
        });
        await sendOtp(fullPhone);
        navigation.navigate("OTP", { phone: fullPhone, isNewRider: true });
      } catch (err: any) {
        // Network / server error — toast keeps the user in context to retry
        const message =
          err?.response?.data?.message ??
          "Something went wrong. Please try again.";
        toast.error(message);
      }
    } else {
      if (!password) {
        toast.error("Please enter your password.");
        return;
      }

      try {
        await loginRider({ phone: fullPhone, password });
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          "Incorrect phone or password. Please try again.";
        toast.error(message);
      }
    }
  };

  const socialOptions = [
    {
      Icon: GoogleIcon,
      w: 22,
      h: 22,
      label: isNewRider ? "Sign up with Google" : "Sign in with Google",
      onPress: () => {},
    },
  ];

  // Add this just before the return statement:
  const digits = phone.trim().startsWith("0")
    ? phone.trim().slice(1)
    : phone.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
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
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isNewRider && styles.toggleBtnActive]}
              onPress={() => handleTabSwitch(false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  !isNewRider && styles.toggleTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isNewRider && styles.toggleBtnActive]}
              onPress={() => handleTabSwitch(true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isNewRider && styles.toggleTextActive,
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>
            {isNewRider ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={styles.subtitle}>
            {isNewRider
              ? "We will send you a verification code on this\nnumber as SMS."
              : "Sign in with your phone number and password."}
          </Text>

          {isNewRider && (
            <TextInput
              style={styles.textInput}
              placeholder="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor={Colors.textPlaceholder}
            />
          )}

          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countryPicker} activeOpacity={0.8}>
              <GhanaFlag width={24} height={24} />
              <ChevronDown width={12} height={8} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <View style={styles.phoneInputWrap}>
              <Text style={styles.countryCode}>+233</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={Colors.textPlaceholder}
              />
            </View>
          </View>

          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={Colors.textPlaceholder}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <Image
                  source={require("../../../assets/icons/eye-closed.png")}
                  style={{ width: 20, height: 20, tintColor: "#0B3C5D" }}
                />
              ) : (
                <Image
                  source={require("../../../assets/icons/eye-open.png")}
                  style={{ width: 20, height: 20, tintColor: "#0B3C5D" }}
                />
              )}
            </TouchableOpacity>
          </View>

          {isNewRider && password.length > 0 && (
            <View style={{ marginTop: -8, marginBottom: 10 }}>
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

          {!isNewRider && (
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={{ alignSelf: "flex-end", marginTop: -4, marginBottom: 12 }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 10 }} />
          <NavyButton
            label={
              isPending ? "Please wait..." : isNewRider ? "Register" : "Sign In"
            }
            onPress={handleContinue}
            disabled={isPending || digits.length !== 9 || !password}
          />
          <View style={{ height: 20 }} />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.orLine} />
          </View>

          {socialOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.socialRow}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <item.Icon
                width={item.w}
                height={item.h}
                style={{ marginRight: 12 }}
              />
              <Text style={styles.socialLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 20 }} />
          <Text style={styles.terms}>
            By continuing, you agree to our{" "}
            <Text style={styles.termsLink}>
              terms and{"\n"}conditions and privacy policies
            </Text>
            .
          </Text>
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
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    gap: 10,
  },
  countryPicker: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    gap: 4,
  },
  phoneInputWrap: { flexDirection: "row", alignItems: "center", flex: 1 },
  countryCode: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  textInput: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
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
  forgotText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.navy,
    textDecorationLine: "underline",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  orText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.white,
  },
  socialLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  terms: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 14,
  },
  termsLink: { color: Colors.textSecondary, textDecorationLine: "underline" },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radius.lg,
  },
  toggleBtnActive: { backgroundColor: Colors.navy },
  toggleText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  toggleTextActive: { color: Colors.white },
  hint: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: "#E53935",
    marginBottom: 2,
  },
  hintOk: { color: "#2E7D32" },
});
