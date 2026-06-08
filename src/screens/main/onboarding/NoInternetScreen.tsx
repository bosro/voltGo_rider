/**
 * NoInternetScreen.tsx
 * Shown when network connectivity is lost.
 *
 * Usage — wrap your RootNavigator in App.tsx with a connectivity check:
 *
 *   import NetInfo from '@react-native-community/netinfo';
 *   // npx expo install @react-native-community/netinfo
 *
 *   const [isConnected, setIsConnected] = useState<boolean | null>(true);
 *   useEffect(() => {
 *     const unsub = NetInfo.addEventListener(state => setIsConnected(state.isConnected));
 *     return unsub;
 *   }, []);
 *
 *   if (isConnected === false) return <NoInternetScreen />;
 *
 * This screen is used standalone (not navigated to) — import and conditionally render it.
 *
 * SVGs needed: no_wifi.svg
 */
import { Colors, Radius, Typography } from "@/theme";
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  TouchableOpacity,
} from "react-native";
import { SvgXml } from "react-native-svg";

const noWifiSvg = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#F5F5F5"/>
  <path d="M20 35C28.5 27 39.7 22 50 22C60.3 22 71.5 27 80 35" stroke="#D0D6E0" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M29 45C35 39.5 42.2 36.5 50 36.5C57.8 36.5 65 39.5 71 45" stroke="#D0D6E0" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M38 55C41.8 51.5 45.7 50 50 50C54.3 50 58.2 51.5 62 55" stroke="#D0D6E0" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="50" cy="66" r="5" fill="#D0D6E0"/>
  <!-- Red X slash -->
  <line x1="15" y1="15" x2="85" y2="85" stroke="#E53E3E" stroke-width="5" stroke-linecap="round"/>
</svg>`;

interface Props {
  onRetry?: () => void;
}

export default function NoInternetScreen({ onRetry }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Gentle floating animation on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <SvgXml
            xml={noWifiSvg}
            width={100}
            height={100}
            style={styles.icon}
          />
        </Animated.View>

        <Text style={styles.heading}>No Internet Connection</Text>
        <Text style={styles.subheading}>
          Please check your Wi-Fi or mobile data{"\n"}and try again.
        </Text>

        {onRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Your earnings and completed deliveries{"\n"}are saved and will sync
          when you're back online.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  icon: { marginBottom: 28 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  subheading: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  retryBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  retryText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  hint: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
