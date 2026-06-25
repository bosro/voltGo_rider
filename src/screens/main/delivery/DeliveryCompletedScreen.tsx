/**
 * DeliveryCompletedScreen.tsx — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Standalone success screen shown after a rider submits proof of
 * delivery. Previously this file was a duplicate of ActivityDetailScreen
 * — this is a clean rebuild with its own purpose-built UI.
 *
 * Receives the FULL order object forwarded by SubmitPhotoScreen
 * (see useMarkDelivered's mutation response) so "View delivery details"
 * can pass complete data into ActivityDetail — no more blank fields.
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatarIcon from "../../../../assets/icons/user-avatar.svg";
import { MainStackParamList } from "@/navigation/types";
import { Colors, Typography, Radius } from "@/theme";
import Svg, { Path } from "react-native-svg";

type RouteParams = RouteProp<MainStackParamList, "DeliveryCompleted">;

function formatPayment(method?: string): string {
  const map: Record<string, string> = {
    bundle_credit: "Bundle Credits",
    bundle: "Bundle Credits",
    momo: "Mobile Money",
    card: "Card",
    cash: "Cash",
  };
  return (
    map[method ?? ""] ??
    (method ? method.charAt(0).toUpperCase() + method.slice(1) : "—")
  );
}

export default function DeliveryCompletedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();

  const {
    orderId,
    amount = 0,
    pickupAddress = "",
    dropoffAddress = "",
    itemType = "Parcel",
    // Full-order fields forwarded by the SubmitPhotoScreen fix —
    // these come straight from the markDelivered mutation response.
    customerName,
    customerPhone,
    vehicleType,
    paymentMethod,
    distanceKm,
    durationMins,
    proofPhotoUrl,
  } = (route.params ?? {}) as any;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Forward the FULL order — not a 5-field subset — into ActivityDetail.
  // This is the fix for the "blank fields on this navigation path" bug:
  // every field ActivityDetailScreen destructures is supplied here.
  const handleViewDetails = () => {
    navigation.replace("ActivityDetail", {
      activityId: orderId,
      destination: dropoffAddress,
      pickupAddress,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount,
      status: "completed",
      customerName,
      customerPhone,
      itemDescription: itemType,
      paymentMethod,
      vehicleType,
      distanceKm,
      durationMins,
      proofPhotoUrl,
      fromCompletion: true,
    });
  };

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeIn, transform: [{ scale: scaleIn }] },
        ]}
      >
        <View style={styles.successCircle}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17L4 12"
              stroke="#1A8A3C"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.heading}>Delivered!</Text>
        <Text style={styles.subheading}>
          Proof of delivery has been{"\n"}submitted for {itemType.toLowerCase()}
          .
        </Text>

        {!!customerName && (
          <View style={styles.customerCard}>
            <View style={styles.avatarCircle}>
              <UserAvatarIcon width={22} height={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerSub}>
                {customerPhone || "Customer"}
              </Text>
            </View>
            <Text style={styles.amount}>GHS {Number(amount).toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text style={styles.metaValue}>{formatPayment(paymentMethod)}</Text>
          </View>
          {distanceKm != null && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Distance</Text>
              <Text style={styles.metaValue}>
                {Number(distanceKm).toFixed(1)} km
              </Text>
            </View>
          )}
        </View>

        {!!proofPhotoUrl && (
          <View style={styles.proofWrap}>
            <Text style={styles.proofLabel}>Proof of delivery</Text>
            <Image
              source={{ uri: proofPhotoUrl }}
              style={styles.proofPhoto}
              resizeMode="cover"
            />
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeIn }]}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={handleViewDetails}
          activeOpacity={0.85}
        >
          <Text style={styles.detailsBtnText}>View delivery details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 24 : 16,
  },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#EDFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  checkmarkWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkStem: {
    position: "absolute",
    width: 4,
    height: 16,
    backgroundColor: "#1A8A3C",
    borderRadius: 2,
    transform: [{ rotate: "45deg" }, { translateX: 4 }, { translateY: 2 }],
  },
  checkmarkKick: {
    position: "absolute",
    width: 4,
    height: 26,
    backgroundColor: "#1A8A3C",
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }, { translateX: -1 }, { translateY: -4 }],
  },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  customerCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  customerSub: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  metaRow: { flexDirection: "row", width: "100%", gap: 12, marginBottom: 18 },
  metaItem: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metaLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  proofWrap: { width: "100%", marginBottom: 8 },
  proofLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  proofPhoto: { width: "100%", height: 140, borderRadius: Radius.lg },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    paddingTop: 10,
    gap: 10,
  },
  detailsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  detailsBtnText: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  doneBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  doneBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});




