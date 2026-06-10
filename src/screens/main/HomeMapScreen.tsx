/**
 * HomeMapScreen.tsx
 *
 * Primary changes vs previous version:
 *  - Order offers now arrive via Socket.IO (order:assigned event)
 *    The useSocket hook in MainNavigator handles this and sets pendingOffer.
 *  - REST polling (useOrderOffers) kept as a FALLBACK for when the
 *    socket is temporarily disconnected — it only fires every 30 s
 *    and is a no-op if the socket is already delivering offers.
 *  - Online/offline toggle → PUT /rider/status (optimistic, with rollback)
 *  - GPS heartbeat → PUT /rider/location every 15 s while online
 *  - Navigates to DeliveryRequest when pendingOffer is set by socket
 */

import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
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
import PowerCircleIcon from "../../../assets/icons/power-circle.svg";
import { Colors, Radius, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useCurrentLocation } from "../../utils/useCurrentLocation";

import { useOrderOffers } from "../../hooks/rider/useOrders";
import {
  useLocationHeartbeat,
  useToggleStatus,
} from "../../hooks/rider/useRider";
import { socketService } from "../../lib/socket";
import { useRiderStore } from "../../store/riderStore";

const DEFAULT_REGION = {
  latitude: 5.603717,
  longitude: -0.186964,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

// Fallback polling interval — much longer than REST-primary since socket handles real-time
const FALLBACK_POLL_MS = 30_000;

export default function HomeMapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const {
    isOnline,
    isTogglingStatus,
    pendingOffer,
    setPendingOffer,
    setCurrentCoords,
  } = useRiderStore();

  const { mutate: toggleStatus } = useToggleStatus();
  const { coords: riderCoords } = useCurrentLocation();

  // Keep Zustand coords synced for the heartbeat hook
  useEffect(() => {
    if (riderCoords) setCurrentCoords(riderCoords);
  }, [riderCoords]);

  // Animate map to rider position once
  useEffect(() => {
    if (riderCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...riderCoords, latitudeDelta: 0.025, longitudeDelta: 0.025 },
        800,
      );
    }
  }, [riderCoords]);

  // Push GPS to server every 15 s while online
  useLocationHeartbeat(isOnline);

  // REST fallback for offers — disabled when socket is connected & online
  useOrderOffers(); // hook internally respects isOnline and uses long staleTime

  // Navigate when an offer arrives (set by socket OR REST polling)
  useEffect(() => {
    if (!pendingOffer) return;
    navigation.navigate("DeliveryRequest", {
      orderId: pendingOffer.id,
      customerName: pendingOffer.customer_name,
      customerPhone: pendingOffer.customer_phone,
      pickupAddress: pendingOffer.pickup_address,
      dropoffAddress: pendingOffer.dropoff_address,
      itemType: pendingOffer.item_type,
      price: pendingOffer.price,
      pickupEta: pendingOffer.pickup_eta ?? 6,
      pickupCoords: pendingOffer.pickup_coords,
      dropoffCoords: pendingOffer.dropoff_coords,
    });
    setPendingOffer(null);
  }, [pendingOffer]);

  const handleToggle = () => {
    if (isTogglingStatus) return;
    const next = !isOnline;
    toggleStatus(next);
    if (!next) navigation.navigate("RiderOffline");
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
        {riderCoords && (
          <Marker
            coordinate={riderCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.riderMarker}>
              <Text style={styles.riderEmoji}>🛵</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
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
            {isOnline ? "Go offline" : "Go online"}
          </Text>
        </TouchableOpacity>

        {/* Socket connection indicator — small dot, useful in dev/QA */}
        <View
          style={[
            styles.socketDot,
            {
              backgroundColor: socketService.isConnected
                ? "#4CD964"
                : "#FF3B30",
            },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  pillOffline: { backgroundColor: Colors.textSecondary },
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
