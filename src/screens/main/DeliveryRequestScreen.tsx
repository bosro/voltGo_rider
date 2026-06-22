/**
 * DeliveryRequestScreen.tsx - RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Shown when dispatch assigns an order to the rider.
 *
 * Changes vs previous version:
 *  - Uses rider's real currentCoords from riderStore as the map origin
 *    instead of a hardcoded Accra point, so the route polyline starts
 *    at the rider's actual position.
 *  - Rider location marker drawn on the map.
 *  - Auto-decline correctly fires on countdown = 0 (guarded with ref).
 *  - All route.params are forwarded correctly on Accept.
 *  - OfflinePill used for consistent positioning.
 */

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useAcceptOrder, useDeclineOrder } from "../../hooks/rider/useOrders";
import { MainStackParamList } from "../../navigation/types";
import { useRiderStore } from "../../store/riderStore";
import { Colors, Radius, Shadow, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useRoutePolyline } from "../../utils/useRoutePolyline";

import OfflinePill from "@/components/common/OfflinePill";
import { useToast } from "@/components/common/Toast";
import CloseXIcon from "../../../assets/icons/close-x.svg";
import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";

type RouteParams = RouteProp<MainStackParamList, "DeliveryRequest">;

const ACCRA_FALLBACK = { latitude: 5.5968, longitude: -0.1869 };

export default function DeliveryRequestScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const mapRef = useRef<MapView>(null);
  const toast = useToast();

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

  // Use rider's live GPS as the route origin if available
  const { currentCoords } = useRiderStore();
  const riderCoord = currentCoords ?? ACCRA_FALLBACK;
  const pickupCoord = pickupCoords ?? ACCRA_FALLBACK;
  const dropoffCoord = dropoffCoords ?? { latitude: 5.6502, longitude: -0.187 };

  const [countdown, setCountdown] = useState(28);
  const hasAutoDismissed = useRef(false);
  const slideUp = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const { mutateAsync: acceptOrder, isPending: isAccepting } = useAcceptOrder();
  const { mutateAsync: declineOrder, isPending: isDeclining } =
    useDeclineOrder();

  // Route from rider's current location → pickup point
  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: riderCoord,
    destination: pickupCoord,
    mode: "TWO_WHEELER",
  });

  // Fit map to show rider → pickup route
  useEffect(() => {
    if (!mapRef.current) return;
    const points =
      routeCoords.length > 0 ? routeCoords : [riderCoord, pickupCoord];
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 340, left: 60 },
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

  // Slide-up animation + countdown timer
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-decline once countdown hits zero
  useEffect(() => {
    if (countdown === 0 && !hasAutoDismissed.current) {
      hasAutoDismissed.current = true;
      declineOrder(orderId)
        .catch(() => {})
        .finally(() => navigation.replace("MainTabs"));
    }
  }, [countdown]);

  const handleAccept = async () => {
    try {
      await acceptOrder(orderId);
      // useAcceptOrder.onSuccess has already called setActiveOrder(order).
      // Navigate with the same route params so the screen has pickup/dropoff
      // coords, price, customer info, etc. from the offer.
      navigation.replace("ActiveDelivery", route.params);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Could not accept this order. It may have been cancelled.";
      toast.error(message);
      // Do NOT navigate away — let the rider see the offer again or wait
      // for the auto-decline countdown.
    }
  };

  const handleDecline = async () => {
    try {
      await declineOrder(orderId);
    } catch {
      // Best-effort decline — server may already have cancelled it
    } finally {
      navigation.replace("MainTabs");
    }
  };

  const displayEta = etaMinutes ?? pickupEta;
  const isBusy = isAccepting || isDeclining;

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
        {/* Route line: rider → pickup */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.navy}
            strokeWidth={4}
          />
        )}

        {/* Rider's current position */}
        <Marker
          coordinate={riderCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
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
                (riderCoord.latitude + pickupCoord.latitude) / 2 + 0.004,
              longitude: (riderCoord.longitude + pickupCoord.longitude) / 2,
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

      {/* Consistent pill — same component used on every map screen */}
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
          <Text style={styles.countdown}>{countdown}s</Text>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleDecline}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isBusy}
          >
            <CloseXIcon width={14} height={14} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Route details */}
        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>
                  Pick-up{displayEta != null ? ` (${displayEta} min away)` : ""}
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
          <Text style={styles.price}>GHS {Number(price).toFixed(2)}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            activeOpacity={0.88}
            disabled={isBusy}
          >
            {isAccepting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            activeOpacity={0.88}
            disabled={isBusy}
          >
            {isDeclining ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.declineText}>Decline</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Rider dot (blue pulsing-style outer ring)
  riderDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,200,0,0.25)",
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
    lineHeight: 20,
  },
  customerPhone: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  countdown: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.lg,
    color: Colors.primary,
    marginRight: 6,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
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
  actionRow: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});


