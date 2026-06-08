/**
 * ActivityDetailScreen.tsx
 * Reached from: ActivitiesScreen → tap any delivery row
 * Also reached from: WalletScreen → History → tap any earning row
 *
 * Layout:
 *  - Back header + "Delivery Details" title
 *  - Status badge (Completed / Cancelled)
 *  - Map preview card (static small map showing the route)
 *  - Order info section: customer name, phone, item type, weight
 *  - Route section: pickup → dropoff with dashed connector
 *  - Earnings card: amount earned, date & time
 *  - "Proof of delivery" photo thumbnail (if available)
 *
 * Params passed via navigation:
 *   { activityId, destination, date, amount, status }
 *
 * SVGs needed: back_arrow.svg, parcel_box_sm.svg, pin_dropoff.svg, check_badge.svg
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Image, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { Colors, Typography, Radius, Shadow } from '@/theme';

const { width } = Dimensions.get('window');

// Add 'ActivityDetail' to your MainStackParamList in types.ts:
// ActivityDetail: { activityId: string; destination: string; date: string; amount: number; status: 'completed' | 'cancelled' };

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const checkBadgeSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8" fill="#4CD964"/><path d="M4.5 8L6.5 10L11 5.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const cancelBadgeSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8" fill="#E53E3E"/><path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`;

// Demo static data — in production derive from route.params.activityId API call
const DEMO_DETAIL = {
  orderId: '#ORD-20260520-001',
  customerName: 'Cephas Ntiamoah',
  customerPhone: '0575 540 404',
  itemType: 'Parcel',
  weight: 'Light weight',
  pickupAddress: 'American House, Haatso',
  dropoffAddress: 'University of Ghana, Legon',
  distance: '6.2 km',
  duration: '18 min',
  proofPhotoUri: null as string | null, // replace with real URI
};

export default function ActivityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { destination = 'University of Ghana', date = '20 May . 12:34', amount = 24, status = 'completed' } = route.params ?? {};

  const isCompleted = status === 'completed';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status badge */}
        <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusCancelled]}>
          <SvgXml xml={isCompleted ? checkBadgeSvg : cancelBadgeSvg} width={16} height={16} />
          <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : styles.statusTextCancelled]}>
            {isCompleted ? 'Completed' : 'Cancelled'}
          </Text>
        </View>

        {/* Map preview placeholder */}
        <View style={styles.mapPreview}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapHint}>Route: {DEMO_DETAIL.pickupAddress} → {DEMO_DETAIL.dropoffAddress}</Text>
          {/* Replace with a real static MapView snapshot or react-native-maps */}
        </View>

        {/* Order info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Order Info</Text>
          <InfoRow label="Order ID" value={DEMO_DETAIL.orderId} />
          <InfoRow label="Customer" value={DEMO_DETAIL.customerName} />
          <InfoRow label="Phone" value={DEMO_DETAIL.customerPhone} />
          <InfoRow label="Item type" value={DEMO_DETAIL.itemType} />
          <InfoRow label="Weight" value={DEMO_DETAIL.weight} />
          <InfoRow label="Date & time" value={date} />
        </View>

        {/* Route */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeEmoji}>📦</Text>
            <View>
              <Text style={styles.routeType}>Pick-up</Text>
              <Text style={styles.routeAddress}>{DEMO_DETAIL.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.dashedLine}>{Array.from({ length: 4 }).map((_, i) => <View key={i} style={styles.dashSeg} />)}</View>
          <View style={styles.routeRow}>
            <Text style={styles.routeEmoji}>📍</Text>
            <View>
              <Text style={styles.routeType}>Drop-off</Text>
              <Text style={styles.routeAddress}>{DEMO_DETAIL.dropoffAddress}</Text>
            </View>
          </View>
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{DEMO_DETAIL.distance}</Text>
              <Text style={styles.routeStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{DEMO_DETAIL.duration}</Text>
              <Text style={styles.routeStatLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Earnings */}
        <View style={[styles.infoCard, styles.earningsCard]}>
          <View>
            <Text style={styles.earningsLabel}>You earned</Text>
            <Text style={styles.earningsAmount}>GHS {amount}.00</Text>
          </View>
          <Text style={styles.earningsEmoji}>💰</Text>
        </View>

        {/* Proof of delivery */}
        {DEMO_DETAIL.proofPhotoUri && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Proof of Delivery</Text>
            <Image source={{ uri: DEMO_DETAIL.proofPhotoUri }} style={styles.proofPhoto} resizeMode="cover" />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  value: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14, backgroundColor: Colors.white },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7, gap: 6, marginBottom: 16 },
  statusCompleted: { backgroundColor: '#E8FFF2' },
  statusCancelled: { backgroundColor: '#FFF0F0' },
  statusText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm },
  statusTextCompleted: { color: Colors.trendUp },
  statusTextCancelled: { color: Colors.errorRed },

  mapPreview: { height: 140, backgroundColor: Colors.navy, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mapEmoji: { fontSize: 36, marginBottom: 8 },
  mapHint: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 20 },

  infoCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 12, ...Shadow.card },
  cardTitle: { fontFamily: 'Poppins-Bold', fontSize: Typography.base, color: Colors.textPrimary, marginBottom: 12 },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  routeEmoji: { fontSize: 20, width: 24, textAlign: 'center' },
  routeType: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textPrimary },
  routeAddress: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  dashedLine: { marginLeft: 12, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border, marginLeft: 3 },
  routeStats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.divider },
  routeStat: { flex: 1, alignItems: 'center' },
  routeStatValue: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  routeStatLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  routeStatDivider: { width: 1, backgroundColor: Colors.divider },

  earningsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  earningsLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textSecondary },
  earningsAmount: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 28, color: Colors.trendUp, marginTop: 2 },
  earningsEmoji: { fontSize: 36 },

  proofPhoto: { width: '100%', height: 180, borderRadius: Radius.md, marginTop: 4 },
});
