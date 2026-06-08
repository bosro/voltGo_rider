/**
 * SettingsScreen.tsx
 * Reached from: AccountScreen → "Settings"
 *
 * Layout:
 *  - Back header + "Settings" title
 *  - Language selector row (dropdown)
 *  - Dark mode toggle (UI-only for now)
 *  - App version info row
 *  - "Rate the app" row
 *  - "Log out" red row at bottom
 *
 * SVGs needed: back_arrow.svg, globe_language.svg, moon_dark.svg,
 *              star_rate.svg, info_circle.svg, logout_door.svg, chevron_right.svg
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Switch, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { CommonActions } from '@react-navigation/native';
import { Colors, Typography, Radius } from '../../../theme';
import { clearAuthToken } from '../../../navigation/RootNavigator';

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const globeSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" stroke="#0D2240" stroke-width="1.5" fill="none"/><path d="M10 1C10 1 7 5 7 10C7 15 10 19 10 19" stroke="#0D2240" stroke-width="1.2"/><path d="M10 1C10 1 13 5 13 10C13 15 10 19 10 19" stroke="#0D2240" stroke-width="1.2"/><path d="M1 10H19" stroke="#0D2240" stroke-width="1.2"/></svg>`;
const moonSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 13C13.3 14 11.2 14.5 9 14C4.6 13 1.5 8.9 2 4.5C2.3 2.3 3.3 0.7 4.5 0C1.5 1.5 -0.5 5 0.2 9C1 13.5 5.5 16.7 10 16C12.2 15.7 14 14.5 15 13Z" stroke="#0D2240" stroke-width="1.5" fill="none"/></svg>`;
const starSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1L12.4 7.3H19L13.8 11.2L15.8 17.5L10 13.6L4.2 17.5L6.2 11.2L1 7.3H7.6L10 1Z" stroke="#0D2240" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>`;
const infoSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" stroke="#0D2240" stroke-width="1.5" fill="none"/><path d="M10 9V14" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="6" r="1" fill="#0D2240"/></svg>`;
const logoutSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3H3C2.4 3 2 3.4 2 4V16C2 16.6 2.4 17 3 17H7" stroke="#E53E3E" stroke-width="1.5" stroke-linecap="round"/><path d="M13 14L18 10L13 6" stroke="#E53E3E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 10H7" stroke="#E53E3E" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const chevronRightSvg = `<svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L7 7L1 13" stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const LANGUAGES = ['English', 'Twi', 'Ga', 'Ewe', 'Hausa'];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');

  const cycleLanguage = () => {
    const idx = LANGUAGES.indexOf(language);
    setLanguage(LANGUAGES[(idx + 1) % LANGUAGES.length]);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await clearAuthToken();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }));
      }},
    ]);
  };

  const Row = ({ icon, label, right, onPress, danger = false }: { icon: string; label: string; right: React.ReactNode; onPress?: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View style={styles.rowLeft}>
        <View style={styles.iconCircle}><SvgXml xml={icon} width={20} height={20} /></View>
        <Text style={[styles.rowLabel, danger && { color: Colors.errorRed }]}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>

        <Row icon={globeSvg} label="Language" onPress={cycleLanguage}
          right={<View style={styles.langPill}><Text style={styles.langText}>{language}</Text><SvgXml xml={chevronRightSvg} width={6} height={10} /></View>} />
        <View style={styles.divider} />

        <Row icon={moonSvg} label="Dark Mode"
          right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.white} />} />
        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ABOUT</Text>

        <Row icon={starSvg} label="Rate the app" onPress={() => Linking.openURL('https://play.google.com')}
          right={<SvgXml xml={chevronRightSvg} width={8} height={14} />} />
        <View style={styles.divider} />

        <Row icon={infoSvg} label="App Version" right={<Text style={styles.versionText}>v1.0.0</Text>} />
        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>

        <Row icon={logoutSvg} label="Log out" onPress={handleLogout} danger
          right={<SvgXml xml={chevronRightSvg} width={8} height={14} />} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  sectionLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.divider },
  langPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, gap: 6 },
  langText: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textSecondary },
  versionText: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
});
