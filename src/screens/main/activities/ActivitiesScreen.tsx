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
import { Order, ordersApi } from "../../../lib/api";
import { useRiderStore } from "@/store/riderStore";
import FilterBottomSheet, {
  RiderFilterState,
} from "@/components/common/FilterBottomSheet";
import { useQueries } from "@tanstack/react-query";

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
    assigned: "Assigned",
    accepted: "Accepted",
    arrived: "Arrived",
    collected: "Collected",
    in_transit: "In Transit",
  };
  return map[status] ?? status;
}

function EmptyState({ tab }: { tab: "Past" | "Active" }) {
  const isPast = tab === "Past";
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconCircle}>
        <Text style={emptyStyles.icon}>{isPast ? "🛵" : "📦"}</Text>
      </View>
      <Text style={emptyStyles.title}>
        {isPast ? "No deliveries yet" : "No active orders"}
      </Text>
      <Text style={emptyStyles.subtitle}>
        {isPast
          ? "Your completed and cancelled deliveries will appear here."
          : "You have no ongoing deliveries right now.\nStay online to receive new orders."}
      </Text>
    </View>
  );
}

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<"Past" | "Active">("Past");
  const navigation = useNavigation<any>();

  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<RiderFilterState>({
    months: [],
    statuses: [],
  });

  const hasActiveFilters =
    filters.months.length > 0 || filters.statuses.length > 0;

  // ── Base query — no status filter active ──────────────────────────────────
  const baseQuery = useMyOrders({ limit: 100 });

  // ── Per-status queries — only fire when statuses are selected ─────────────
  const statusQueries = useQueries({
    queries: filters.statuses.map((status) => ({
      queryKey: ["rider", "orders", "my", status],
      queryFn: async () => {
        const res = await ordersApi.getMyOrders({ limit: 100, status });
        const raw = res.data?.data as any;
        if (raw && Array.isArray(raw.items)) return raw.items as Order[];
        if (Array.isArray(raw)) return raw as Order[];
        return [] as Order[];
      },
      enabled: filters.statuses.length > 0,
      staleTime: 2 * 60 * 1_000,
    })),
  });

  // ── Merge results ─────────────────────────────────────────────────────────
  const orders: Order[] =
    filters.statuses.length > 0
      ? statusQueries.flatMap((q) => (q.data ?? []) as Order[])
      : (baseQuery.data ?? []);

  const isLoading =
    filters.statuses.length > 0
      ? statusQueries.some((q) => q.isLoading)
      : baseQuery.isLoading;

  const isError =
    filters.statuses.length > 0
      ? statusQueries.some((q) => q.isError)
      : baseQuery.isError;

  const refetch = () => {
    if (filters.statuses.length > 0) {
      statusQueries.forEach((q) => q.refetch());
    } else {
      baseQuery.refetch();
    }
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pastOrders = orders.filter(
    (o) =>
      o.status === "delivered" ||
      o.status === "cancelled" ||
      o.status === "failed",
  );

  const activeOrders = orders.filter(
    (o) =>
      o.status === "assigned" ||
      o.status === "accepted" ||
      o.status === "arrived" ||
      o.status === "rider_arriving" ||
      o.status === "collected" ||
      o.status === "in_transit" ||
      o.status === "searching" ||
      o.status === "pending",
  );

  const availableMonths = [
    ...new Set(
      pastOrders.map((o) => {
        const d = new Date(o.created_at);
        return d.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });
      }),
    ),
  ];

  // Month filter is client-side only — status already filtered by backend
  const filteredPastOrders = pastOrders.filter((o) => {
    const d = new Date(o.created_at);
    const month = d.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    return filters.months.length === 0 || filters.months.includes(month);
  });

  const sections = groupOrdersByMonth(
    activeTab === "Past" ? filteredPastOrders : activeOrders,
  );

  const handleOrderPress = async (item: Order) => {
    const isActive = !["delivered", "cancelled", "failed"].includes(
      item.status,
    );

    if (!isActive) {
      navigation.navigate("ActivityDetail", {
        activityId: item.id,
        status:
          item.status === "delivered"
            ? "completed"
            : item.status === "cancelled" || item.status === "failed"
              ? "cancelled"
              : "active",
        destination: item.dropoff_address,
        pickupAddress: item.pickup_address,
        date: formatOrderDate(item.created_at),
        amount: parseFloat(item.price_ghs ?? "0"),
        customerName: item.customer?.full_name ?? "Customer",
        customerPhone: item.customer?.phone ?? "—",
        itemDescription: item.item_description ?? "—",
        paymentMethod: item.payment_method ?? "—",
        vehicleType: item.vehicle_type ?? "—",
        distanceKm: item.distance_km ?? null,
        durationMins: item.estimated_duration_mins ?? null,
        proofPhotoUrl: item.proof_of_delivery_url ?? null,
      });
      return;
    }

    // Active order — show loading, fetch fresh data, navigate to ActiveDelivery
    setResumingOrderId(item.id);
    try {
      const res = await ordersApi.getActiveOrder();
      const freshOrder = res.data?.data ?? item;
      useRiderStore.getState().setActiveOrder(freshOrder);

      const pickupCoords = {
        latitude: parseFloat(String(freshOrder.pickup_lat)),
        longitude: parseFloat(String(freshOrder.pickup_lng)),
      };
      const dropoffCoords = {
        latitude: parseFloat(String(freshOrder.dropoff_lat)),
        longitude: parseFloat(String(freshOrder.dropoff_lng)),
      };

      navigation.navigate("ActiveDelivery", {
        orderId: freshOrder.id,
        customerName: freshOrder.customer?.full_name ?? "",
        customerPhone: freshOrder.customer?.phone ?? "",
        pickupAddress: freshOrder.pickup_address,
        dropoffAddress: freshOrder.dropoff_address,
        itemType: freshOrder.item_description ?? "Parcel",
        price: parseFloat(String(freshOrder.price_ghs ?? "0")),
        pickupCoords,
        dropoffCoords,
      });
    } catch {
      // Fallback to list data if the fetch fails
      navigation.navigate("ActiveDelivery", {
        orderId: item.id,
        customerName: item.customer?.full_name ?? "",
        customerPhone: item.customer?.phone ?? "",
        pickupAddress: item.pickup_address,
        dropoffAddress: item.dropoff_address,
        itemType: item.item_description ?? "Parcel",
        price: parseFloat(String(item.price_ghs ?? "0")),
        pickupCoords: {
          latitude: parseFloat(String(item.pickup_lat)),
          longitude: parseFloat(String(item.pickup_lng)),
        },
        dropoffCoords: {
          latitude: parseFloat(String(item.dropoff_lat)),
          longitude: parseFloat(String(item.dropoff_lng)),
        },
      });
    } finally {
      setResumingOrderId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <Text style={styles.heading}>Activities</Text>

      <View style={styles.tabRow}>
        <View style={styles.tabsLeft}>
          {(["Past", "Active"] as const).map((tab) => (
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
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={
            activeTab === "Past"
              ? () => setFilterVisible(true)
              : () => refetch()
          }
          style={[
            styles.filterIconBtn,
            activeTab === "Past" &&
              hasActiveFilters &&
              styles.filterIconBtnActive,
          ]}
        >
          <FilterSlidersIcon
            width={22}
            height={20}
            color={
              activeTab === "Past" && hasActiveFilters
                ? Colors.white
                : Colors.textPrimary
            }
          />
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
              onPress={() => handleOrderPress(item)} // ← replace the existing onPress
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
                  (item.status === "cancelled" || item.status === "failed") && {
                    color: Colors.errorRed,
                  },
                  item.status === "delivered" && { color: Colors.textGreen },
                  !["delivered", "cancelled", "failed"].includes(
                    item.status,
                  ) && {
                    color: Colors.navy,
                  },
                ]}
              >
                {resumingOrderId === item.id
                  ? "Loading..."
                  : item.status === "cancelled"
                    ? "Cancelled"
                    : item.status === "failed"
                      ? "Failed"
                      : item.status === "delivered"
                        ? `GHS ${parseFloat(item.price_ghs ?? "0").toFixed(2)}`
                        : statusLabel(item.status) + " →"}
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

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        current={filters}
        availableMonths={availableMonths}
      />
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
  filterIconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  filterIconBtnActive: {
    backgroundColor: Colors.navy,
  },
});
