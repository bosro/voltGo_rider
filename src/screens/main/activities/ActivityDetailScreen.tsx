import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Colors, Typography, Radius, Shadow } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const DEMO_DETAIL = {
  orderId: "#ORD-20260520-001",
  customerName: "Cephas Ntiamoah",
  customerPhone: "0575 540 404",
  itemType: "Parcel",
  weight: "Light weight",
  pickupAddress: "American House, Haatso",
  dropoffAddress: "University of Ghana, Legon",
  distance: "6.2 km",
  duration: "18 min",
  proofPhotoUri: null as string | null,
};

export default function ActivityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    destination = "University of Ghana",
    date = "20 May . 12:34",
    amount = 24,
    status = "completed",
  } = route.params ?? {};

  const isCompleted = status === "completed";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        {/* back-arrow.png — same file used in NotificationsScreen */}
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
        {/* Status badge — check-badge.png / cancel-badge.png */}
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
              isCompleted
                ? styles.statusTextCompleted
                : styles.statusTextCancelled,
            ]}
          >
            {isCompleted ? "Completed" : "Cancelled"}
          </Text>
        </View>

        {/* Map preview placeholder */}
        <View style={styles.mapPreview}>
          {/* map-placeholder.png — optional decorative image */}
          <Image
            source={require("../../../../assets/images/map-bg.png")}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <Text style={styles.mapHint}>
            {DEMO_DETAIL.pickupAddress} → {DEMO_DETAIL.dropoffAddress}
          </Text>
        </View>

        {/* Order info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Order Info</Text>
          <InfoRow label="Order ID" value={DEMO_DETAIL.orderId} />
          <InfoRow label="Customer" value={DEMO_DETAIL.customerName} />
          <InfoRow label="Phone" value={DEMO_DETAIL.customerPhone} />
          <InfoRow label="Item type" value={DEMO_DETAIL.itemType} />
          <InfoRow label="Weight" value={DEMO_DETAIL.weight} />
          <InfoRow label="Date & time" value={date} />
        </View>

        {/* Route */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Route</Text>

          <View style={styles.routeRow}>
            {/* parcel.png reused from DeliveryCompletedScreen */}
            <Image
              source={require("../../../../assets/icons/parcel.png")}
              style={styles.routeIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.routeType}>Pick-up</Text>
              <Text style={styles.routeAddress}>
                {DEMO_DETAIL.pickupAddress}
              </Text>
            </View>
          </View>

          <View style={styles.dashedLine}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.dashSeg} />
            ))}
          </View>

          <View style={styles.routeRow}>
            {/* pin-dropoff.png reused from DeliveryCompletedScreen */}
            <Image
              source={require("../../../../assets/icons/pin-dropoff.png")}
              style={styles.routeIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.routeType}>Drop-off</Text>
              <Text style={styles.routeAddress}>
                {DEMO_DETAIL.dropoffAddress}
              </Text>
            </View>
          </View>

          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{DEMO_DETAIL.distance}</Text>
              <Text style={styles.routeStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{DEMO_DETAIL.duration}</Text>
              <Text style={styles.routeStatLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Earnings */}
        <View style={[styles.infoCard, styles.earningsCard]}>
          <View>
            <Text style={styles.earningsLabel}>You earned</Text>
            <Text style={styles.earningsAmount}>GHS {amount}.00</Text>
          </View>
          {/* wallet.png — drop into assets/icons/ */}
          <Image
            source={require("../../../../assets/icons/wallet.png")}
            style={styles.walletIcon}
            resizeMode="contain"
          />
        </View>

        {/* Proof of delivery */}
        {DEMO_DETAIL.proofPhotoUri && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Proof of Delivery</Text>
            <Image
              source={{ uri: DEMO_DETAIL.proofPhotoUri }}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
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
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 12,
    ...Shadow.card,
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
