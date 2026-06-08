import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Animated, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavyButton } from '../../components/common';
import { Colors, Typography, Radius } from '../../theme';

import GhanaFlag from '../../../assets/icons/flag-ghana.svg';
import ChevronDown from '../../../assets/icons/chevron-down-sm.svg';
import GoogleIcon from '../../../assets/icons/google.svg';
import AppleIcon from '../../../assets/icons/apple.svg';
import BiometricIcon from '../../../assets/icons/fingerprint.svg';

export default function PhoneEntryScreen() {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 58, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (phone.trim().length >= 9) {
      navigation.navigate('OTP', { phone: `+233${phone}` });
    }
  };

  const socialOptions = [
    { Icon: GoogleIcon,    w: 22, h: 22, label: 'Sign in with Google', onPress: () => {} },
    { Icon: AppleIcon,     w: 20, h: 24, label: 'Sign in with Apple',  onPress: () => {} },
    { Icon: BiometricIcon, w: 22, h: 22, label: 'Biometric Sign in',   onPress: () => navigation.navigate('BiometricSetup') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/images/onboarding2.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.heading}>Enter your number</Text>
          <Text style={styles.subtitle}>
            We will send you a verification code on this{'\n'}number as SMS.
          </Text>

          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countryPicker} activeOpacity={0.8}>
              <GhanaFlag width={24} height={24} />
              <ChevronDown width={12} height={8} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <View style={styles.phoneInputWrap}>
              <Text style={styles.countryCode}>+233</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={Colors.textPlaceholder}
              />
            </View>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.orLine} />
          </View>

          {socialOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.socialRow}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <item.Icon width={item.w} height={item.h} style={{ marginRight: 12 }} />
              <Text style={styles.socialLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 20 }} />
          <NavyButton label="Continue" onPress={handleContinue} />
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>terms and{'\n'}conditions and privacy policies</Text>.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  hero: {
    marginHorizontal: 14, marginTop: 10, height: 220,
    borderRadius: 22, overflow: 'hidden', backgroundColor: Colors.navy,
  },
  heroImage: { width: '100%', height: '100%' },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 },
  heading: {
    fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 24,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular', fontSize: Typography.base,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 18,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 18, gap: 10,
  },
  countryPicker: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 10, borderRightWidth: 1, borderRightColor: Colors.border, gap: 4,
  },
  phoneInputWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  countryCode: {
    fontFamily: 'Poppins-Regular', fontSize: Typography.base,
    color: Colors.textPrimary, marginRight: 6,
  },
  phoneInput: {
    flex: 1, fontFamily: 'Poppins-Regular',
    fontSize: Typography.base, color: Colors.textPrimary, padding: 0,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  orText: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textMuted },
  socialRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, paddingVertical: 15, paddingHorizontal: 20,
    marginBottom: 12, backgroundColor: Colors.white,
  },
  socialLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textPrimary },
  terms: {
    fontFamily: 'Poppins-Regular', fontSize: Typography.sm,
    color: Colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: 14,
  },
  termsLink: { color: Colors.textSecondary, textDecorationLine: 'underline' },
});