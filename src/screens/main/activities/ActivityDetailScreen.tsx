import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Platform,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Colors, Typography, Radius } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Param types ───────────────────────────────────────────────────
type ActivityDetailParams = {
  ActivityDetail: {
    activityId: string;
    destination: string;
    pickupAddress?: string;
    date: string;
    amount: number;
    status: "completed" | "cancelled" | "active";
    customerName?: string;
    customerPhone?: string;
    itemDescription?: string;
    paymentMethod?: string;
    vehicleType?: string;
    distanceKm?: number | null;
    durationMins?: number | null;
    proofPhotoUrl?: string | null;
    // true when navigating from DeliveryCompleted — back should go home
    fromCompletion?: boolean;
  };
};

// ── Helpers ───────────────────────────────────────────────────────
function formatPayment(method: string): string {
  const map: Record<string, string> = {
    bundle_credit: "Bundle Credits",
    bundle:        "Bundle Credits",
    momo:          "Mobile Money",
    card:          "Card",
    cash:          "Cash",
  };
  return map[method] ?? (method ? method.charAt(0).toUpperCase() + method.slice(1) : "—");
}

function formatVehicle(v: string): string {
  const map: Record<string, string> = {
    motorcycle:    "Motorcycle",
    bicycle:       "Bicycle",
    "e-motorcycle":"E-Moto",
    car:           "Car",
    walking:       "Walking",
  };
  return map[v] ?? (v || "—");
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
    fromCompletion,
  } = route.params ?? ({} as any);

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  const shortId = activityId
    ? `#${activityId.slice(-8).toUpperCase()}`
    : "—";

  // Back button: if we came from DeliveryCompleted (or there's nothing to go
  // back to), reset to Activities tab. Otherwise just go back.
  const handleBack = () => {
    if (fromCompletion || navigation.getState()?.routes?.length <= 1) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "Activities" } }],
      });
    } else {
      navigation.navigate("MainTabs", { screen: "Activities" });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require("../../../../assets/icons/back-arrow.png")}
            style={styles.backArrow}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status badge ─────────────────────────────────────── */}
        <View
          style={[
            styles.statusBadge,
            isCompleted ? styles.badgeCompleted :
            isCancelled ? styles.badgeCancelled :
            styles.badgeActive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isCompleted ? "#1A8A3C" :
                                  isCancelled ? "#EF4444" :
                                  "#1D4ED8",
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isCompleted ? "#1A8A3C" :
                        isCancelled ? "#EF4444" :
                        "#1D4ED8",
              },
            ]}
          >
            {isCompleted ? "Completed" : isCancelled ? "Cancelled" : "Active"}
          </Text>
        </View>

        {/* ── Earnings hero (completed only) ───────────────────── */}
        {isCompleted && (
          <View style={styles.amountHero}>
            <Text style={styles.amountValue}>
              GHS {(amount ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.amountDate}>{date ?? "—"}</Text>
          </View>
        )}

        {/* Cancelled / active — just show date + order ID */}
        {!isCompleted && (
          <View style={styles.amountHero}>
            <Text style={[styles.amountValue, { fontSize: 22, color: Colors.textSecondary }]}>
              {shortId}
            </Text>
            <Text style={styles.amountDate}>{date ?? "—"}</Text>
          </View>
        )}

        {/* ── Vehicle chip + short ID ───────────────────────────── */}
        <View style={styles.metaRow}>
          {vehicleType ? (
            <View style={styles.vehicleChip}>
              <Image
                source={
                  vehicleType === "bicycle"
                    ? require("../../../../assets/images/bicycle_small.png")
                    : require("../../../../assets/images/emoto_small.png")
                }
                style={styles.vehicleImg}
                resizeMode="contain"
              />
              <Text style={styles.vehicleLabel}>{formatVehicle(vehicleType)}</Text>
            </View>
          ) : <View />}
          {isCompleted && (
            <Text style={styles.deliveryId}>{shortId}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Route ─────────────────────────────────────────────── */}
        <SectionLabel label="Route" />
        <View style={styles.routeCard}>
          {/* Pickup */}
          <View style={styles.routeRow}>
            <View style={styles.routeDotWrap}>
              <View style={styles.routeDotGreen} />
            </View>
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeValue}>{pickupAddress || "—"}</Text>
            </View>
          </View>

          {/* Dashed connector */}
          <View style={styles.routeConnector}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.dashSegment} />
            ))}
          </View>

          {/* Dropoff */}
          <View style={styles.routeRow}>
            <View style={styles.routeDotWrap}>
              <Image
                source={require("../../../../assets/icons/pin-dropoff.png")}
                style={{ width: 18, height: 22 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Drop-off</Text>
              <Text style={styles.routeValue}>{destination || "—"}</Text>
            </View>
          </View>

          {/* Distance / duration pills */}
          {(distanceKm != null || durationMins != null) && (
            <View style={styles.statsPill}>
              {distanceKm != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{distanceKm.toFixed(1)} km</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
              )}
              {distanceKm != null && durationMins != null && (
                <View style={styles.statDivider} />
              )}
              {durationMins != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{durationMins} min</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Package ───────────────────────────────────────────── */}
        <View style={styles.sectionGap} />
        <SectionLabel label="Package" />
        <View style={styles.detailCard}>
          <DetailRow label="Item"        value={itemDescription || "Parcel"} />
          <DetailRow label="Customer"    value={customerName    || "—"} />
          <DetailRow label="Phone"       value={customerPhone   || "—"} last />
        </View>

        {/* ── Payment ───────────────────────────────────────────── */}
        <View style={styles.sectionGap} />
        <SectionLabel label="Payment" />
        <View style={styles.paymentRow}>
          <View style={styles.paymentIconCircle}>
            <Text style={{ fontSize: 20 }}>💳</Text>
          </View>
          <Text style={styles.paymentLabel}>
            {formatPayment(paymentMethod || "")}
          </Text>
          {isCompleted && (
            <Text style={styles.paymentAmount}>
              GHS {(amount ?? 0).toFixed(2)}
            </Text>
          )}
        </View>

        {/* ── Proof of delivery ─────────────────────────────────── */}
        {!!proofPhotoUrl && (
          <>
            <View style={styles.sectionGap} />
            <SectionLabel label="Proof of Delivery" />
            <Image
              source={{ uri: proofPhotoUrl }}
              style={styles.proofPhoto}
              resizeMode="cover"
            />
          </>
        )}

        <View style={{ height: 48 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.text}>{label}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[detailStyles.row, !last && detailStyles.rowBorder]}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const sectionStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  text: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 15,
    color: Colors.navy,
    flexShrink: 0,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.divider },
});

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  label: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  value: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 14,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { width: 20, height: 18 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 19,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeCompleted: { backgroundColor: "#EDFBF1" },
  badgeCancelled: { backgroundColor: "#FEF2F2" },
  badgeActive:    { backgroundColor: "#DBEAFE" },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: "Poppins-SemiBold", fontSize: 13 },

  // Amount hero
  amountHero:  { marginBottom: 16 },
  amountValue: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 38,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  amountDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Meta row (vehicle chip + ID)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  vehicleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#EEEEEE",
  },
  vehicleImg:   { width: 36, height: 28 },
  vehicleLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  deliveryId: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },

  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 24 },

  // Route card
  routeCard: { paddingHorizontal: 4, paddingVertical: 4 },
  routeRow:  { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  routeDotWrap: { width: 20, alignItems: "center", paddingTop: 3 },
  routeDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary ?? "#4CD964",
  },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  routeValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  routeConnector: { paddingLeft: 9, marginVertical: 6, gap: 3 },
  dashSegment: {
    width: 1.5,
    height: 5,
    backgroundColor: "#C8D0DC",
    marginVertical: 1.5,
  },

  // Distance / duration stats
  statsPill: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statValue:   {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  statLabel:   {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: Colors.divider },

  // Detail card
  detailCard: { paddingHorizontal: 4 },

  sectionGap: { height: 24 },

  // Payment row
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 14,
  },
  paymentIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLabel: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  paymentAmount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },

  // Proof photo
  proofPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginTop: 4,
  },
});