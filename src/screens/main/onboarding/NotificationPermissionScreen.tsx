/**
 * NotificationPermissionScreen.tsx
 * Shown ONCE after BiometricSetupScreen, before entering the main app.
 *
 * Layout:
 *  - Full white screen
 *  - Bell illustration (large, centred)
 *  - "Stay in the loop" heading
 *  - Subtitle explaining what notifications are used for
 *  - 3 bullet rows: New orders, Payment received, Delivery updates
 *  - "Allow Notifications" navy button
 *  - "Not now" ghost button
 *
 * Add to RootStackParamList in types.ts:
 *   NotificationPermission: undefined;
 *
 * Add to RootNavigator AFTER BiometricSetup:
 *   <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} options={{ animation: 'fade' }} />
 *
 * In BiometricSetupScreen, change both navigation calls from:
 *   navigation.replace('MainApp')
 * to:
 *   navigation.replace('NotificationPermission')
 *
 * PNG icons:
 *   Replace the `source` values in BULLETS with your actual asset paths, e.g.:
 *   require('@/assets/icons/box.png')
 *   require('@/assets/icons/payment.png')
 *   require('@/assets/icons/bell.png')
 */
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
  ImageSourcePropType,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { SafeAreaView } from "react-native-safe-area-context";

import { SvgXml } from "react-native-svg";
import { Colors, Radius, Typography } from "@/theme";
import { GhostButton, NavyButton } from "@/components/common";

const bellIllustrationSvg = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="60" fill="#E8F4FF"/>
  <circle cx="60" cy="60" r="44" fill="#D0E8FF"/>
  <path d="M60 25C60 25 36 33 36 55V73H84V55C84 33 60 25 60 25Z" fill="#0D2240" fill-opacity="0.9"/>
  <path d="M30 73H90" stroke="#0D2240" stroke-width="4" stroke-linecap="round"/>
  <path d="M51 73C51 76.9 55.1 80 60 80C64.9 80 69 76.9 69 73" stroke="#0D2240" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="88" cy="34" r="12" fill="#E53E3E"/>
  <path d="M85 34H91M88 31V37" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const checkSvg = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="9" fill="#4CD964"/><path d="M5 9L7.5 11.5L13 6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

interface Bullet {
  icon: ImageSourcePropType;
  text: string;
}

const BULLETS: Bullet[] = [
  {
    icon: require("../../../../assets/images/box.png"),
    text: "New delivery requests near you",
  },
  {
    icon: require("../../../../assets/images/payment.png"),
    text: "Payment received confirmations",
  },
  {
    icon: require("../../../../assets/images/bell.png"),
    text: "Important order status updates",
  },
];

export default function NotificationPermissionScreen() {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 58,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAllow = async () => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        // User denied — still proceed to main app, they can flip it on
        // later from device Settings.
        Alert.alert(
          "Notifications blocked",
          "You can enable notifications later in your device Settings.",
          [{ text: "OK", onPress: () => navigation.replace("MainApp") }],
        );
        return;
      }
    } catch (e) {
      // Notification API might not be available in Expo Go — proceed anyway
    }
    navigation.replace("MainApp");
  };

  const handleSkip = () => {
    navigation.replace("MainApp");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Bell illustration */}
        <SvgXml
          xml={bellIllustrationSvg}
          width={120}
          height={120}
          style={styles.illustration}
        />

        <Text style={styles.heading}>Stay in the loop</Text>
        <Text style={styles.subheading}>
          Enable notifications so you never miss{"\n"}a delivery request or
          payment update.
        </Text>

        {/* Bullet points */}
        <View style={styles.bulletsWrap}>
          {BULLETS.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletIconWrap}>
                <Image
                  source={b.icon}
                  style={styles.bulletIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
              <SvgXml xml={checkSvg} width={18} height={18} />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <NavyButton label="Allow Notifications" onPress={handleAllow} />
        <GhostButton
          label="Not now"
          onPress={handleSkip}
          style={{ marginTop: 10 }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  illustration: { marginBottom: 28 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  subheading: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  bulletsWrap: {
    width: "100%",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  bulletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletIcon: { width: 22, height: 22 },
  bulletText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 36 },
});
