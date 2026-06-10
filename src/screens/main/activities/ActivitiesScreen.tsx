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

/** Group orders by month label for SectionList */
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
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<"Past" | "Upcoming">("Past");
  const navigation = useNavigation<any>();
  const { data: orders = [], isLoading, isError, refetch } = useMyOrders();

  const completedOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );
  const sections = groupOrdersByMonth(completedOrders);

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
          <Text style={styles.emptyText}>Failed to load orders.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text
              style={{ color: Colors.navy, fontFamily: "Poppins-SemiBold" }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={activeTab === "Past" ? sections : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate("ActivityDetail", {
                  activityId: item.id,
                  destination: item.dropoff_address,
                  date: formatOrderDate(item.created_at),
                  amount: item.price,
                  status:
                    item.status === "delivered" ? "completed" : "cancelled",
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
                ]}
              >
                {item.status === "cancelled"
                  ? "Cancelled"
                  : `GHS ${item.price.toFixed(2)}`}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === "Upcoming"
                  ? "No upcoming deliveries"
                  : "No past deliveries yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

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
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
});
