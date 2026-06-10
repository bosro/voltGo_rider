/**
 * SecurityScreen.tsx
 * Biometric toggle is now REAL — reads/writes @voltgo_biometric_enabled
 * and navigates to BiometricSetupScreen when enabling.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Switch, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export const BIOMETRIC_KEY = '@voltgo_biometric_enabled';

const backArrowSvg   = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const fingerprintSvg = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M8 2C5 3 3 6 3 9" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2C17 3 19 6 19 9" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><path d="M3 14C3 17 5 20 8 21" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><path d="M19 14C19 17 17 20 14 21" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><path d="M7 11C7 9 8.8 7.5 11 7.5C13.2 7.5 15 9 15 11C15 13.5 13 15 11 16C9 15 7 13.5 7 11Z" stroke="#0D2240" stroke-width="1.3" fill="none"/></svg>`;
const bellSvg        = `<svg width="20" height="22" viewBox="0 0 20 22" fill="none"><path d="M10 2C10 2 4 4 4 11V16H16V11C16 4 10 2 10 2Z" stroke="#0D2240" stroke-width="1.5" fill="none"/><path d="M2 16H18" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><path d="M8 16C8 17.1 8.9 18 10 18C11.1 18 12 17.1 12 16" stroke="#0D2240" stroke-width="1.5" fill="none"/></svg>`;
const lockSvg        = `<svg width="18" height="22" viewBox="0 0 18 22" fill="none"><rect x="2" y="10" width="14" height="11" rx="2" stroke="#0D2240" stroke-width="1.5" fill="none"/><path d="M5 10V7C5 4.8 6.8 3 9 3C11.2 3 13 4.8 13 7V10" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="15" r="1.5" fill="#0D2240"/></svg>`;
const deviceSvg      = `<svg width="18" height="22" viewBox="0 0 18 22" fill="none"><rect x="3" y="1" width="12" height="20" rx="2" stroke="#0D2240" stroke-width="1.5" fill="none"/><circle cx="9" cy="18" r="1" fill="#0D2240"/></svg>`;
const chevronRightSvg= `<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1L7 7L1 13" stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function SecurityScreen() {
  const navigation = useNavigation<any>();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushEnabled,      setPushEnabled]      = useState(true);

  // Read persisted biometric flag on mount
  useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_KEY).then((val) => {
      setBiometricEnabled(val === 'true');
    });
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Navigate to setup flow — it will save the flag on success
      navigation.navigate('BiometricSetup', { fromSettings: true });
      // Optimistic: read flag again when we come back
      const unsubscribe = navigation.addListener('focus', async () => {
        const val = await AsyncStorage.getItem(BIOMETRIC_KEY);
        setBiometricEnabled(val === 'true');
        unsubscribe();
      });
    } else {
      // Disable immediately
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      setBiometricEnabled(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Account',
      'This will permanently deactivate your rider account. All earnings must be withdrawn first. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AUTHENTICATION</Text>

        {/* Biometric toggle — REAL */}
        <View style={styles.toggleRow}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}><SvgXml xml={fingerprintSvg} width={22} height={22} /></View>
            <View>
              <Text style={styles.rowTitle}>Biometric Sign-in</Text>
              <Text style={styles.rowSubtitle}>Face ID / Touch ID</Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
        <View style={styles.divider} />

        {/* Push notifications toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}><SvgXml xml={bellSvg} width={20} height={22} /></View>
            <View>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>Order alerts & updates</Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
        <View style={styles.divider} />

        {/* Change PIN */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Change PIN', 'Coming soon.')}
          activeOpacity={0.75}
        >
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}><SvgXml xml={lockSvg} width={18} height={22} /></View>
            <Text style={styles.rowTitle}>Change PIN</Text>
          </View>
          <SvgXml xml={chevronRightSvg} width={8} height={14} />
        </TouchableOpacity>
        <View style={styles.divider} />

        {/* Active Sessions */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Active Sessions', 'Coming soon.')}
          activeOpacity={0.75}
        >
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}><SvgXml xml={deviceSvg} width={18} height={22} /></View>
            <Text style={styles.rowTitle}>Active Sessions</Text>
          </View>
          <SvgXml xml={chevronRightSvg} width={8} height={14} />
        </TouchableOpacity>
      </View>

      <View style={styles.dangerZone}>
        <TouchableOpacity onPress={handleDeactivate} activeOpacity={0.75}>
          <Text style={styles.deactivateText}>Deactivate Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  section: { paddingHorizontal: 22, paddingTop: 8 },
  sectionLabel: { fontFamily: 'Poppins-Regular', fontSize: 11, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textPrimary },
  rowSubtitle: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.divider },
  dangerZone: { paddingHorizontal: 22, paddingTop: 32 },
  deactivateText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.errorRed, textAlign: 'center' },
});
