import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import StandaloneTabBar from "../../components/navigation/BottomTabBar";
import { Colors, Typography, Radius, lightMapStyle } from "../../theme";

import PowerCircleIcon from "../../../assets/icons/power-circle.svg";

const RIDER_COORD = { latitude: 5.589, longitude: -0.19 };
const INITIAL_REGION = {
  latitude: 5.5968,
  longitude: -0.178,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

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
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      setIsOnline(true); // re-enable online when returning from RiderOffline
    }, []),
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        customMapStyle={lightMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <Marker coordinate={RIDER_COORD} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.riderMarker}>
            <Text style={{ fontSize: 28 }}>🛵</Text>
          </View>
        </Marker>
      </MapView>

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

      <View style={styles.tabWrap}>
        <StandaloneTabBar activeTab="HomeMap" />
      </View>
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
  tabWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
});
