import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NavyButton, GhostButton } from "../../../components/common";
import { Colors, Typography, Radius, Shadow } from "../../../theme";
import { SvgXml } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";


const { height } = Dimensions.get("window");

export default function DeliveryCompletedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    orderId = "ord_001",
    amount = 20,
    pickupAddress = "American House",
    dropoffAddress = "University of Ghana",
    itemType = "Parcel",
  } = route.params ?? {};

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const checkCircleSvg = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#E8FFF2"/>
  <circle cx="50" cy="50" r="36" fill="#4CD964" fill-opacity="0.25"/>
  <circle cx="50" cy="50" r="24" fill="#4CD964"/>
  <path d="M36 50L44 58L64 38" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBackToHome = () =>
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });

  const handleViewDetails = () => {
    navigation.navigate("ActivityDetail", {
      activityId: orderId,
      destination: dropoffAddress,
      date: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      amount,
      status: "completed",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.content}>
        {/* Check circle — drop check-circle.png into assets/images/ */}
        <Animated.View
          style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <SvgXml xml={checkCircleSvg} width={100} height={100} />
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}
        >
          <Text style={styles.heading}>Delivery Complete!</Text>
          <Text style={styles.subheading}>
            Great job! The package was delivered successfully.
          </Text>

          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>You earned</Text>
            <Text style={styles.earningsAmount}>GHS {amount}.00</Text>
            <Text style={styles.earningsNote}>Added to your wallet</Text>
          </View>

          <View style={styles.summaryCard}>
            <SummaryRow icon="parcel" label="Item" value={itemType} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="pickup" label="From" value={pickupAddress} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="dropoff" label="To" value={dropoffAddress} />
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <NavyButton label="Back to Home" onPress={handleBackToHome} />
        <GhostButton
          label="View Details"
          onPress={handleViewDetails}
          style={{ marginTop: 10 }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

// PNG map — drop these into assets/icons/
const ROW_ICONS = {
  parcel: require("../../../../assets/icons/parcel.png"),
  pickup: require("../../../../assets/icons/pin-pickup.png"),
  dropoff: require("../../../../assets/icons/pin-dropoff.png"),
};

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof ROW_ICONS;
  label: string;
  value: string;
}) {
  return (
    <View style={sumStyles.row}>
      <Image
        source={ROW_ICONS[icon]}
        style={sumStyles.icon}
        resizeMode="contain"
      />
      <Text style={sumStyles.label}>{label}</Text>
      <Text style={sumStyles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  icon: { width: 22, height: 22 },
  label: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    width: 48,
  },
  value: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
  },
  checkWrap: { marginBottom: 24 },
  checkImage: { width: 100, height: 100 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subheading: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  earningsCard: {
    width: "100%",
    backgroundColor: Colors.navy,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  earningsLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  earningsAmount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 38,
    color: Colors.primary,
    marginBottom: 4,
  },
  earningsNote: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: "rgba(255,255,255,0.5)",
  },
  summaryCard: {
    width: "100%",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  summaryDivider: { height: 1, backgroundColor: Colors.divider },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
