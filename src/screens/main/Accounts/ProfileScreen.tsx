/**
 * ProfileScreen.tsx — Real API integration
 * Reads from Zustand authStore and saves via PATCH /rider/me (when backend adds it)
 * For now wires to GET /rider/me to stay fresh and update local state.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { NavyButton, InputField, FieldLabel } from '../../../components/common';
import { Colors, Typography, Radius } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';
import { useRiderProfile } from '../../../hooks/rider/useRider';

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const cameraEditSvg = `<svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1H10L11.5 3H14C14.8 3 15.5 3.7 15.5 4.5V12C15.5 12.8 14.8 13.5 14 13.5H2C1.2 13.5 0.5 12.8 0.5 12V4.5C0.5 3.7 1.2 3 2 3H4.5L6 1Z" stroke="white" stroke-width="1.3" fill="none"/><circle cx="8" cy="8" r="2.5" stroke="white" stroke-width="1.3" fill="none"/></svg>`;
const userProfileSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="5" r="4" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 19C1 15.7 5.1 13 9 13C12.9 13 17 15.7 17 19" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;
const emailSvg = `<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="18" height="14" rx="2" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 4L10 9L19 4" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const phoneSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="1" width="14" height="18" rx="3" stroke="#5A6478" stroke-width="1.5" fill="none"/><circle cx="9" cy="16" r="1" fill="#5A6478"/></svg>`;

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { rider, updateRider } = useAuthStore();
  const { isLoading } = useRiderProfile();

  const [name,      setName]      = useState(rider?.name  ?? '');
  const [email,     setEmail]     = useState(rider?.email ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(rider?.avatar_url ?? null);

  // Sync form if Zustand updates (e.g. background refresh)
  useEffect(() => {
    if (rider) {
      setName(rider.name ?? '');
      setEmail(rider.email ?? '');
      setAvatarUri(rider.avatar_url ?? null);
    }
  }, [rider?.id]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    // Optimistic local update — when backend exposes PATCH /rider/me we'll call it here
    updateRider({ name, email: email || undefined });
    Alert.alert('Saved', 'Profile updated successfully.');
    navigation.goBack();
  };

  if (isLoading && !rider) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatar} />
              : <Text style={styles.avatarEmoji}>👤</Text>
            }
          </View>
          <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar} activeOpacity={0.85}>
            <SvgXml xml={cameraEditSvg} width={16} height={14} />
          </TouchableOpacity>
        </View>

        <FieldLabel label="Full Name" />
        <InputField iconSvg={userProfileSvg} placeholder="Enter full name" value={name} onChangeText={setName} autoCapitalize="words" />

        <FieldLabel label="Phone Number" />
        <InputField iconSvg={phoneSvg} placeholder="+233 ..." value={rider?.phone ?? ''} editable={false} style={styles.readOnly} />

        <FieldLabel label="Email" />
        <InputField iconSvg={emailSvg} placeholder="Enter email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <View style={{ height: 32 }} />
        <NavyButton label="Save changes" onPress={handleSave} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary, letterSpacing: 0.2 },
  scroll: { paddingHorizontal: 22 },
  avatarWrap: { alignSelf: 'center', marginTop: 8, marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarEmoji: { fontSize: 40 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  readOnly: { opacity: 0.55 },
});
