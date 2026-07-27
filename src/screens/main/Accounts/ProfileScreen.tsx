/**
 * ProfileScreen.tsx rider
 */
import { useToast } from "@/components/common/Toast";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { FieldLabel, InputField, NavyButton } from "../../../components/common";
import ConfirmModal from "../../../components/common/ConfirmModal"; // ← adjust path
import { useRiderProfile, useUpdateRiderProfile, useUpdateRiderProfileImage } from "../../../hooks/rider/useRider";
import { useAuthStore } from "../../../store/authStore";
import { Colors, Typography } from "../../../theme";

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const cameraEditSvg = `<svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1H10L11.5 3H14C14.8 3 15.5 3.7 15.5 4.5V12C15.5 12.8 14.8 13.5 14 13.5H2C1.2 13.5 0.5 12.8 0.5 12V4.5C0.5 3.7 1.2 3 2 3H4.5L6 1Z" stroke="white" stroke-width="1.3" fill="none"/><circle cx="8" cy="8" r="2.5" stroke="white" stroke-width="1.3" fill="none"/></svg>`;
const userProfileSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="5" r="4" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 19C1 15.7 5.1 13 9 13C12.9 13 17 15.7 17 19" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;
const emailSvg = `<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="18" height="14" rx="2" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 4L10 9L19 4" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const phoneSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="1" width="14" height="18" rx="3" stroke="#5A6478" stroke-width="1.5" fill="none"/><circle cx="9" cy="16" r="1" fill="#5A6478"/></svg>`;

const defaultAvatar = require("../../../../assets/images/default-avatar.webp");

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { rider, updateRider } = useAuthStore();
  const emailVerified = !!rider?.email_verified;
  const { isLoading } = useRiderProfile();
  const { mutateAsync: saveProfile, isPending: isSaving } = useUpdateRiderProfile();
  const { mutateAsync: uploadPhoto, isPending: isUploadingPhoto } = useUpdateRiderProfileImage();

  const [name, setName] = useState(rider?.name ?? "");
  const [email, setEmail] = useState(rider?.email ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(
    rider?.avatar_url ?? null,
  );

  // FIX: true whenever the email field has been edited but not yet saved.
  // POST /rider/send-otp-email always sends to whatever email is saved on
  // the server, NOT to whatever is currently typed here, so we must not
  // let the rider jump into verification while there's a mismatch — same
  // fix applied to the customer app's ProfileScreen.
  const savedEmail = rider?.email ?? "";
  const hasUnsavedEmailChange = email !== savedEmail;

  // ← ConfirmModal: save confirmation — rider taps "Done" to close and go back,
  //   making the success state explicit rather than a disappearing toast during navigation.
  const [savedModal, setSavedModal] = useState(false);

  useEffect(() => {
    if (rider) {
      setName(rider.name ?? "");
      setEmail(rider.email ?? "");
      setAvatarUri(rider.avatar_url ?? null);
    }
  }, [rider?.id]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      // ← Toast: permission nudge, no blocking needed
      toast.error("Allow photo access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    // Show it immediately while the upload is in flight
    setAvatarUri(asset.uri);

    const mime = asset.mimeType ?? "image/jpeg";
    const dataUri = `data:${mime};base64,${asset.base64}`;
    try {
      await uploadPhoto(dataUri);
      toast.success("Photo updated");
    } catch (err: any) {
      // Roll back to whatever the server actually has on file
      setAvatarUri(rider?.avatar_url ?? null);
      toast.error(
        err?.response?.data?.message ?? "Couldn't upload photo. Please try again.",
      );
    }
  };

  const handleSave = async () => {
    try {
      await saveProfile({ full_name: name, email: email || undefined });
      setSavedModal(true);
    } catch (err: any) {
      // Don't optimistically update local state / show a false success —
      // that's what previously made email edits look saved and then
      // silently disappear once the screen refetched from the server.
      toast.error(
        err?.response?.status === 404
          ? "Updating your profile isn't supported by the server yet. Please contact support."
          : (err?.response?.data?.message ?? "Couldn't save your changes. Please try again."),
      );
    }
  };

  // FIX: guard the Verify tap the same way as the customer app — if the
  // email field has unsaved edits, sending them to EmailVerificationScreen
  // would verify the OLD saved email while implying it verifies what's
  // currently typed.
  const handleVerifyPress = () => {
    if (hasUnsavedEmailChange) {
      toast.error("Save your email changes before verifying this address.");
      return;
    }
    navigation.navigate("EmailVerification", { returnTo: "Profile" });
  };

  if (isLoading && !rider) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={Colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* ── Profile saved modal ───────────────────────────────────── */}
      <ConfirmModal
        visible={savedModal}
        title="Profile Updated"
        message="Your changes have been saved successfully."
        primaryLabel="Done"
        onPrimary={() => {
          setSavedModal(false);
          navigation.goBack();
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Image
              source={avatarUri ? { uri: avatarUri } : defaultAvatar}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <SvgXml xml={cameraEditSvg} width={16} height={14} />
            )}
          </TouchableOpacity>
        </View>

        <FieldLabel label="Full Name" />
        <InputField
          iconSvg={userProfileSvg}
          placeholder="Enter full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <FieldLabel label="Phone Number" />
        <InputField
          iconSvg={phoneSvg}
          placeholder="+233 ..."
          value={rider?.phone ?? ""}
          editable={false}
          style={styles.readOnly}
        />

        <View style={styles.emailLabelRow}>
          <FieldLabel label="Email" />
          {!!email && (
            <TouchableOpacity
              onPress={handleVerifyPress}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text
                style={[
                  styles.emailStatus,
                  emailVerified && styles.emailStatusVerified,
                  // FIX: visually de-emphasize when verify would be a no-op
                  hasUnsavedEmailChange && styles.emailStatusDisabled,
                ]}
              >
                {hasUnsavedEmailChange
                  ? "Save to verify"
                  : emailVerified
                    ? "Verified ✓"
                    : "Not verified · Verify"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <InputField
          iconSvg={emailSvg}
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ height: 32 }} />
        <NavyButton
          label={isSaving ? "Saving..." : "Save changes"}
          onPress={handleSave}
          disabled={isSaving}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailStatus: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: Colors.orange,
  },
  emailStatusVerified: {
    color: Colors.textGreen,
  },
  // FIX: new style for the "Save to verify" state
  emailStatusDisabled: {
    color: Colors.textMuted,
  },
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  scroll: { paddingHorizontal: 22 },
  avatarWrap: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
    position: "relative",
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  readOnly: { opacity: 0.55 },
});