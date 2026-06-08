import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SectionList,
} from "react-native";

import FilterSlidersIcon from "../../../../assets/icons/filter-sliders.svg";
import { useNavigation } from "@react-navigation/native";
import { Colors, Typography } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";


const ACTIVITIES = [
  {
    title: "May 2026",
    data: [
      {
        id: "1",
        destination: "University of Ghana",
        date: "20 May . 12:34",
        amount: 24,
      },
      {
        id: "2",
        destination: "Madina Old Station",
        date: "20 May . 12:34",
        amount: 14,
      },
      {
        id: "3",
        destination: "East Legon Americana",
        date: "20 May . 12:34",
        amount: 44,
      },
    ],
  },
  {
    title: "Feb 2026",
    data: [
      {
        id: "4",
        destination: "University of Ghana",
        date: "20 May . 12:34",
        amount: 50,
      },
      {
        id: "5",
        destination: "University of Ghana",
        date: "20 May . 12:34",
        amount: 24,
      },
      {
        id: "6",
        destination: "Madina Old Station",
        date: "20 May . 12:34",
        amount: 14,
      },
    ],
  },
];

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<"Past" | "Upcoming">("Past");
  const navigation = useNavigation<any>();

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
        <TouchableOpacity activeOpacity={0.75}>
          <FilterSlidersIcon width={22} height={20} />
        </TouchableOpacity>
      </View>
      <SectionList
        sections={activeTab === "Past" ? ACTIVITIES : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                activityId: item.id,
                destination: item.destination,
                date: item.date,
                amount: item.amount,
                status: "completed",
              })
            }
            activeOpacity={0.75}
          >
            <Text style={styles.bicycleEmoji}>🚲</Text>
            <View style={styles.rowText}>
              <Text style={styles.destination}>{item.destination}</Text>
              <Text style={styles.dateTime}>{item.date}</Text>
            </View>
            <Text style={styles.amount}>GHS {item.amount}</Text>
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
            <Text style={styles.emptyText}>No upcoming deliveries</Text>
          </View>
        }
      />
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
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
});



