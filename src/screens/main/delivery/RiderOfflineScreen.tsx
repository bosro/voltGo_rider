import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { GhostButton } from "../../../components/common";
import { Colors, Typography, Radius } from "../../../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToggleStatus } from "@/hooks/rider/useRider";

const { height } = Dimensions.get("window");

const TODAY_EARNINGS = { deliveries: 4, amount: 88 };

export default function RiderOfflineScreen() {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { mutateAsync: toggleStatus, isPending } = useToggleStatus();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
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

  const handleGoOnline = async () => {
    try {
      await toggleStatus(true);
    } catch {
      // best-effort; store/socket will reconcile
    }
    navigation.goBack();
  };
  const handleStayOffline = () => navigation.navigate("MainTabs");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Moon icon — drop moon.png into assets/images/ */}
        <Image
          source={require("../../../../assets/images/moon.png")}
          style={styles.icon}
          resizeMode="contain"
        />

        <Text style={styles.heading}>You're Offline</Text>
        <Text style={styles.subheading}>
          You won't receive new delivery{"\n"}orders while you're offline.
        </Text>

        {/* Today's earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsValue}>
                {TODAY_EARNINGS.deliveries}
              </Text>
              <Text style={styles.earningsLabel}>Deliveries today</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsValue}>
                GHS {TODAY_EARNINGS.amount}
              </Text>
              <Text style={styles.earningsLabel}>Earned today</Text>
            </View>
          </View>
        </View>

        {/* Status pill */}
        <View style={styles.statusPill}>
          <View style={styles.offlineDot} />
          <Text style={styles.statusText}>Offline</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.goOnlineBtn, isPending && { opacity: 0.7 }]}
          onPress={handleGoOnline}
          activeOpacity={0.88}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.goOnlineText}>Go back online</Text>
          )}
        </TouchableOpacity>
        <GhostButton
          label="Stay offline"
          onPress={handleStayOffline}
          style={{ marginTop: 10 }}
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
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  icon: { width: 80, height: 80, marginBottom: 24 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 28,
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
    marginBottom: 32,
  },
  earningsCard: {
    width: "100%",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 24,
  },
  earningsRow: { flexDirection: "row", alignItems: "center" },
  earningsStat: { flex: 1, alignItems: "center" },
  earningsValue: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xxl,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  earningsLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  earningsDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  statusText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  goOnlineBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  goOnlineText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.lg,
    color: Colors.textPrimary,
  },
});


