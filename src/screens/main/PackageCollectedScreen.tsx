import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,

  StatusBar,
  Platform,
  Animated,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import StandaloneTabBar from "../../components/navigation/BottomTabBar";
import { Colors, Typography, Radius, Shadow, lightMapStyle } from "../../theme";
import { MainStackParamList } from "../../navigation/types";

import PowerCircleIcon from "../../../assets/icons/power-circle.svg";
import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";
import { SafeAreaView } from "react-native-safe-area-context";

type RouteParams = RouteProp<MainStackParamList, "PackageCollected">;

export default function PackageCollectedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const {
    orderId,
    customerName,
    customerPhone,
    pickupAddress,
    dropoffAddress,
    itemType,
    price,
  } = route.params;

  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 62,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Static map image (swap MapView back when ready) ── */}
      <Image
        source={require("../../../assets/images/map-bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* ── MapView (commented out for stakeholder demo) ──────────────────
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={{
          latitude: (5.5968 + 5.6502) / 2,
          longitude: (-0.1869 + -0.187) / 2,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        customMapStyle={lightMapStyle}
      >
        <Polyline
          coordinates={[
            { latitude: 5.5968, longitude: -0.1869 },
            { latitude: 5.6502, longitude: -0.187 },
          ]}
          strokeColor={Colors.navy}
          strokeWidth={4}
        />
        <Marker coordinate={{ latitude: 5.5968, longitude: -0.1869 }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupDotOuter}><View style={styles.pickupDot} /></View>
        </Marker>
        <Marker coordinate={{ latitude: 5.6502, longitude: -0.187 }} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.dropoffPin}>
            <View style={styles.dropoffCircle} />
            <View style={styles.dropoffTail} />
          </View>
        </Marker>
        <Marker
          coordinate={{ latitude: (5.5968 + 5.6502) / 2 + 0.005, longitude: (-0.1869 + -0.187) / 2 }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.etaBadge}><Text style={styles.etaText}>15 min</Text></View>
        </Marker>
      </MapView>
      ───────────────────────────────────────────────────────────────────── */}

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.pill}>
          <PowerCircleIcon width={18} height={18} />
          <Text style={styles.pillText}>Go offline</Text>
        </View>
      </SafeAreaView>

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <View style={styles.customerRow}>
          <View style={styles.avatarCircle}>
            <UserAvatarIcon width={22} height={24} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Pick - up</Text>
                <Text style={styles.routeValue}>{pickupAddress}</Text>
                <Text style={styles.routeValue}>{itemType}</Text>
              </View>
            </View>
            <View style={styles.dashedLine}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.dashSeg} />
              ))}
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📍</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Drop - off</Text>
                <Text style={styles.routeValue}>{dropoffAddress}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.price}>GHS {price.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("CameraCapture", {
              orderId,
              mode: "delivery_proof",
              amount: price,
              pickupAddress,
              dropoffAddress,
              itemType,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.actionBtnText}>Package collected</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* <View style={styles.tabWrap}>
        <StandaloneTabBar activeTab="HomeMap" />
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pickupDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(74,144,226,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#4A90E2",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  dropoffPin: { alignItems: "center" },
  dropoffCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.navy,
  },
  dropoffTail: {
    width: 3,
    height: 8,
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  etaBadge: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  etaText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: Colors.white,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 58 : 38,
    zIndex: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    gap: 7,
  },
  pillText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  card: {
    position: "absolute",
    bottom: 72,
    left: 12,
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.modal,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  customerPhone: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 12 },
  routeSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  routeLeft: { flex: 1 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeEmoji: { fontSize: 18, marginTop: 1 },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  routeValue: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  dashedLine: { marginLeft: 28, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border },
  price: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
    alignSelf: "center",
  },
  actionBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  tabWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
});
