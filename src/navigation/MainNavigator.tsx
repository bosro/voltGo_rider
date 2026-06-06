import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SvgProps } from 'react-native-svg';
import { MainStackParamList, MainTabParamList } from './types';
import { Colors } from '../theme';

import HomeMapScreen from '../screens/main/HomeMapScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ActivitiesScreen from '../screens/main/ActivitiesScreen';
import AccountScreen from '../screens/main/AccountScreen';
import DeliveryRequestScreen from '../screens/main/DeliveryRequestScreen';
import EnRoutePickupScreen from '../screens/main/EnRoutePickupScreen';
import PackageCollectedScreen from '../screens/main/PackageCollectedScreen';
import CameraCaptureScreen from '../screens/main/CameraCaptureScreen';
import SubmitPhotoScreen from '../screens/main/SubmitPhotoScreen';

// ── Tab icon imports ───────────────────────────────────────────────
import HomeDefault from '../../assets/icons/tab-home-default.svg';
import HomeActive from '../../assets/icons/tab-home-active.svg';
import WalletDefault from '../../assets/icons/tab-wallet-default.svg';
import WalletActive from '../../assets/icons/tab-wallet-active.svg';
import ActivitiesDefault from '../../assets/icons/tab-activities-default.svg';
import ActivitiesActive from '../../assets/icons/tab-activities-active.svg';
import AccountDefault from '../../assets/icons/tab-account-default.svg';
import AccountActive from '../../assets/icons/tab-account-active.svg';

// ── Tab config ─────────────────────────────────────────────────────
const TABS: {
  name: keyof MainTabParamList;
  IconDefault: React.FC<SvgProps>;
  IconActive: React.FC<SvgProps>;
}[] = [
  { name: 'HomeMap',     IconDefault: HomeDefault,       IconActive: HomeActive },
  { name: 'Wallet',      IconDefault: WalletDefault,     IconActive: WalletActive },
  { name: 'Activities',  IconDefault: ActivitiesDefault, IconActive: ActivitiesActive },
  { name: 'Account',     IconDefault: AccountDefault,    IconActive: AccountActive },
];

// ── BottomTabBar ───────────────────────────────────────────────────
export function BottomTabBar({ state, navigation }: any) {
  return (
    <View style={tabStyles.bar}>
      {TABS.map((tab, index) => {
        const isActive = state.index === index;
        const Icon = isActive ? tab.IconActive : tab.IconDefault;

        return (
          <TouchableOpacity
            key={tab.name}
            style={tabStyles.tab}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Icon width={24} height={24} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF2',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 72 : 58,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

// ── MainTabs ───────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="HomeMap"     component={HomeMapScreen} />
      <Tab.Screen name="Wallet"      component={WalletScreen} />
      <Tab.Screen name="Activities"  component={ActivitiesScreen} />
      <Tab.Screen name="Account"     component={AccountScreen} />
    </Tab.Navigator>
  );
}

// ── MainNavigator ──────────────────────────────────────────────────
const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DeliveryRequest"   component={DeliveryRequestScreen}   options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="EnRoutePickup"     component={EnRoutePickupScreen}     options={{ animation: 'fade',              gestureEnabled: false }} />
      <Stack.Screen name="PackageCollected"  component={PackageCollectedScreen}  options={{ animation: 'fade',              gestureEnabled: false }} />
      <Stack.Screen name="CameraCapture"     component={CameraCaptureScreen}     options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="SubmitPhoto"       component={SubmitPhotoScreen}       options={{ animation: 'slide_from_right',  gestureEnabled: true  }} />
    </Stack.Navigator>
  );
}