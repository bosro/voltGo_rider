import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  Animated, Alert, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GhostButton } from '../../components/common';
import { Colors, Typography, Radius } from '../../theme';

import FaceIdIcon from '../../../assets/icons/face-id.svg';
import FingerprintIcon from '../../../assets/icons/fingerprint.svg';

const { height } = Dimensions.get('window');
const BIOMETRIC_KEY = '@voltgo_biometric_enabled';

export default function BiometricSetupScreen() {
  const navigation = useNavigation<any>();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUseBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Not supported', 'Your device does not support biometric authentication.', [
          { text: 'OK', onPress: () => navigation.replace('MainApp') },
        ]);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'No biometrics set up',
          'Please set up Face ID or Touch ID in your device Settings first, then come back.',
          [{ text: 'OK', onPress: () => navigation.replace('MainApp') }],
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to VoltGo Rider',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
        navigation.replace('MainApp');
      } else if (result.error === 'user_cancel') {
        // stay on screen
      } else {
        Alert.alert(
          'Authentication failed',
          'Biometric sign-in failed. You can enable it later in Settings.',
          [{ text: 'OK', onPress: () => navigation.replace('MainApp') }],
        );
      }
    } catch (error) {
      console.warn('Biometric error:', error);
      navigation.replace('MainApp');
    }
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
          Use your device's biometric to sign in the{'\n'}next time you open VoltGo App.
        </Text>
      </Animated.View>
      <View style={styles.footer}>
        <GhostButton label="Use Biometric" onPress={handleUseBiometric} style={styles.btn} />
        <GhostButton label="Remind me later" onPress={() => navigation.replace('MainApp')} style={[styles.btn, { marginTop: 10 }]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, alignItems: 'center', paddingTop: height * 0.1, paddingHorizontal: 28 },
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