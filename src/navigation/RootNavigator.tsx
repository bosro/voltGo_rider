import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './types';

import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';
import { CreateProfileStep1Screen, CreateProfileStep2Screen, CreateProfileStep3Screen, CreateProfileStep4Screen } from '../screens/profile/CreateProfileScreens';
import MainNavigator from './MainNavigator';

export const AUTH_TOKEN_KEY = '@voltgo_rider_token';

export async function saveAuthToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}
export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_TOKEN_KEY)
      .then(token => setIsLoggedIn(!!token))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return null;

  return (
    <Stack.Navigator
      initialRouteName={isLoggedIn ? 'MainApp' : 'Splash'}
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
      <Stack.Screen name="OTP" component={OTPScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
      <Stack.Screen name="CreateProfileStep1" component={CreateProfileStep1Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateProfileStep2" component={CreateProfileStep2Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateProfileStep3" component={CreateProfileStep3Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateProfileStep4" component={CreateProfileStep4Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="MainApp" component={MainNavigator} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}


