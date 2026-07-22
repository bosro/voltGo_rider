/**
 * BiometricSetupScreen.tsx
 *
 * Shown after:
 *  - New KYC registration (after CreateProfileStep4)
 *  - From Security settings screen
 *
 * Flow:
 *  "Use Biometric" → check hardware → prompt auth → save flag → NotificationPermission
 *  "Remind me later" → skip → NotificationPermission (or back if from Settings)
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GhostButton, NavyButton } from "../../components/common";
import { Colors, Typography, Radius } from "../../theme";
import ConfirmModal from "../../components/common/ConfirmModal"; // ← adjust path

import FaceIdIcon from "../../../assets/icons/face-id.svg";
import FingerprintIcon from "../../../assets/icons/fingerprint.svg";

const { height } = Dimensions.get("window");
export const BIOMETRIC_KEY = "@voltgo_biometric_enabled";

type ModalConfig = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  danger?: boolean;
};

const HIDDEN_MODAL: ModalConfig = {
  visible: false,
  title: "",
  message: "",
  primaryLabel: "OK",
  onPrimary: () => {},
};

export default function BiometricSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromSettings = route.params?.fromSettings ?? false;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // Single modal state drives all four Alert.alert() replacements
  const [modal, setModal] = useState<ModalConfig>(HIDDEN_MODAL);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const proceed = () => {
    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.replace("NotificationPermission");
    }
  };

  const showModal = (config: Omit<ModalConfig, "visible">) =>
    setModal({ visible: true, ...config });

  const hideModal = () => setModal(HIDDEN_MODAL);

  const handleUseBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // ← ConfirmModal: device limitation the user must read before proceeding
        showModal({
          title: "Not Supported",
          message: "Your device does not support biometric authentication.",
          primaryLabel: "Continue",
          onPrimary: () => { hideModal(); proceed(); },
        });
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        // ← ConfirmModal: actionable instruction (go to Settings) before proceeding
        showModal({
          title: "No Biometrics Set Up",
          message:
            "Please set up Face ID or Touch ID in your device Settings first.",
          primaryLabel: "Got it",
          onPrimary: () => { hideModal(); proceed(); },
        });
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric sign-in for VoltGo",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, "true");
        // ← ConfirmModal: positive confirmation — rider taps "Continue" to advance
        showModal({
          title: "Biometric Enabled ✓",
          message:
            "You'll be signed in automatically next time you open the app.",
          primaryLabel: "Continue",
          onPrimary: () => { hideModal(); proceed(); },
        });
      } else if (result.error === "user_cancel") {
        // Rider cancelled the system prompt — stay on screen, no modal needed
      } else {
        // ← ConfirmModal: auth failure needs explanation before the rider moves on
        showModal({
          title: "Authentication Failed",
          message:
            "Biometric sign-in could not be set up. You can try again in Settings.",
          primaryLabel: "OK",
          onPrimary: () => { hideModal(); proceed(); },
          danger: true,
        });
      }
    } catch (error) {
      console.warn("Biometric error:", error);
      proceed();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
    proceed();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* ── Biometric result modal ────────────────────────────────── */}
      <ConfirmModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        primaryLabel={modal.primaryLabel}
        onPrimary={modal.onPrimary}
        danger={modal.danger}
      />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.faceIdCard}>
            <FaceIdIcon width={88} height={88} />
          </View>
          <View style={styles.fingerprintCard}>
            <FingerprintIcon width={88} height={88} />
          </View>
        </Animated.View>

        <Text style={styles.heading}>Make Sign-in Easier</Text>
        <Text style={styles.body}>
          Use your device's biometric to sign in{"\n"}
          next time you open the VoltGo app.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <NavyButton
          label="Use Biometric"
          onPress={handleUseBiometric}
          style={styles.btn}
        />
        <GhostButton
          label={fromSettings ? "Disable & go back" : "Remind me later"}
          onPress={handleSkip}
          style={[styles.btn, { marginTop: 10 }]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: height * 0.1,
    paddingHorizontal: 28,
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    height: 100,
    width: 160,
    position: "relative",
  },
  faceIdCard: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  fingerprintCard: {
    position: "absolute",
    right: 0,
    zIndex: 2,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 23,
  },
  footer: { paddingHorizontal: 22, paddingBottom: 32 },
  btn: { marginHorizontal: 0 },
});