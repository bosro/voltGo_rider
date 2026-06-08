/**
 * DeliveryCompletedScreen.tsx
 * Reached from: SubmitPhotoScreen → after successful photo submission
 *
 * Layout:
 *  - Full white screen (no map)
 *  - Large animated green checkmark circle (top centre)
 *  - "Delivery Complete!" heading
 *  - Earnings card: "You earned" + GHS amount (large green)
 *  - Summary rows: route, item type, distance
 *  - "Back to Home" navy button
 *  - "View Details" ghost button → ActivityDetailScreen
 *
 * Add to MainStackParamList in types.ts:
 *   DeliveryCompleted: { orderId: string; amount: number; pickupAddress: string; dropoffAddress: string; itemType: string }
 *
 * SVGs needed: check_circle_big.svg (large animated green check)
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { NavyButton, GhostButton } from '../../../components/common';
import { Colors, Typography, Radius, Shadow } from '../../../theme';

const { height } = Dimensions.get('window');

const checkCircleSvg = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#E8FFF2"/>
  <circle cx="50" cy="50" r="36" fill="#4CD964" fill-opacity="0.25"/>
  <circle cx="50" cy="50" r="24" fill="#4CD964"/>
  <path d="M36 50L44 58L64 38" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function DeliveryCompletedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    orderId = 'ord_001',
    amount = 20,
    pickupAddress = 'American House',
    dropoffAddress = 'University of Ghana',
    itemType = 'Parcel',
  } = route.params ?? {};

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBackToHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleViewDetails = () => {
    navigation.navigate('ActivityDetail', {
      activityId: orderId,
      destination: dropoffAddress,
      date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      amount,
      status: 'completed',
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.content}>
        {/* Animated check */}
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
          <SvgXml xml={checkCircleSvg} width={100} height={100} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={styles.heading}>Delivery Complete!</Text>
          <Text style={styles.subheading}>Great job! The package was delivered successfully.</Text>

          {/* Earnings card */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>You earned</Text>
            <Text style={styles.earningsAmount}>GHS {amount}.00</Text>
            <Text style={styles.earningsNote}>Added to your wallet</Text>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <SummaryRow emoji="📦" label="Item" value={itemType} />
            <View style={styles.summaryDivider} />
            <SummaryRow emoji="📍" label="From" value={pickupAddress} />
            <View style={styles.summaryDivider} />
            <SummaryRow emoji="🏁" label="To" value={dropoffAddress} />
          </View>
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <NavyButton label="Back to Home" onPress={handleBackToHome} />
        <GhostButton label="View Details" onPress={handleViewDetails} style={{ marginTop: 10 }} />
      </Animated.View>
    </SafeAreaView>
  );
}

function SummaryRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={sumStyles.row}>
      <Text style={sumStyles.emoji}>{emoji}</Text>
      <Text style={sumStyles.label}>{label}</Text>
      <Text style={sumStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  emoji: { fontSize: 18, width: 26, textAlign: 'center' },
  label: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted, width: 48 },
  value: { flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textPrimary, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: height * 0.06 },
  checkWrap: { marginBottom: 24 },
  heading: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 28, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 0.2 },
  subheading: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  earningsCard: { width: '100%', backgroundColor: Colors.navy, borderRadius: Radius.xl, padding: 24, alignItems: 'center', marginBottom: 16 },
  earningsLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsAmount: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 38, color: Colors.primary, marginBottom: 4 },
  earningsNote: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: 'rgba(255,255,255,0.5)' },

  summaryCard: { width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.lg, paddingHorizontal: 18, paddingVertical: 4 },
  summaryDivider: { height: 1, backgroundColor: Colors.divider },

  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
