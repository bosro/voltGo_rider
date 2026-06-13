/**
 * ActiveDeliveryScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * REPLACES: EnRoutePickupScreen + PackageCollectedScreen
 *
 * A single screen that covers the full active delivery lifecycle.
 * The map, polyline, and card are always visible; only the CTA and
 * route direction change as the order status progresses:
 *
 *   accepted / rider_arriving / arrived
 *     → route: rider → pickup
 *     → CTA: "I have arrived"
 *
 *   collected / in_transit
 *     → route: pickup → dropoff
 *     → CTA: "Package collected" (only shown when status = accepted/arrived)
 *         or auto-advances after markCollected
 *     → leads to CameraCapture for proof photo
 *
 *   delivered  → replaced by navigation to DeliveryCompleted
 *   cancelled  → back to MainTabs
 *
 * Live features:
 *  - Rider marker follows riderStore.currentCoords (updated by useLocationTracking)
 *  - Polyline re-fetches when the origin changes by more than ~100 m
 *  - mapRef.fitToCoordinates called when polyline updates
 *  - order:cancelled socket event clears activeOrder → useEffect navigates away
 */

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Colors, Typography, Radius, Shadow } from "../../theme";
import { MainStackParamList } from "../../navigation/types";
import { useRoutePolyline } from "../../utils/useRoutePolyline";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import {
  useMarkArrived,
  useMarkCollected,
  useMarkInTransit,
} from "../../hooks/rider/useOrders";
import { useRiderStore } from "../../store/riderStore";
import { Coordinates } from "../../lib/api";

import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";
import OfflinePill from "@/components/common/OfflinePill";
import { Linking, Platform } from "react-native";

type RouteParams = RouteProp<MainStackParamList, "ActiveDelivery">;

const ACCRA_FALLBACK: Coordinates = { latitude: 5.5968, longitude: -0.1869 };

/** Returns true when two coords differ by more than ~100 m */
function hasMovedSignificantly(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > 0.0009 ||
    Math.abs(a.longitude - b.longitude) > 0.0009
  );
}

/** Whether the given status means "heading to pickup" */
function isEnRoute(status: string): boolean {
  return ["accepted", "assigned", "rider_arriving", "arrived"].includes(status);
}

