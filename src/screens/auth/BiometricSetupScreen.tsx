/**
 * BiometricSetupScreen.tsx
 *
 * Shown after:
 *  - New KYC registration (after CreateProfileStep4)
 *  - From Security settings screen
 *
 * Flow:
 *  "Use Biometric" → check hardware → prompt auth → save flag → NotificationPermission
 *  "Remind me later" → skip → NotificationPermission (or back if from Settings)
 *
 * The flag @voltgo_biometric_enabled = 'true' is read in SplashScreen
 * to trigger the biometric login prompt on subsequent app opens.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  Animated, Alert, Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GhostButton, NavyButton } from '../../components/common';
import { Colors, Typography, Radius } from '../../theme';

import FaceIdIcon from '../../../assets/icons/face-id.svg';
import FingerprintIcon from '../../../assets/icons/fingerprint.svg';

const { height } = Dimensions.get('window');
export const BIOMETRIC_KEY = '@voltgo_biometric_enabled';

export default function BiometricSetupScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();

  // fromSettings = true when navigated from SecurityScreen
  const fromSettings = route.params?.fromSettings ?? false;

  const fadeIn   = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,   { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const proceed = () => {
    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.replace('NotificationPermission');
    }
  };

  const handleUseBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          'Not supported',
          'Your device does not support biometric authentication.',
          [{ text: 'OK', onPress: proceed }],
        );
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'No biometrics set up',
          'Please set up Face ID or Touch ID in your device Settings first.',
          [{ text: 'OK', onPress: proceed }],
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         'Enable biometric sign-in for VoltGo',
        fallbackLabel:         'Use passcode',
        cancelLabel:           'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Persist the flag — SplashScreen reads this on next boot
        await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
        Alert.alert(
          'Biometric enabled ✓',
          "You'll be signed in automatically next time you open the app.",
          [{ text: 'Continue', onPress: proceed }],
        );
      } else if (result.error === 'user_cancel') {
        // Rider tapped cancel — stay on screen, let them decide
      } else {
        Alert.alert(
          'Authentication failed',
          'Biometric sign-in could not be set up. You can try again in Settings.',
          [{ text: 'OK', onPress: proceed }],
        );
      }
    } catch (error) {
      console.warn('Biometric error:', error);
      proceed();
    }
  };

  const handleSkip = async () => {
    // Make sure the flag is cleared if they're re-visiting from Settings
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
    proceed();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.faceIdCard}>
            <FaceIdIcon width={88} height={88} />
          </View>
          <View style={styles.fingerprintCard}>
            <FingerprintIcon width={88} height={88} />
          </View>
        </Animated.View>

        <Text style={styles.heading}>Make Sign-in Easier</Text>
        <Text style={styles.body}>
          Use your device's biometric to sign in{'\n'}
          next time you open the VoltGo app.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <NavyButton
          label="Use Biometric"
          onPress={handleUseBiometric}
          style={styles.btn}
        />
        <GhostButton
          label={fromSettings ? 'Disable & go back' : 'Remind me later'}
          onPress={handleSkip}
          style={[styles.btn, { marginTop: 10 }]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1, alignItems: 'center',
    paddingTop: height * 0.1, paddingHorizontal: 28,
  },
  iconWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28, height: 100, width: 160, position: 'relative',
  },
  faceIdCard: {
    position: 'absolute', left: 0, zIndex: 1, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
  },
  fingerprintCard: {
    position: 'absolute', right: 0, zIndex: 2, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  heading: {
    fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 24,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 12, letterSpacing: 0.1,
  },
  body: {
    fontFamily: 'Poppins-Regular', fontSize: Typography.base,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 23,
  },
  footer: { paddingHorizontal: 22, paddingBottom: 32 },
  btn: { marginHorizontal: 0 },
});
