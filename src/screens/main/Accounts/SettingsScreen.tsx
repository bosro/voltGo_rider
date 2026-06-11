import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { Colors, Typography, Radius } from '../../../theme';
import { clearAuthToken } from '../../../utils/authStorage';
import ConfirmModal from '@/components/common/ConfirmModal';


const ABOUT_ITEMS = [
  { label: 'Terms & Conditions', onPress: () => Linking.openURL('https://voltgoapp.com/terms') },
  { label: 'Privacy Policy',     onPress: () => Linking.openURL('https://voltgoapp.com/privacy') },
  // { label: 'Licences',           onPress: () => {} },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const fadeIn     = useRef(new Animated.Value(0)).current;

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutLoading,      setLogoutLoading]      = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    await clearAuthToken();
    setLogoutLoading(false);
    setLogoutModalVisible(false);
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }));
  };

  const handleDeleteConfirm = async () => {
    // TODO: wire up delete-account API call
    await clearAuthToken();
    setDeleteModalVisible(false);
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../../../assets/icons/back-arrow.png')}
            style={styles.backArrow}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* About section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          {ABOUT_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, index < ABOUT_ITEMS.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Image
                source={require('../../../../assets/icons/chevron-right.png')}
                style={styles.chevron}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={styles.version}>VoltGo v1.0.0</Text>

        {/* Log out */}
        {/* <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity> */}

        <View style={{ height: 16 }} />

        {/* Delete account */}
        <TouchableOpacity
          style={styles.dangerBtn}
          activeOpacity={0.8}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={styles.dangerText}>Delete account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Logout modal */}
      <ConfirmModal
        visible={logoutModalVisible}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        variant="danger"
        loading={logoutLoading}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* Delete account modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete account"
        message="This will permanently delete your account and all your data. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 14,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { width: 20, height: 18 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'HelveticaNeue-CondensedBold',
    fontSize: 19,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  headerSpacer: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    color: Colors.navy,
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chevron: { width: 8, height: 14 },

  version: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },

  logoutBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 17,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: Colors.textPrimary,
  },

  dangerBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E05252',
    paddingVertical: 17,
    alignItems: 'center',
  },
  dangerText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#E05252',
  },
});