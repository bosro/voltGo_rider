/**
 * RiderOfflineScreen.tsx
 * Shown as a modal/overlay when rider taps "Go offline" on HomeMapScreen
 *
 * Layout:
 *  - Centred content (no map)
 *  - Moon / sleeping icon
 *  - "You're Offline" heading
 *  - "You won't receive new orders while offline" subtitle
 *  - Today's earnings mini-card
 *  - "Go back online" green button
 *  - "Stay offline" ghost button
 *
 * How to use:
 *  In HomeMapScreen, instead of just toggling isOnline state,
 *  navigate to this screen when going offline:
 *
 *  const handleToggleOffline = () => {
 *    if (isOnline) navigation.navigate('RiderOffline');
 *    else setIsOnline(true);
 *  };
 *
 * Add to MainStackParamList in types.ts:
 *   RiderOffline: undefined;
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import {  GhostButton } from '../../../components/common';
import { Colors, Typography, Radius } from '../../../theme';

const { height } = Dimensions.get('window');

const moonSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="40" fill="#F0F2F5"/>
  <path d="M52 44C48.7 46.4 44.5 47.6 40 47C30.6 45.4 24.2 36.4 25.6 27C26.2 23.1 28.1 19.8 30.5 17.5C24.4 20.3 20.2 26.7 21.2 34C22.4 42.8 31 48.8 39.8 47.6C44.5 47 48.4 44.6 50.8 41.1C51.2 41.9 51.7 42.9 52 44Z" fill="#0D2240"/>
  <circle cx="58" cy="20" r="3" fill="#4CD964"/>
  <circle cx="52" cy="12" r="2" fill="#4CD964"/>
  <circle cx="62" cy="28" r="1.5" fill="#4CD964"/>
</svg>`;

const TODAY_EARNINGS = { deliveries: 4, amount: 88 };

export default function RiderOfflineScreen() {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 58, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoOnline = () => {
    navigation.goBack(); // returns to HomeMapScreen which re-enables online mode
  };

  const handleStayOffline = () => {
    // Stay on this screen or go to a different app section
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Icon */}
        <SvgXml xml={moonSvg} width={80} height={80} style={styles.icon} />

        {/* Text */}
        <Text style={styles.heading}>You're Offline</Text>
        <Text style={styles.subheading}>
          You won't receive new delivery{'\n'}orders while you're offline.
        </Text>

        {/* Today's earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsValue}>{TODAY_EARNINGS.deliveries}</Text>
              <Text style={styles.earningsLabel}>Deliveries today</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsValue}>GHS {TODAY_EARNINGS.amount}</Text>
              <Text style={styles.earningsLabel}>Earned today</Text>
            </View>
          </View>
        </View>

        {/* Status pill */}
        <View style={styles.statusPill}>
          <View style={styles.offlineDot} />
          <Text style={styles.statusText}>Offline</Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.goOnlineBtn} onPress={handleGoOnline} activeOpacity={0.88}>
          <Text style={styles.goOnlineText}>Go back online</Text>
        </TouchableOpacity>
        <GhostButton label="Stay offline" onPress={handleStayOffline} style={{ marginTop: 10 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  icon: { marginBottom: 24 },
  heading: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 28, color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  subheading: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  earningsCard: { width: '100%', backgroundColor: Colors.inputBg, borderRadius: Radius.xl, padding: 20, marginBottom: 24 },
  earningsRow: { flexDirection: 'row', alignItems: 'center' },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsValue: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xxl, color: Colors.textPrimary, marginBottom: 2 },
  earningsLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  earningsDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F5F5', borderRadius: Radius.full, paddingHorizontal: 18, paddingVertical: 8 },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
  statusText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textMuted },

  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  goOnlineBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 17, alignItems: 'center' },
  goOnlineText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.lg, color: Colors.textPrimary },
});
