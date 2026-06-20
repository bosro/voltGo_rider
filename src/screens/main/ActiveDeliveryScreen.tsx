/**
 * ActiveDeliveryScreen.tsx  — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Fixes applied vs the previous version:
 *
 *  FIX 1  handleArrived set optimisticStatus to "collected" (wrong).
 *         Now sets it to "arrived" so the CTA correctly flips to
 *         "I've collected the package" rather than jumping straight
 *         to the post-collection phase.
 *
 *  FIX 2  Status banner was "Package collected — heading to drop-off"
 *         even while the rider was still at the pickup (status=arrived).
 *         Banner now has three distinct states:
 *           · enRoute   → "Heading to pickup"
 *           · arrived   → "At pickup – collect the package"
 *           · in-transit→ "Package collected – heading to drop-off"
 *
 *  FIX 3  The dead handleCta() function has been removed.  The button
 *         always calls ctaAction which is derived from currentStatus.
 *
 *  FIX 4  ctaLabel / ctaAction now have an explicit "arrived" branch so
 *         the CTA is never ambiguous regardless of optimistic vs real status.
 *
 *  FIX 5  Navigate button label is phase-aware:
 *           · enRoute / arrived → "Navigate to Pickup"
 *           · collected/in_transit → "Navigate to Dropoff"
 *
 *  FIX 6  Polyline direction is phase-aware:
 *           · enRoute / arrived → rider coord → pickup
 *           · collected/in_transit → pickup → dropoff
 *         Previously it always used rider→pickup even after the package
 *         was collected, so the line pointed the wrong way.
 */

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  useMarkArrived,
  useMarkCollected,
  useMarkInTransit,
} from "../../hooks/rider/useOrders";
import { Coordinates } from "../../lib/api";
import { MainStackParamList } from "../../navigation/types";
import { useRiderStore } from "../../store/riderStore";
import { Colors, Radius, Shadow, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useRoutePolyline } from "../../utils/useRoutePolyline";

import ConfirmModal from "@/components/common/ConfirmModal";
import OfflinePill from "@/components/common/OfflinePill";
import { useToast } from "@/components/common/Toast";
import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";

type RouteParams = RouteProp<MainStackParamList, "ActiveDelivery">;

const ACCRA_FALLBACK: Coordinates = { latitude: 5.5968, longitude: -0.1869 };

function hasMovedSignificantly(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > 0.0009 ||
    Math.abs(a.longitude - b.longitude) > 0.0009
  );
}

// ─────────────────────────────────────────────────────────────────
// Phase helpers — single source of truth for status classification
// ─────────────────────────────────────────────────────────────────

/** Rider accepted but hasn't yet reached pickup */
function isHeadingToPickup(status: string): boolean {
  return ["accepted", "assigned", "rider_arriving"].includes(status);
}

/** Rider is physically at the pickup, hasn't collected yet */
function isAtPickup(status: string): boolean {
  return status === "arrived";
}

/** Rider has collected and is heading to (or at) the dropoff */
function isPostCollection(status: string): boolean {
  return ["collected", "in_transit"].includes(status);
}

