import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
} from "react-native-svg";
import { Colors, Typography, Radius, Shadow } from "../../theme";

import TrendUpIcon from "../../../assets/icons/trend-up.svg";
import TrendDownIcon from "../../../assets/icons/trend-down.svg";
import ChevronDownIcon from "../../../assets/icons/chevron-down-sm.svg";

const { width } = Dimensions.get("window");
const CHART_W = width - 44;
const CHART_H = 160;

const CHART_DATA = [
  2800, 2600, 2900, 3200, 5500, 6200, 5800, 7000, 8500, 9400, 9800, 10200,
  11500, 11000,
];
const X_LABELS = [
  "Mon\n15",
  "Tue\n16",
  "Wed\n17",
  "Thu\n18",
  "Fri\n19",
  "Sat\n20",
  "Sun\n21",
  "Mon\n22",
];
const Y_LABELS = ["15k", "12k", "9k", "6k", "3k", "0k"];
const MAX_VAL = 15000;

function EarningsChart() {
  const padLeft = 36,
    padRight = 10,
    padTop = 10,
    padBottom = 36;
  const cW = CHART_W - padLeft - padRight;
  const cH = CHART_H - padTop - padBottom;
  const points = CHART_DATA.map((val, i) => ({
    x: padLeft + (i / (CHART_DATA.length - 1)) * cW,
    y: padTop + (1 - val / MAX_VAL) * cH,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const fillD =
    pathD +
    ` L${points[points.length - 1].x.toFixed(1)},${(padTop + cH).toFixed(1)} L${points[0].x.toFixed(1)},${(padTop + cH).toFixed(1)} Z`;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.navy} stopOpacity="0.18" />
          <Stop offset="1" stopColor={Colors.navy} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {Y_LABELS.map((label, i) => {
        const y = padTop + (i / (Y_LABELS.length - 1)) * cH;
        return (
          <React.Fragment key={label}>
            <Line
              x1={padLeft}
              y1={y}
              x2={padLeft + cW}
              y2={y}
              stroke={Colors.divider}
              strokeWidth={1}
            />
            <SvgText
              x={padLeft - 4}
              y={y + 4}
              fontSize={9}
              fill={Colors.textMuted}
              textAnchor="end"
              fontFamily="Poppins-Regular"
            >
              {label}
            </SvgText>
          </React.Fragment>
        );
      })}
      {X_LABELS.map((label, i) => {
        const x = padLeft + (i / (X_LABELS.length - 1)) * cW;
        return label.split("\n").map((line, li) => (
          <SvgText
            key={`${i}-${li}`}
            x={x}
            y={padTop + cH + 12 + li * 12}
            fontSize={9}
            fill={Colors.textMuted}
            textAnchor="middle"
            fontFamily="Poppins-Regular"
          >
            {line}
          </SvgText>
        ));
      })}
      <Path d={fillD} fill="url(#cg)" />
      <Path
        d={pathD}
        stroke={Colors.navy}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<"Weekly" | "Monthly">("Weekly");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.heading}>Wallet</Text>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balance}>GHS 2553.56</Text>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statPeriod}>Today</Text>
              <TrendUpIcon width={20} height={16} />
            </View>
            <Text style={styles.statAmount}>GHS 253.00</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statPeriod}>This week</Text>
              <TrendDownIcon width={20} height={16} />
            </View>
            <Text style={styles.statAmount}>GHS 1053.00</Text>
          </View>
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>Overview</Text>
          <View style={styles.overviewDivider} />
          <TouchableOpacity
            style={styles.periodPill}
            onPress={() =>
              setPeriod(period === "Weekly" ? "Monthly" : "Weekly")
            }
            activeOpacity={0.8}
          >
            <Text style={styles.periodText}>{period}</Text>
            <ChevronDownIcon width={12} height={8} />
          </TouchableOpacity>
        </View>
        <View style={styles.chartWrap}>
          <EarningsChart />
        </View>
        <View style={{ height: 16 }} />
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate("TransactionHistory")}
          activeOpacity={0.8}
        >
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => navigation.navigate("Withdraw")}
          activeOpacity={0.88}
        >
          <Text style={styles.withdrawText}>Withdraw</Text>
        </TouchableOpacity>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: 22, paddingTop: 16 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 14,
  },
  balanceLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textLink,
    textAlign: "center",
    marginBottom: 4,
  },
  balance: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 36,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 22 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    padding: 14,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statPeriod: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  statAmount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  overviewLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flexShrink: 0,
  },
  overviewDivider: { flex: 1, height: 1, backgroundColor: Colors.divider },
  periodPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  periodText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  chartWrap: { alignItems: "center" },
  historyBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  historyText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  withdrawBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    ...Shadow.card,
  },
  withdrawText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});


