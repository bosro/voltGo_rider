import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SectionList,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Colors, Typography, Radius } from "../../../theme";
import { SafeAreaView } from "react-native-safe-area-context";

type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "order" | "payment" | "info";
  unread: boolean;
};
type NotifSection = { title: string; data: Notif[] };

const DATA: NotifSection[] = [
  {
    title: "Today",
    data: [
      {
        id: "1",
        title: "New delivery request",
        body: "Cephas Ntiamoah · American House → UG",
        time: "2 min ago",
        type: "order",
        unread: true,
      },
      {
        id: "2",
        title: "Payment received",
        body: "GHS 20.00 credited to your wallet",
        time: "1 hr ago",
        type: "payment",
        unread: true,
      },
    ],
  },
  {
    title: "This Week",
    data: [
      {
        id: "3",
        title: "Delivery completed",
        body: "Order #ord_098 delivered successfully",
        time: "Mon 10:14",
        type: "order",
        unread: false,
      },
      {
        id: "4",
        title: "Withdrawal processed",
        body: "GHS 250.00 sent to MTN MoMo ****04",
        time: "Mon 09:00",
        type: "payment",
        unread: false,
      },
      {
        id: "5",
        title: "Profile verified",
        body: "Your Ghana Card has been approved",
        time: "Sun 14:30",
        type: "info",
        unread: false,
      },
    ],
  },
  {
    title: "Earlier",
    data: [
      {
        id: "6",
        title: "Welcome to VoltGo!",
        body: "Start accepting deliveries to earn money",
        time: "22 May",
        type: "info",
        unread: false,
      },
    ],
  },
];

const TYPE_COLORS = { order: "#E8F4FF", payment: "#E8FFF2", info: "#FFF8E8" };

// Drop these PNGs into assets/icons/
const TYPE_ICONS = {
  order: require("../../../../assets/icons/notif-order.png"),
  payment: require("../../../../assets/icons/notif-payment.png"),
  info: require("../../../../assets/icons/notif-info.png"),
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<NotifSection[]>(DATA);

  const markAllRead = () => {
    setData((prev) =>
      prev.map((sec) => ({
        ...sec,
        data: sec.data.map((n) => ({ ...n, unread: false })),
      })),
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        {/* Back arrow — drop back-arrow.png into assets/icons/ */}
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={data}
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
          <TouchableOpacity
            style={[styles.row, item.unread && styles.rowUnread]}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: TYPE_COLORS[item.type] },
              ]}
            >
              <Image
                source={TYPE_ICONS[item.type]}
                style={styles.notifIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.rowText}>
              <Text
                style={[styles.rowTitle, item.unread && styles.rowTitleUnread]}
              >
                {item.title}
              </Text>
              <Text style={styles.rowBody} numberOfLines={1}>
                {item.body}
              </Text>
            </View>
            <Text style={styles.rowTime}>{item.time}</Text>
            {item.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications yet</Text>
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
  backArrow: { width: 10, height: 18 },
  headerTitle: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  markAll: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textLink,
  },
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
  rowUnread: {
    backgroundColor: "#F7F9FF",
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIcon: { width: 22, height: 22 },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rowTitleUnread: { fontFamily: "Poppins-SemiBold" },
  rowBody: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  rowTime: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.navy,
    marginLeft: 4,
  },
  divider: { height: 1, backgroundColor: Colors.divider },
  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
});