// ─────────────────────────────────────────────────────────────────

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
  const deliveryCompletedRef = useRef(false);

  const [orderCancelledVisible, setOrderCancelledVisible] = useState(false);

  const { currentCoords, activeOrder, clearDelivery } = useRiderStore();
  const riderCoord = currentCoords ?? ACCRA_FALLBACK;

  const lastPolylineOriginRef = useRef<Coordinates>(riderCoord);
  const [polylineOrigin, setPolylineOrigin] = useState<Coordinates>(riderCoord);

  // ── FIX 1: "arrived" is the correct optimistic status after markArrived ──
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  // Derive current status — socket keeps activeOrder fresh
  const currentStatus = optimisticStatus ?? activeOrder?.status ?? "accepted";

  const enRoute = isHeadingToPickup(currentStatus);
  const atPickup = isAtPickup(currentStatus);
  const inTransit = isPostCollection(currentStatus);

  const [isMinimized, setIsMinimized] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  // ── FIX 6: polyline direction is phase-aware ──────────────────────────────
  //   · enRoute OR atPickup → rider position → pickup
  //   · inTransit           → pickup        → dropoff
  const polylineOriginCoord = inTransit ? pickupCoord : polylineOrigin;
  const polylineDest = inTransit ? dropoffCoord : pickupCoord;

  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: polylineOriginCoord,
    destination: polylineDest,
    mode: "TWO_WHEELER",
  });

  const toast = useToast();

  // Update polyline origin when rider moves ~100 m
  useEffect(() => {
    if (!currentCoords) return;
    if (hasMovedSignificantly(currentCoords, lastPolylineOriginRef.current)) {
      lastPolylineOriginRef.current = currentCoords;
      setPolylineOrigin(currentCoords);
    }
  }, [currentCoords]);

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

  // Clear optimistic status when real status arrives from socket
  useEffect(() => {
    if (activeOrder?.status) {
      setOptimisticStatus(null);
    }
  }, [activeOrder?.status]);

  // ── Socket-driven navigation ──────────────────────────────────────────────
  useEffect(() => {
    if (activeOrder) {
      hasSeenActiveOrderRef.current = true;
      return;
    }
    if (hasSeenActiveOrderRef.current && !deliveryCompletedRef.current) {
      setOrderCancelledVisible(true);
    }
  }, [activeOrder]);

  // ── CTA handlers ─────────────────────────────────────────────────────────

  /**
   * Called when rider taps the CTA while en-route (heading to pickup).
   * Posts "arrived" to the REST API and sets optimistic status to "arrived"
   * (not "collected") so the next CTA becomes "I've collected the package".
   * FIX 1 was here: old code set optimisticStatus to "collected".
   */
  const handleArrived = useCallback(async () => {
    try {
      await markArrived(orderId);
      // FIX 1: "arrived" is the correct next status, not "collected"
      setOptimisticStatus("arrived");
    } catch {
      setOptimisticStatus(null);
    }
  }, [orderId, markArrived]);

  // Tapped while at pickup (status = "arrived"). Marks collected + in-transit,
  // then STAYS on this screen so the rider can navigate to dropoff.
  // No camera here — proof photo only happens at dropoff (Fix below).
  const handleCollected = useCallback(async () => {
    try {
      await markCollected(orderId);
      await markInTransit(orderId);
      // No optimistic status flip needed — useMarkInTransit's onSuccess
      // already calls setActiveOrder, which flips currentStatus to
      // "in_transit" via the socket-or-store value, which in turn flips
      // ctaLabel/ctaAction below to the delivered branch automatically.
    } catch {
      // Best-effort — if in-transit fails, optimistic status still lets
      // the rider proceed; the next "delivered" call will retry server state.
      setOptimisticStatus("in_transit");
    }
  }, [orderId, markCollected, markInTransit]);

  // Tapped while in transit / at dropoff. THIS is where the camera opens —
  // proof of delivery is captured at the customer's location, not at pickup.
  const handleArrivedAtDropoff = useCallback(() => {
    deliveryCompletedRef.current = true;
    navigation.navigate("CameraCapture", {
      orderId,
      amount: parseFloat(String(price ?? "0")),
      pickupAddress,
      dropoffAddress,
      itemType,
    });
  }, [orderId, price, pickupAddress, dropoffAddress, itemType]);

  // ── FIX 3 & 4: clean CTA derivation — no dead handleCta ─────────────────
  //
  //  enRoute  (accepted/assigned/rider_arriving) → "I have arrived at pickup"
  //  atPickup (arrived)                          → "I've collected the package"
  //  inTransit(collected/in_transit)             → "I've delivered the package"
  //
  const ctaLabel = enRoute
    ? "I have arrived at pickup"
    : atPickup
      ? "I've collected the package"
      : "I've arrived — take delivery photo";

  const ctaAction = enRoute
    ? handleArrived
    : atPickup
      ? handleCollected
      : handleArrivedAtDropoff; // ← was the inline camera-navigate closure

  const ctaBusy = enRoute ? isArriving : atPickup ? isCollecting : false;

  // ── FIX 5: navigation label is phase-aware ────────────────────────────────
  const navButtonLabel = inTransit
    ? "Navigate to Dropoff"
    : "Navigate to Pickup";

  const navDestCoord = inTransit ? dropoffCoord : pickupCoord;
  const navDestAddress = inTransit ? dropoffAddress : pickupAddress;

  const displayEta = etaMinutes ?? pickupEta ?? null;

  const openNavigation = (destLat: number, destLng: number, label: string) => {
    const destination = `${destLat},${destLng}`;
    const encodedLabel = encodeURIComponent(label);

    const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    if (Platform.OS === "ios") {
      // Try Google Maps app first (most riders have it, matches in-app routing),
      // then Apple Maps, then web as the final fallback.
      const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      const appleMapsUrl = `maps://app?daddr=${destination}&dirflg=d`;

      Linking.canOpenURL(googleMapsUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(googleMapsUrl);
          }
          return Linking.canOpenURL(appleMapsUrl).then((appleSupported) => {
            if (appleSupported) {
              return Linking.openURL(appleMapsUrl);
            }
            return Linking.openURL(webFallbackUrl);
          });
        })
        .catch(() => {
          Linking.openURL(webFallbackUrl).catch(() => {
            toast?.error?.(
              "Couldn't open navigation. Please open Maps manually.",
            );
          });
        });
    } else {
      // Android — try the Google Maps turn-by-turn intent, fall back to web
      // if Google Maps isn't installed (rare but possible on some devices).
      const androidNavUrl = `google.navigation:q=${destination}&mode=d`;

      Linking.canOpenURL(androidNavUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(androidNavUrl);
          }
          return Linking.openURL(webFallbackUrl);
        })
        .catch(() => {
          Linking.openURL(webFallbackUrl).catch(() => {
            toast?.error?.(
              "Couldn't open navigation. Please open Maps manually.",
            );
          });
        });
    }
  };

  const minimizeCard = () => {
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => setIsMinimized(true));
  };

  const expandCard = () => {
    setIsMinimized(false);
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  // ── FIX 2: banner now has three meaningful states ─────────────────────────
  const bannerText = enRoute
    ? "Heading to pickup location"
    : atPickup
      ? "At pickup — collect the package"
      : "Package collected — heading to drop-off";

  const bannerBg = enRoute
    ? "#FEF3C7" // amber tint
    : atPickup
      ? "#EEF2FF" // indigo tint
      : "#D1FAE5"; // green tint

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
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.navy}
            strokeWidth={4}
          />
        )}

        {/* Rider position */}
        <Marker
          coordinate={riderCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={!!currentCoords}
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

      <OfflinePill />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeIn,
            transform: [
              { translateY: slideUp },
              { translateY: cardTranslateY },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.minimizeBtn}
          onPress={minimizeCard}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.minimizeBtnText}>—</Text>
        </TouchableOpacity>

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
                {/* FIX 2: banner clearly describes the current phase */}
                <View
                  style={[styles.statusBanner, { backgroundColor: bannerBg }]}
                >
                  <Text style={styles.statusBannerText}>{bannerText}</Text>
                </View>
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

        {/* FIX 5: navigate button label and destination are phase-aware */}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() =>
            openNavigation(
              navDestCoord.latitude,
              navDestCoord.longitude,
              navDestAddress,
            )
          }
          activeOpacity={0.88}
        >
          <View style={styles.navBtnContent}>
            <Image
              source={require("../../../assets/icons/navigation.png")}
              style={styles.navIcon}
              resizeMode="contain"
            />
            {/* FIX 5 */}
            <Text style={styles.navBtnText}>{navButtonLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* FIX 3 & 4: single CTA always calls ctaAction, no dead handleCta */}
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

      {/* Floating action button (minimized state) */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [{ scale: fabScale }],
            opacity: fabScale,
          },
        ]}
        pointerEvents={isMinimized ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={expandCard}
          activeOpacity={0.85}
          style={styles.fabInner}
        >
          <Text style={styles.fabEmoji}>📦</Text>
          {displayEta != null && (
            <Text style={styles.fabEta}>{displayEta}m</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ConfirmModal
        visible={orderCancelledVisible}
        title="Order Cancelled"
        message="The customer cancelled this delivery."
        primaryLabel="OK"
        onPrimary={() => {
          setOrderCancelledVisible(false);
          navigation.replace("MainTabs");
        }}
      />
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
  minimizeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  minimizeBtnText: {
    fontSize: 20,
    color: Colors.textSecondary,
    lineHeight: 20,
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

  statusBanner: {
    marginBottom: 6,
    padding: 8,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  statusBannerText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
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
  navBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: { width: 18, height: 18, marginRight: 8 },
  navBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.navy,
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

  fab: {
    position: "absolute",
    bottom: 36,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navy,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  fabEmoji: { fontSize: 22 },
  fabEta: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    color: Colors.white,
    marginTop: 1,
  },
});
