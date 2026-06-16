import { Colors, Typography } from "@/theme";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FilterSlidersIcon from "../../../../assets/icons/filter-sliders.svg";
import { useMyOrders } from "../../../hooks/rider/useOrders";
import { Order } from "../../../lib/api";

function groupOrdersByMonth(
  orders: Order[],
): { title: string; data: Order[] }[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const d = new Date(order.created_at);
    const label = d.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(order);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function formatOrderDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown date";
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    assigned:   "Assigned",
    accepted:   "Accepted",
    arrived:    "Arrived",
    collected:  "Collected",
    in_transit: "In Transit",
  };
  return map[status] ?? status;
}

function EmptyState({ tab }: { tab: "Past" | "Upcoming" }) {
  const isPast = tab === "Past";
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconCircle}>
        <Text style={emptyStyles.icon}>{isPast ? "🛵" : "📦"}</Text>
      </View>
      <Text style={emptyStyles.title}>
        {isPast ? "No deliveries yet" : "Nothing scheduled"}
      </Text>
      <Text style={emptyStyles.subtitle}>
        {isPast
          ? "Your completed and cancelled deliveries will appear here once you start riding."
          : "You have no upcoming deliveries right now.\nStay online to receive new orders."}
      </Text>
    </View>
  );
}

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<"Past" | "Upcoming">("Past");
  const navigation = useNavigation<any>();
  const { data: rawOrders, isLoading, isError, refetch } = useMyOrders();

  const orders = Array.isArray(rawOrders) ? rawOrders : [];

  // "Past" tab — orders that have reached a terminal state
  const pastOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );

  // "Upcoming" tab — orders still in progress
  const activeOrders = orders.filter(
    (o) =>
      o.status === "assigned"   ||
      o.status === "accepted"   ||
      o.status === "arrived"    ||
      o.status === "collected"  ||
      o.status === "in_transit",
  );

  const sections = groupOrdersByMonth(
    activeTab === "Past" ? pastOrders : activeOrders,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <Text style={styles.heading}>Activities</Text>

      <View style={styles.tabRow}>
        <View style={styles.tabsLeft}>
          {(["Past", "Upcoming"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={() => refetch()}>
          <FilterSlidersIcon width={22} height={20} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.navy} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <View style={emptyStyles.iconCircle}>
            <Text style={emptyStyles.icon}>⚠️</Text>
          </View>
          <Text style={emptyStyles.title}>Something went wrong</Text>
          <Text style={emptyStyles.subtitle}>
            We couldn't load your orders. Check your connection and try again.
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate("ActivityDetail", {
                  // ─── IDs & status ───────────────────────────────
                  activityId:      item.id,
                  status:          item.status === "delivered"
                                     ? "completed"
                                     : item.status === "cancelled"
                                     ? "cancelled"
                                     : "active",

                  // ─── Addresses ──────────────────────────────────
                  destination:     item.dropoff_address,
                  pickupAddress:   item.pickup_address,

                  // ─── Date & amount ──────────────────────────────
                  date:            formatOrderDate(item.created_at),
                  amount:          parseFloat(item.price_ghs ?? "0"),  // ← was item.price (undefined)

                  // ─── Customer (nested object in API response) ───
                  customerName:    item.customer?.full_name  ?? "Customer",
                  customerPhone:   item.customer?.phone      ?? "—",

                  // ─── Order details ──────────────────────────────
                  itemDescription: item.item_description     ?? "—",   // ← was item.item_type (undefined)
                  paymentMethod:   item.payment_method       ?? "—",
                  vehicleType:     item.vehicle_type         ?? "—",

                  // ─── Optional — null when API hasn't set them ───
                  distanceKm:      item.distance_km          ?? null,
                  durationMins:    item.estimated_duration_mins ?? null,
                  proofPhotoUrl:   item.proof_of_delivery_url  ?? null,
                })
              }
              activeOpacity={0.75}
            >
              <Text style={styles.bicycleEmoji}>🚲</Text>
              <View style={styles.rowText}>
                <Text style={styles.destination}>{item.dropoff_address}</Text>
                <Text style={styles.dateTime}>
                  {formatOrderDate(item.created_at)}
                </Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  item.status === "cancelled" && { color: Colors.errorRed },
                  item.status !== "delivered" &&
                    item.status !== "cancelled" && { color: Colors.navy },
                ]}
              >
                {item.status === "cancelled"
                  ? "Cancelled"
                  : item.status === "delivered"
                  ? `GHS ${parseFloat(item.price_ghs ?? "0").toFixed(2)}`
                  : statusLabel(item.status)}
              </Text>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionLine} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 16 }}
          ListEmptyComponent={<EmptyState tab={activeTab} />}
        />
      )}
    </SafeAreaView>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 36,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 44 },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    textAlign: "center",
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  tabsLeft: { flexDirection: "row", gap: 20 },
  tab: {
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.navy },
  tabText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  tabTextActive: { color: Colors.navy },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flexShrink: 0,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  bicycleEmoji: { fontSize: 32, width: 52, textAlign: "center" },
  rowText: { flex: 1 },
  destination: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dateTime: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textGreen,
  },
  rowDivider: { height: 1, backgroundColor: Colors.divider },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  retryBtn: {
    marginTop: 20,
    backgroundColor: Colors.navy,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  retryText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});