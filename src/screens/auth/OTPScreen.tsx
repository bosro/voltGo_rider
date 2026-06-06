import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Dimensions, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NavyButton } from '../../components/common';
import { Colors, Typography, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { saveAuthToken } from '../../navigation/RootNavigator';

const { height } = Dimensions.get('window');
const OTP_LENGTH = 6;
type RouteParams = RouteProp<RootStackParamList, 'OTP'>;

export default function OTPScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { phone } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 58, friction: 10, useNativeDriver: true }),
    ]).start();
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleContinue = async () => {
    if (otp.join('').length === OTP_LENGTH) {
      await saveAuthToken('voltgo_rider_token_demo');
      navigation.navigate('CreateProfileStep1');
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(30);
    setCanResend(false);
    inputRefs.current[0]?.focus();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={styles.hero}>
        <Image
          source={require('../../../assets/images/onboarding3.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>
      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.heading}>Enter the 6-digit code</Text>
        <Text style={styles.subtitle}>Check your SMS or Whatsapp for the code</Text>
        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={ref => {inputRefs.current[i] = ref}}
              style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : null]}
              value={otp[i]}
              onChangeText={text => handleChange(text, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>
        <TouchableOpacity onPress={handleResend} disabled={!canResend}>
          <Text style={[styles.resend, canResend && styles.resendActive]}>
            {canResend ? 'Resend code' : `Resend in ${countdown}`}
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.differentMethod}>Try a different method</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <NavyButton label="Continue" onPress={handleContinue} disabled={otp.join('').length < OTP_LENGTH} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  hero: {
    marginHorizontal: 14, marginTop: 10, height: 200,
    borderRadius: 22, overflow: 'hidden', backgroundColor: Colors.navy,
  },
  heroImage: { width: '100%', height: '100%' },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 30 },
  heading: {
    fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 24,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular', fontSize: Typography.base,
    color: Colors.textSecondary, textAlign: 'center', marginBottom: 24,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  otpBox: {
    flex: 1, height: 56, backgroundColor: Colors.otpBg, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.otpBorder,
    fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 22, color: Colors.textPrimary,
  },
  otpBoxFilled: { borderColor: Colors.navy, backgroundColor: Colors.white },
  resend: {
    fontFamily: 'Poppins-SemiBold', fontSize: Typography.base,
    color: Colors.textSecondary, marginBottom: 14,
  },
  resendActive: { color: Colors.navy, textDecorationLine: 'underline' },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 14 },
  differentMethod: {
    fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.textLink,
  },
});