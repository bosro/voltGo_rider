import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
// import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Colors, Typography, Radius, lightMapStyle } from "../../theme";
import PowerCircleIcon from "../../../assets/icons/power-circle.svg";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeMapScreen() {
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isOnline) return;
    const timer = setTimeout(() => {
      navigation.navigate("DeliveryRequest", {
        orderId: "ord_001",
        customerName: "Cephas Ntiamoah",
        customerPhone: "0575540404",
        pickupAddress: "American House",
        dropoffAddress: "American House",
        itemType: "Parcel",
        price: 20,
        pickupEta: 6,
      });
    }, 20000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      setIsOnline(true);
    }, []),
  );

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
        initialRegion={{
          latitude: 5.5968,
          longitude: -0.178,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        customMapStyle={lightMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <Marker coordinate={{ latitude: 5.589, longitude: -0.19 }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.riderMarker}>
            <Text style={{ fontSize: 28 }}>🛵</Text>
          </View>
        </Marker>
      </MapView>
      ───────────────────────────────────────────────────────────────────── */}

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.pill, !isOnline && styles.pillOffline]}
          onPress={() => {
            if (isOnline) {
              setIsOnline(false);
              navigation.navigate("RiderOffline");
            } else {
              setIsOnline(true);
            }
          }}
          activeOpacity={0.85}
        >
          <PowerCircleIcon width={18} height={18} />
          <Text style={styles.pillText}>
            {isOnline ? "Go offline" : "Go online"}
          </Text>
        </TouchableOpacity>
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
});
