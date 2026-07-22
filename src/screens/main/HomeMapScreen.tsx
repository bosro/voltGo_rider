/**
 * HomeMapScreen.tsx - RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * The rider's idle home screen. Shows a live map centred on the
 * rider's position and waits for an incoming order offer.
 *
 * What changed vs the previous version:
 *
 *  REMOVED — useCurrentLocation() + the setCurrentCoords effect
 *    Location is now owned by useLocationTracking (mounted in
 *    MainNavigator). This screen just reads currentCoords from the
 *    store — no duplicate watchers.
 *
 *  REMOVED — useLocationHeartbeat()
 *    The throttled PUT /rider/location heartbeat is also handled
 *    inside useLocationTracking. No need to call it here.
 *
 *  KEPT — useOrderOffers() REST fallback poll
 *    Still useful when the socket drops. The hook already respects
 *    isOnline and uses a 30 s interval when the socket is live.
 *
 *  KEPT — pendingOffer → DeliveryRequest navigation
 *    Keyed on pendingOffer.id so a new offer always triggers even
 *    if the previous one had the same id (defensive).
 *
 *  KEPT — socket connection dot (useful in QA / staging builds)
 *
 *  ADDED — map re-centres once on first GPS fix, then tracks live
 *    The marker uses tracksViewChanges only while coords are being
 *    set for the first time, avoiding unnecessary re-renders.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";

import PowerCircleIcon from "../../../assets/icons/power-circle.svg";
import { Colors, Radius, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useOrderOffers } from "../../hooks/rider/useOrders";
import { useToggleStatus } from "../../hooks/rider/useRider";
import { socketService } from "../../lib/socket";
import { useRiderStore } from "../../store/riderStore";
import EmotoSvg from "../../../assets/icons/emoto.svg";
import BicycleSvg from "../../../assets/icons/bicycle.svg"; // or bicycle 6.svg
import { useAuthStore } from "@/store/authStore";

const DEFAULT_REGION = {
  latitude: 5.603717,
  longitude: -0.186964,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export default function HomeMapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const { rider } = useAuthStore();
  const vehicleType = rider?.vehicle_type ?? "e-motorcycle";

  const { mutate: toggleStatus } = useToggleStatus();

  const [isSocketConnected, setIsSocketConnected] = useState(
    socketService.isConnected,
  );

  const {
    isOnline,
    isTogglingStatus,
    pendingOffer,
    setPendingOffer,
    currentCoords, // written by useLocationTracking in MainNavigator
    setCurrentCoords,
  } = useRiderStore();

  // Track whether we've already centred the map on the rider's first fix
  const hascentredRef = useRef(false);

  // useLocationTracking (mounted in MainNavigator) only watches position
  // while the rider is online — so a rider who is offline, or who just
  // reopened/backgrounded the app, would otherwise be stuck showing a
  // stale (or missing) pin until they flip online. Grabbing a fresh
  // one-shot fix every time this screen gains focus keeps the map
  // accurate regardless of online status, without fighting the live
  // watch's camera behaviour (we still only auto-recentre once).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted" || cancelled) return;

          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (cancelled) return;

          setCurrentCoords({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        } catch {
          // Non-fatal — the live watch (once online) will pick this up
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [setCurrentCoords]),
  );

  // Re-centre map on first GPS fix
  useEffect(() => {
    if (!currentCoords || hascentredRef.current || !mapRef.current) return;
    hascentredRef.current = true;
    mapRef.current.animateToRegion(
      {
        ...currentCoords,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      800,
    );
  }, [currentCoords]);

  useEffect(() => {
    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socketService.onConnectionChange(onConnect, onDisconnect);

    // Sync immediately in case state changed before this effect ran
    setIsSocketConnected(socketService.isConnected);

    return () => {
      socketService.offConnectionChange(onConnect, onDisconnect);
    };
  }, []); // empty deps — socketService is a singleton, never changes

  // REST fallback — keeps working even when socket drops.
  // The hook internally does nothing when isOnline is false.
  useOrderOffers();

  // Navigate to DeliveryRequest when socket (or REST fallback) delivers an offer.
  // Keyed on pendingOffer.id so a new offer always fires even if the screen
  // was already showing (edge-case: rider declines, gets re-assigned same order).
  useEffect(() => {
    if (!pendingOffer) return;
    navigation.navigate("DeliveryRequest", {
      orderId: pendingOffer.id,
      customerName: pendingOffer.customer?.full_name ?? "",
      customerPhone: pendingOffer.customer?.phone ?? "",
      pickupAddress: pendingOffer.pickup_address,
      dropoffAddress: pendingOffer.dropoff_address,
      itemType: pendingOffer.item_description,
      price: parseFloat(pendingOffer.price_ghs ?? "0"), // ← parse string to number here
      pickupEta: (pendingOffer as any).pickup_eta ?? 6,
      pickupCoords: (pendingOffer as any).pickup_coords,
      dropoffCoords: (pendingOffer as any).dropoff_coords,
    });
    // Clear immediately so re-renders don't re-navigate
    setPendingOffer(null);
  }, [pendingOffer?.id]);

  const handleToggle = () => {
    if (isTogglingStatus) return;

    if (isOnline) {
      // Call the API first, navigate only on success
      toggleStatus(false, {
        onSuccess: () => navigation.navigate("RiderOffline"),
        onError: () => {
          // Status already rolled back in the mutation's onError
          // Optionally show a toast here
        },
      });
    } else {
      toggleStatus(true);
    }
  };

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
        initialRegion={DEFAULT_REGION}
        customMapStyle={CUSTOM_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {currentCoords && (
          <Marker
            coordinate={currentCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={!hascentredRef.current}
          >
            <View style={styles.riderMarker}>
              {vehicleType === "bicycle" ? (
                <BicycleSvg width={28} height={28} />
              ) : (
                <EmotoSvg width={28} height={28} />
              )}
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        {/* Online / offline toggle pill */}
        <TouchableOpacity
          style={[styles.pill, !isOnline && styles.pillOffline]}
          onPress={handleToggle}
          activeOpacity={0.85}
          disabled={isTogglingStatus}
        >
          {isTogglingStatus ? (
            <ActivityIndicator
              size="small"
              color={Colors.white}
              style={{ marginRight: 6 }}
            />
          ) : (
            <PowerCircleIcon width={18} height={18} />
          )}
          <Text style={styles.pillText}>
            {isOnline ? "You're online" : "You're offline"}
          </Text>
        </TouchableOpacity>

        {/* Socket connection indicator — small dot, handy in QA/staging */}
        <View
          style={[
            styles.socketDot,
            { backgroundColor: isSocketConnected ? "#4CD964" : "#FF3B30" },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    // SafeAreaView handles the status-bar inset, so we only need a small
    // nudge here — keeps the pill visually clear of the very top edge.
    paddingTop: Platform.OS === "ios" ? 8 : 4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  pillOffline: { backgroundColor: "#EF4444" },
  pillText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },

  socketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    opacity: 0.7,
  },

  riderMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  riderEmoji: { fontSize: 24 },
});




