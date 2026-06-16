import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Colors, Typography, Radius, Shadow } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";
 
// ── Param types ───────────────────────────────────────────────────
type ActivityDetailParams = {
  ActivityDetail: {
    activityId: string;
    destination: string;
    pickupAddress: string;
    date: string;
    amount: number;
    status: "completed" | "cancelled";
    customerName: string;
    customerPhone: string;
    itemDescription: string;
    paymentMethod: string;
    vehicleType: string;
    distanceKm: number | null;
    durationMins: number | null;
    proofPhotoUrl: string | null;
  };
};
 
// ── Helpers ───────────────────────────────────────────────────────
function formatPayment(method: string): string {
  const map: Record<string, string> = {
    bundle: "Bundle credits",
    momo:   "Mobile Money",
    card:   "Card",
    cash:   "Cash",
  };
  return map[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
}
 
function formatVehicle(v: string): string {
  const map: Record<string, string> = {
    motorcycle: "Motorcycle",
    bicycle:    "Bicycle",
    car:        "Car",
    walking:    "Walking",
  };
  return map[v] ?? v;
}
 
// ── Screen ────────────────────────────────────────────────────────
export default function ActivityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ActivityDetailParams, "ActivityDetail">>();
 
  const {
    activityId,
    destination,
    pickupAddress,
    date,
    amount,
    status,
    customerName,
    customerPhone,
    itemDescription,
    paymentMethod,
    vehicleType,
    distanceKm,
    durationMins,
    proofPhotoUrl,
  } = route.params ?? ({} as any);
 
  const isCompleted = status === "completed";
 
  const shortId = activityId
    ? `#ORD-${activityId.slice(0, 8).toUpperCase()}`
    : "—";
 
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
 
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require("../../../../assets/icons/back-arrow.png")}
            style={styles.backArrow}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: 24 }} />
      </View>
 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            isCompleted ? styles.statusCompleted : styles.statusCancelled,
          ]}
        >
          <Image
            source={
              isCompleted
                ? require("../../../../assets/icons/check-badge.png")
                : require("../../../../assets/icons/cancel-badge.png")
            }
            style={styles.badgeIcon}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.statusText,
              isCompleted ? styles.statusTextCompleted : styles.statusTextCancelled,
            ]}
          >
            {isCompleted ? "Completed" : "Cancelled"}
          </Text>
        </View>
 
        {/* Map preview */}
        <View style={styles.mapPreview}>
          <Image
            source={require("../../../../assets/images/map-bg.png")}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <Text style={styles.mapHint}>
            {pickupAddress ?? "—"} → {destination ?? "—"}
          </Text>
        </View>
 
        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Order Info</Text>
          <InfoRow label="Order ID"    value={shortId} />
          <InfoRow label="Customer"    value={customerName  ?? "—"} />
          <InfoRow label="Phone"       value={customerPhone ?? "—"} />
          <InfoRow label="Item"        value={itemDescription ?? "—"} />
          <InfoRow label="Vehicle"     value={formatVehicle(vehicleType ?? "")} />
          <InfoRow label="Payment"     value={formatPayment(paymentMethod ?? "")} />
          <InfoRow label="Date & time" value={date ?? "—"} />
        </View>
 
        {/* Route */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Route</Text>
 
          <View style={styles.routeRow}>
            <Image
              source={require("../../../../assets/icons/parcel.png")}
              style={styles.routeIcon}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeType}>Pick-up</Text>
              <Text style={styles.routeAddress}>{pickupAddress ?? "—"}</Text>
            </View>
          </View>
 
          <View style={styles.dashedLine}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.dashSeg} />
            ))}
          </View>
 
          <View style={styles.routeRow}>
            <Image
              source={require("../../../../assets/icons/pin-dropoff.png")}
              style={styles.routeIcon}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeType}>Drop-off</Text>
              <Text style={styles.routeAddress}>{destination ?? "—"}</Text>
            </View>
          </View>
 
          {/* Distance / duration — only shown when the API provides them */}
          {(distanceKm != null || durationMins != null) && (
            <View style={styles.routeStats}>
              {distanceKm != null && (
                <View style={styles.routeStat}>
                  <Text style={styles.routeStatValue}>
                    {distanceKm.toFixed(1)} km
                  </Text>
                  <Text style={styles.routeStatLabel}>Distance</Text>
                </View>
              )}
              {distanceKm != null && durationMins != null && (
                <View style={styles.routeStatDivider} />
              )}
              {durationMins != null && (
                <View style={styles.routeStat}>
                  <Text style={styles.routeStatValue}>{durationMins} min</Text>
                  <Text style={styles.routeStatLabel}>Duration</Text>
                </View>
              )}
            </View>
          )}
        </View>
 
        {/* Earnings — only shown for completed orders */}
        {isCompleted && (
          <View style={[styles.infoCard, styles.earningsCard]}>
            <View>
              <Text style={styles.earningsLabel}>You earned</Text>
              <Text style={styles.earningsAmount}>
                GHS {(amount ?? 0).toFixed(2)}
              </Text>
            </View>
            <Image
              source={require("../../../../assets/icons/wallet.png")}
              style={styles.walletIcon}
              resizeMode="contain"
            />
          </View>
        )}
 
        {/* Proof of delivery — only shown when the API provides a URL */}
        {!!proofPhotoUrl && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Proof of Delivery</Text>
            <Image
              source={{ uri: proofPhotoUrl }}
              style={styles.proofPhoto}
              resizeMode="cover"
            />
          </View>
        )}
 
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
 
// ── InfoRow ───────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}
 
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  label: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  value: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxWidth: "60%",
    textAlign: "right",
  },
});
 
// ── Styles (unchanged from your original) ────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  backArrow: { width: 20, height: 18 },
  headerTitle: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
 
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    marginBottom: 16,
  },
  statusCompleted: { backgroundColor: "#E8FFF2" },
  statusCancelled: { backgroundColor: "#FFF0F0" },
  badgeIcon: { width: 16, height: 16 },
  statusText: { fontFamily: "Poppins-SemiBold", fontSize: Typography.sm },
  statusTextCompleted: { color: Colors.trendUp },
  statusTextCancelled: { color: Colors.errorRed },
 
  mapPreview: {
    height: 140,
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  mapImage: { ...StyleSheet.absoluteFill },
  mapHint: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
 
  infoCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 12,
    // ...Shadow.card,
  },
  cardTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
 
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  routeIcon: { width: 22, height: 22, marginTop: 2 },
  routeType: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  routeAddress: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  dashedLine: { marginLeft: 11, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border },
  routeStats: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  routeStat: { flex: 1, alignItems: "center" },
  routeStatValue: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  routeStatLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  routeStatDivider: { width: 1, backgroundColor: Colors.divider },
 
  earningsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earningsLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  earningsAmount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 28,
    color: Colors.trendUp,
    marginTop: 2,
  },
  walletIcon: { width: 36, height: 36 },
 
  proofPhoto: {
    width: "100%",
    height: 180,
    borderRadius: Radius.md,
    marginTop: 4,
  },
});