export default function ActiveDeliveryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const mapRef = useRef<MapView>(null);

  const {
    orderId,
    customerName,
    customerPhone,
    pickupAddress,
    dropoffAddress,
    itemType,
    price,
    pickupEta,
    pickupCoords,
    dropoffCoords,
  } = route.params as any;

  const pickupCoord = (pickupCoords as Coordinates) ?? ACCRA_FALLBACK;
  const dropoffCoord = (dropoffCoords as Coordinates) ?? {
    latitude: 5.6502,
    longitude: -0.187,
  };

  const hasSeenActiveOrderRef = useRef(false);

  // ── Store state ───────────────────────────────────────────────────────────
  const { currentCoords, activeOrder, clearDelivery } = useRiderStore();
  const riderCoord = currentCoords ?? ACCRA_FALLBACK;

  // Track last coords used to trigger a new polyline fetch (avoid refetching
  // on every tiny GPS ping — only when moved ~100 m)
  const lastPolylineOriginRef = useRef<Coordinates>(riderCoord);
  const [polylineOrigin, setPolylineOrigin] = useState<Coordinates>(riderCoord);

  const openNavigation = (destLat: number, destLng: number, label: string) => {
    const destination = `${destLat},${destLng}`;

    if (Platform.OS === "ios") {
      // Opens Apple Maps in driving navigation mode
      const url = `maps://app?daddr=${destination}&dirflg=d`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
          );
        }
      });
    } else {
      // Opens Google Maps on Android in navigation mode
      Linking.openURL(`google.navigation:q=${destination}&mode=d`);
    }
  };

  useEffect(() => {
    if (!currentCoords) return;
    if (hasMovedSignificantly(currentCoords, lastPolylineOriginRef.current)) {
      lastPolylineOriginRef.current = currentCoords;
      setPolylineOrigin(currentCoords);
    }
  }, [currentCoords]);

  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  // Derive current status — prefer store (kept fresh by socket) over params
  const currentStatus = optimisticStatus ?? activeOrder?.status ?? "accepted";
  const enRoute = isEnRoute(currentStatus);

  // ── Polyline ──────────────────────────────────────────────────────────────
  const polylineOriginCoord = enRoute ? polylineOrigin : pickupCoord;
  const polylineDest = enRoute ? pickupCoord : dropoffCoord;

  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: polylineOriginCoord,
    destination: polylineDest,
    mode: "TWO_WHEELER",
  });

  useEffect(() => {
    if (!mapRef.current) return;
    const points =
      routeCoords.length > 0
        ? routeCoords
        : [polylineOriginCoord, polylineDest];
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 360, left: 60 },
      animated: true,
    });
  }, [routeCoords]);

  const initialRegion = useMemo(
    () => ({
      latitude: (riderCoord.latitude + pickupCoord.latitude) / 2,
      longitude: (riderCoord.longitude + pickupCoord.longitude) / 2,
      latitudeDelta:
        Math.abs(riderCoord.latitude - pickupCoord.latitude) * 4 + 0.02,
      longitudeDelta:
        Math.abs(riderCoord.longitude - pickupCoord.longitude) * 4 + 0.02,
    }),
    [],
  );

  // ── Animations ────────────────────────────────────────────────────────────
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

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutateAsync: markArrived, isPending: isArriving } = useMarkArrived();
  const { mutateAsync: markCollected, isPending: isCollecting } =
    useMarkCollected();
  const { mutateAsync: markInTransit } = useMarkInTransit();

  // ── Socket-driven navigation ──────────────────────────────────────────────
  // When order:cancelled fires, useSocket clears activeOrder → navigate away
  useEffect(() => {
    // If we just got a real order, mark it
    if (activeOrder) {
      hasSeenActiveOrderRef.current = true;
      return;
    }
    // Only navigate away if we HAD an order and it disappeared (cancelled/completed)
    if (hasSeenActiveOrderRef.current) {
      Alert.alert("Order Cancelled", "The customer cancelled this delivery.");
      navigation.replace("MainTabs");
    }
  }, [activeOrder]);

  // ── CTA handlers ─────────────────────────────────────────────────────────
  const handleArrived = async () => {
    try {
      await markArrived(orderId);
      // Force the CTA to flip regardless of what backend returns
      setOptimisticStatus("collected");
    } catch {
      setOptimisticStatus(null);
    }
  };

  useEffect(() => {
    if (activeOrder?.status) {
      setOptimisticStatus(null); // real status arrived, clear optimistic
    }
  }, [activeOrder?.status]);

  const handleCollected = useCallback(async () => {
    try {
      await markCollected(orderId);
      // Fire in-transit in background — don't block the UX
      markInTransit(orderId).catch(() => {});
    } catch {
      // Proceed to camera regardless
    }
    navigation.navigate("CameraCapture", {
      orderId,
      amount: price,
      pickupAddress,
      dropoffAddress,
      itemType,
    });
  }, [orderId, price, pickupAddress, dropoffAddress, itemType]);

  // ── Determine what the CTA should say ────────────────────────────────────
  const ctaLabel = enRoute ? "I have arrived" : "Package collected";
  const ctaAction = enRoute ? handleArrived : handleCollected;
  const ctaBusy = enRoute ? isArriving : isCollecting;

  const displayEta = etaMinutes ?? pickupEta ?? null;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={CUSTOM_MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.navy}
            strokeWidth={4}
          />
        )}

        {/* Rider position — updates as currentCoords changes */}
        <Marker
          coordinate={riderCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={!!currentCoords} // track changes while we have live GPS
        >
          <View style={styles.riderDotOuter}>
            <View style={styles.riderDot} />
          </View>
        </Marker>

        {/* Pickup */}
        <Marker
          coordinate={pickupCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pickupDotOuter}>
            <View style={styles.pickupDot} />
          </View>
        </Marker>

        {/* Drop-off */}
        <Marker
          coordinate={dropoffCoord}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <View style={styles.dropoffPin}>
            <View style={styles.dropoffCircle} />
            <View style={styles.dropoffTail} />
          </View>
        </Marker>

        {/* ETA badge */}
        {displayEta != null && (
          <Marker
            coordinate={{
              latitude:
                (polylineOriginCoord.latitude + polylineDest.latitude) / 2 +
                0.005,
              longitude:
                (polylineOriginCoord.longitude + polylineDest.longitude) / 2,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{displayEta} min</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Pill — same component, same position on every map screen */}
      <OfflinePill />

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        {/* Customer row */}
        <View style={styles.customerRow}>
          <View style={styles.avatarCircle}>
            <UserAvatarIcon width={22} height={24} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
          {displayEta != null && (
            <Text style={styles.timer}>{displayEta} min</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Route details */}
        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>
                  {enRoute
                    ? `Pick-up${displayEta != null ? ` (${displayEta} min away)` : ""}`
                    : "Pick-up"}
                </Text>
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
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeValue}>{dropoffAddress}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.price}>GHS {Number(price || 0).toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {
            const dest = enRoute ? pickupCoord : dropoffCoord;
            const label = enRoute ? pickupAddress : dropoffAddress;
            openNavigation(dest.latitude, dest.longitude, label);
          }}
          activeOpacity={0.88}
        >
          <View style={styles.navBtnContent}>
            <Image
              source={require("../../../assets/icons/navigation.png")}
              style={styles.navIcon}
              resizeMode="contain"
            />
            <Text style={styles.navBtnText}>
              {enRoute ? "Navigate to Pickup" : "Navigate to Dropoff"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Single CTA — label and action change with status */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={ctaAction}
          activeOpacity={0.88}
          disabled={ctaBusy}
        >
          {ctaBusy ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.actionBtnText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  riderDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,200,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  riderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFCC00",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
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
  timer: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.lg,
    color: Colors.primary,
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
    justifyContent: "center",
  },
  actionBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  navBtn: {
    backgroundColor: "#F0F4F8",
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.navy,
  },

  navBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
});
