/**
 * TransactionHistoryScreen.tsx
 * Reached from: WalletScreen → "History" button
 *
 * Layout:
 *  - Back header + "History" title
 *  - Filter chips: All / Earnings / Withdrawals
 *  - Grouped list by month (same pattern as ActivitiesScreen)
 *  - Each row: type icon + description + amount (green=earning, red=withdrawal) + date
 *
 * SVGs needed: back_arrow.svg, earning_arrow.svg (green), withdrawal_arrow.svg (red)
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SectionList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SvgXml } from "react-native-svg";
import { Colors, Radius, Typography } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const earningIconSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#E8FFF2"/><path d="M12 22L18 16L22 20L26 14" stroke="#00C07F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 14H26V17" stroke="#00C07F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const withdrawIconSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#FFF0F0"/><path d="M12 14L18 20L22 16L26 22" stroke="#E53E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 22H26V19" stroke="#E53E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

type TxType = "earning" | "withdrawal";
type Tx = {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string;
  time: string;
};
type TxSection = { title: string; data: Tx[] };

const ALL_DATA: TxSection[] = [
  {
    title: "June 2026",
    data: [
      {
        id: "t1",
        type: "earning",
        description: "Delivery · American House → UG",
        amount: 24,
        date: "5 Jun",
        time: "14:32",
      },
      {
        id: "t2",
        type: "withdrawal",
        description: "Withdrawal · MTN MoMo ****04",
        amount: -250,
        date: "4 Jun",
        time: "09:00",
      },
      {
        id: "t3",
        type: "earning",
        description: "Delivery · Madina → Legon",
        amount: 44,
        date: "3 Jun",
        time: "11:15",
      },
      {
        id: "t4",
        type: "earning",
        description: "Delivery · East Legon → Airport",
        amount: 38,
        date: "2 Jun",
        time: "16:50",
      },
    ],
  },
  {
    title: "May 2026",
    data: [
      {
        id: "t5",
        type: "earning",
        description: "Delivery · American House → UG",
        amount: 20,
        date: "30 May",
        time: "13:10",
      },
      {
        id: "t6",
        type: "withdrawal",
        description: "Withdrawal · MTN MoMo ****04",
        amount: -500,
        date: "28 May",
        time: "08:45",
      },
      {
        id: "t7",
        type: "earning",
        description: "Delivery · Madina Old Station",
        amount: 14,
        date: "26 May",
        time: "10:20",
      },
      {
        id: "t8",
        type: "earning",
        description: "Delivery · East Legon Americana",
        amount: 44,
        date: "25 May",
        time: "15:05",
      },
      {
        id: "t9",
        type: "earning",
        description: "Delivery · University of Ghana",
        amount: 50,
        date: "22 May",
        time: "09:30",
      },
    ],
  },
];

type FilterType = "All" | "Earnings" | "Withdrawals";
const FILTERS: FilterType[] = ["All", "Earnings", "Withdrawals"];

export default function TransactionHistoryScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterType>("All");

  const filteredData: TxSection[] = ALL_DATA.map((section) => ({
    ...section,
    data: section.data.filter((tx) => {
      if (filter === "Earnings") return tx.type === "earning";
      if (filter === "Withdrawals") return tx.type === "withdrawal";
      return true;
    }),
  })).filter((s) => s.data.length > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={filteredData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionLine} />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <SvgXml
              xml={item.type === "earning" ? earningIconSvg : withdrawIconSvg}
              width={36}
              height={36}
            />
            <View style={styles.rowText}>
              <Text style={styles.rowDescription} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={styles.rowDate}>
                {item.date} · {item.time}
              </Text>
            </View>
            <Text
              style={[
                styles.rowAmount,
                item.type === "earning" ? styles.earning : styles.withdrawal,
              ]}
            >
              {item.type === "earning" ? "+" : ""}GHS {Math.abs(item.amount)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>
              No {filter.toLowerCase()} found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    gap: 10,
    marginBottom: 8,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  filterText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  filterTextActive: { color: Colors.white, fontFamily: "Poppins-SemiBold" },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
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
  rowText: { flex: 1 },
  rowDescription: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rowDate: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  rowAmount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.lg,
  },
  earning: { color: Colors.trendUp },
  withdrawal: { color: Colors.errorRed },
  divider: { height: 1, backgroundColor: Colors.divider },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
});
