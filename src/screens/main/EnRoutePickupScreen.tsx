/**
 * EnRoutePickupScreen.tsx — Real API integration
 * "I have arrived" → POST /rider/orders/{id}/arrived
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Radius, Shadow } from '../../theme';
import { MainStackParamList } from '../../navigation/types';
import { useRoutePolyline } from '../../utils/useRoutePolyline';
import CUSTOM_MAP_STYLE from '../../utils/mapStyle';
import { useMarkArrived } from '../../hooks/rider/useOrders';

import PowerCircleIcon from '../../../assets/icons/power-circle.svg';
import UserAvatarIcon from '../../../assets/icons/user-avatar.svg';

// type RouteParams = RouteProp<MainStackParamList, 'EnRoutePickup'>;

const DEFAULT_PICKUP  = { latitude: 5.5968, longitude: -0.1869 };
const DEFAULT_DROPOFF = { latitude: 5.6502, longitude: -0.187 };

export default function EnRoutePickupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mapRef = useRef<MapView>(null);

  const {
    orderId, customerName, customerPhone,
    pickupAddress, dropoffAddress, itemType, price, pickupEta,
    pickupCoords, dropoffCoords,
  } = route.params as any;

  const pickupCoord  = pickupCoords  ?? DEFAULT_PICKUP;
  const dropoffCoord = dropoffCoords ?? DEFAULT_DROPOFF;

  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  const { mutateAsync: markArrived, isPending } = useMarkArrived();

  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: pickupCoord, destination: dropoffCoord, mode: 'TWO_WHEELER',
  });

  useEffect(() => {
    if (!mapRef.current) return;
    const points = routeCoords.length > 0 ? routeCoords : [pickupCoord, dropoffCoord];
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 360, left: 60 }, animated: true,
    });
  }, [routeCoords]);

  const initialRegion = useMemo(() => ({
    latitude:       (pickupCoord.latitude  + dropoffCoord.latitude)  / 2,
    longitude:      (pickupCoord.longitude + dropoffCoord.longitude) / 2,
    latitudeDelta:  Math.abs(pickupCoord.latitude  - dropoffCoord.latitude)  * 4 + 0.02,
    longitudeDelta: Math.abs(pickupCoord.longitude - dropoffCoord.longitude) * 4 + 0.02,
  }), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 62, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleArrived = async () => {
    try {
      await markArrived(orderId);
      navigation.replace('PackageCollected', route.params);
    } catch {
      // Best-effort: still navigate even if API call fails
      navigation.replace('PackageCollected', route.params);
    }
  };

  const displayEta = etaMinutes ?? pickupEta ?? 7;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <MapView
        ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill}
        initialRegion={initialRegion} customMapStyle={CUSTOM_MAP_STYLE}
        scrollEnabled={false} zoomEnabled={false} rotateEnabled={false}
        pitchEnabled={false} showsUserLocation={false} showsMyLocationButton={false}
        showsCompass={false} toolbarEnabled={false}
      >
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={Colors.navy} strokeWidth={4} />
        )}
        <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.pickupDotOuter}><View style={styles.pickupDot} /></View>
        </Marker>
        <Marker coordinate={dropoffCoord} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <View style={styles.dropoffPin}>
            <View style={styles.dropoffCircle} /><View style={styles.dropoffTail} />
          </View>
        </Marker>
        <Marker
          coordinate={{
            latitude:  (pickupCoord.latitude  + dropoffCoord.latitude)  / 2 + 0.005,
            longitude: (pickupCoord.longitude + dropoffCoord.longitude) / 2,
          }}
          anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}
        >
          <View style={styles.etaBadge}><Text style={styles.etaText}>{displayEta} min</Text></View>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.pill}>
          <PowerCircleIcon width={18} height={18} />
          <Text style={styles.pillText}>Go offline</Text>
        </View>
      </SafeAreaView>

      <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.customerRow}>
          <View style={styles.avatarCircle}><UserAvatarIcon width={22} height={24} /></View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
          <Text style={styles.timer}>{displayEta} min</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Pick - up ({displayEta} min away)</Text>
                <Text style={styles.routeValue}>{pickupAddress}</Text>
                <Text style={styles.routeValue}>{itemType}</Text>
              </View>
            </View>
            <View style={styles.dashedLine}>
              {Array.from({ length: 4 }).map((_, i) => <View key={i} style={styles.dashSeg} />)}
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

        <TouchableOpacity style={styles.actionBtn} onPress={handleArrived} activeOpacity={0.88} disabled={isPending}>
          {isPending
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.actionBtnText}>I have arrived</Text>
          }
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pickupDotOuter: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(74,144,226,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  pickupDot: {
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: '#4A90E2', borderWidth: 2.5, borderColor: Colors.white,
  },
  dropoffPin: { alignItems: 'center' },
  dropoffCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.navy },
  dropoffTail: { width: 3, height: 8, backgroundColor: Colors.navy, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  etaBadge: { backgroundColor: Colors.navy, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  etaText: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: Colors.white },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 38, zIndex: 10,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingHorizontal: 18, paddingVertical: 9, gap: 7,
  },
  pillText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.white },
  card: {
    position: 'absolute', bottom: 82, left: 12, right: 12,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.modal,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  customerInfo: { flex: 1 },
  customerName: { fontFamily: 'Poppins-Bold', fontSize: Typography.md, color: Colors.textPrimary },
  customerPhone: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textSecondary },
  timer: { fontFamily: 'Poppins-Bold', fontSize: Typography.lg, color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 12 },
  routeSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  routeLeft: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeEmoji: { fontSize: 18, marginTop: 1 },
  routeTextWrap: { flex: 1 },
  routeLabel: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 18 },
  routeValue: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 17 },
  dashedLine: { marginLeft: 28, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border },
  price: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.md, color: Colors.textPrimary, alignSelf: 'center' },
  actionBtn: {
    backgroundColor: Colors.navy, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.white },
});


