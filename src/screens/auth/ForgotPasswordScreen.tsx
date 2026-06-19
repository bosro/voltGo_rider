import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavyButton, GhostButton } from "../../components/common";
import { Colors, Typography, Radius } from "../../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForgotPassword } from "../../hooks/auth/useAuth";

import GhanaFlag from "../../../assets/icons/flag-ghana.svg";
import ChevronDown from "../../../assets/icons/chevron-down-sm.svg";
import { useToast } from "@/components/common/toast";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [phone, setPhone] = useState("");

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const { mutateAsync: forgotPassword, isPending } = useForgotPassword();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 58, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendCode = async () => {
    const trimmed = phone.trim();

    // ← Toast: quick inline validation, user stays in context to fix it
    if (trimmed.length !== 9) {
      toast.error("Please enter a valid 9-digit phone number.");
      return;
    }

    const fullPhone = `0${trimmed}`;

    try {
      await forgotPassword(fullPhone);
      navigation.navigate("ResetPassword", { phone: fullPhone });
    } catch (err: any) {
      // ← Toast: transient server error, no blocking action needed
      const message =
        err?.response?.data?.message ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

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
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Image
                source={require("../../../assets/icons/eye-open.png")}
                style={{ width: 28, height: 28, tintColor: Colors.navy }}
              />
            </View>
          </View>

          <Text style={styles.heading}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter the phone number linked to your{"\n"}account. We'll send you a
            reset code.
          </Text>

          <Text style={styles.fieldLabel}>Phone number</Text>
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
                placeholder="XXXXXXXXX"
                placeholderTextColor={Colors.textPlaceholder}
                maxLength={9}
              />
            </View>
          </View>

          <View style={{ height: 8 }} />

          <NavyButton
            label={isPending ? "Sending code..." : "Send reset code"}
            onPress={handleSendCode}
            disabled={isPending || phone.trim().length !== 9}
          />

          <GhostButton
            label="Back to Sign In"
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
  iconWrap: { alignItems: "center", marginBottom: 20 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
    lineHeight: 22,
    marginBottom: 28,
  },
  fieldLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 18,
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
});