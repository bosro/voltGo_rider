import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  NavyButton,
  GhostButton,
  InputField,
  DropdownField,
  FieldLabel,
  StepDots,
  UploadCard,
} from "../../components/common";
import { Colors, Typography, Radius } from "../../theme";
import { RootStackParamList } from "../../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubmitKyc, buildKycFormData } from "../../hooks/auth/useKyc";
import { useAuthStore } from "../../store/authStore";

const heroImage = require("../../../assets/images/create-profile-hero.png");

import IdCardIcon from "../../../assets/icons/id-card.svg";
import BicycleIcon from "../../../assets/icons/bicycle.svg";
import UploadCloudIcon from "../../../assets/icons/upload-cloud.svg";
import PlusWhiteIcon from "../../../assets/icons/plus-white.svg";
import WalletIcon from "../../../assets/icons/wallet.svg";
import ChevronDownIcon from "../../../assets/icons/chevron-down-sm.svg";

const { height } = Dimensions.get("window");
const HERO_H = height * 0.3;

// ── ProfileShell ───────────────────────────────────────────────────────────────
function ProfileShell({
  step,
  totalSteps = 3,
  children,
  onNext,
  onBack,
  nextLabel = "Next",
  isLoading = false,
}: {
  step: number;
  totalSteps?: number;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  isLoading?: boolean;
}) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 62,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={shellS.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={shellS.hero}>
        <Image source={heroImage} style={shellS.heroImage} resizeMode="cover" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Animated.View
          style={[
            shellS.inner,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={shellS.heading}>Create Profile</Text>
          <StepDots current={step} total={totalSteps} />
          {children}
          <View style={{ height: 20 }} />
          <NavyButton
            label={isLoading ? "Please wait..." : nextLabel}
            onPress={onNext}
            disabled={isLoading}
          />
          {onBack && (
            <GhostButton
              label="Back"
              onPress={onBack}
              style={{ marginTop: 10 }}
            />
          )}
          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const shellS = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  hero: {
    marginHorizontal: 14,
    marginTop: 10,
    height: HERO_H,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: Colors.navy,
  },
  heroImage: { width: "100%", height: "100%" },
  inner: { paddingHorizontal: 22, paddingTop: 18 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
  },
});

// ── Step 1 — ID & Vehicle (was Step 2) ────────────────────────────────────────
// Navigator still calls this "CreateProfileStep2" so no route name changes needed
export function CreateProfileStep2Screen() {
  const navigation = useNavigation<any>();
  const [ghanaCardNo, setGhanaCardNo] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [vehicleTypePreference, setVehicleTypePreference] = useState("");
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const vehicleOptions = ["motorcycle", "bicycle", "car", "van", "truck"];

  return (
    <ProfileShell
      step={1}
      onNext={() => {
        if (!ghanaCardNo.trim())
          return Alert.alert(
            "Required",
            "Please enter your Ghana Card number.",
          );
        if (!vehicleTypePreference)
          return Alert.alert("Required", "Please select a vehicle type.");
        navigation.navigate("CreateProfileStep3", {
          ghanaCardNo,
          licenseNo,
          vehicleTypePreference,
        });
      }}
    >
      <Text style={stepS.subtitle}>
        We need a few details to verify your identity.
      </Text>

      <FieldLabel label="Ghana Card Number" />
      <InputField
        IconComponent={IdCardIcon}
        iconWidth={22}
        iconHeight={16}
        placeholder="GHA-123456789-0"
        value={ghanaCardNo}
        onChangeText={setGhanaCardNo}
        autoCapitalize="characters"
      />

      <FieldLabel label="Driver's License Number" optional />
      <InputField
        IconComponent={IdCardIcon}
        iconWidth={22}
        iconHeight={16}
        placeholder="DL-0012345"
        value={licenseNo}
        onChangeText={setLicenseNo}
        autoCapitalize="characters"
      />

      <FieldLabel label="Vehicle Type" />
      <DropdownField
        IconComponent={BicycleIcon}
        iconWidth={22}
        iconHeight={16}
        placeholder="Select vehicle type"
        value={
          vehicleTypePreference
            ? vehicleTypePreference.charAt(0).toUpperCase() +
              vehicleTypePreference.slice(1)
            : ""
        }
        onPress={() => setShowVehicleModal(true)}
        ChevronComponent={ChevronDownIcon}
      />

      {showVehicleModal && (
        <View style={dropdownS.overlay}>
          {vehicleOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={dropdownS.option}
              onPress={() => {
                setVehicleTypePreference(option);
                setShowVehicleModal(false);
              }}
            >
              <Text style={dropdownS.optionText}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={dropdownS.cancel}
            onPress={() => setShowVehicleModal(false)}
          >
            <Text style={dropdownS.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ProfileShell>
  );
}

// ── Step 2 — Document Upload (was Step 3) ─────────────────────────────────────
type Step3P = RouteProp<RootStackParamList, "CreateProfileStep3">;
export function CreateProfileStep3Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Step3P>();
  const [ghanaCardUri, setGhanaCardUri] = useState<string | undefined>();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | undefined>();

  const pickImage = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access in Settings.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri)
      setter(result.assets[0].uri);
  };

  return (
    <ProfileShell
      step={2}
      onNext={() => {
        if (!ghanaCardUri)
          return Alert.alert("Required", "Please upload your Ghana Card.");
        if (!profilePhotoUri)
          return Alert.alert("Required", "Please upload a profile photo.");
        navigation.navigate("CreateProfileStep4", {
          ...route.params,
          ghanaCardUri,
          profilePhotoUri,
        });
      }}
      onBack={() => navigation.goBack()}
    >
      <Text style={stepS.subtitle}>Upload clear photos of your documents.</Text>
      <UploadCard
        title="Ghana Card"
        fileUri={ghanaCardUri}
        onPress={() => pickImage(setGhanaCardUri)}
        UploadIconComponent={UploadCloudIcon}
        PlusIconComponent={PlusWhiteIcon}
      />
      <UploadCard
        title="Profile Photo"
        fileUri={profilePhotoUri}
        onPress={() => pickImage(setProfilePhotoUri)}
        UploadIconComponent={UploadCloudIcon}
        PlusIconComponent={PlusWhiteIcon}
      />
    </ProfileShell>
  );
}

// ── Step 3 — Payout Account + Submit KYC (was Step 4) ─────────────────────────
type Step4P = RouteProp<RootStackParamList, "CreateProfileStep4">;
export function CreateProfileStep4Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Step4P>();
  const [momoNumber, setMomoNumber] = useState("");
  const [momoProvider, setMomoProvider] = useState("");
  const [showProviderModal, setShowProviderModal] = useState(false);

  const { mutateAsync: submitKyc, isPending } = useSubmitKyc();

  // API accepts: mtn, vodafone, airteltigo
  const providerOptions = [
    { key: "mtn", label: "MTN Mobile Money" },
    { key: "vodafone", label: "Vodafone Cash" },
    { key: "airteltigo", label: "AirtelTigo Money" },
  ];

  const handleComplete = async () => {
    if (!momoNumber.trim())
      return Alert.alert("Required", "Please enter your MoMo number.");
    if (!momoProvider)
      return Alert.alert("Required", "Please select a MoMo provider.");

    const {
      ghanaCardNo,
      licenseNo,
      vehicleTypePreference,
      ghanaCardUri,
      profilePhotoUri,
    } = route.params;

    if (!ghanaCardUri || !profilePhotoUri) {
      return Alert.alert(
        "Error",
        "Missing document uploads. Please go back and upload them.",
      );
    }

    // Validate ghana_card_no is present before building form
    if (!ghanaCardNo?.trim()) {
      return Alert.alert(
        "Error",
        "Ghana Card number is missing. Please go back and enter it.",
      );
    }

    try {
      const form = buildKycFormData({
        ghana_card_no: ghanaCardNo.trim(),
        license_no: licenseNo?.trim() || undefined,
        vehicle_type_preference: vehicleTypePreference,
        momo_number: momoNumber.trim(),
        momo_provider: momoProvider,
        ghanaCardUri,
        profilePhotoUri,
      });

      await submitKyc(form);
      navigation.navigate("BiometricSetup");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Submission failed. Please try again.";
      Alert.alert("KYC Error", msg);
    }
  };

  return (
    <ProfileShell
      step={3}
      onNext={handleComplete}
      onBack={() => navigation.goBack()}
      nextLabel="Complete"
      isLoading={isPending}
    >
      <Text style={stepS.subtitle}>
        Add your Mobile Money account to receive earnings.
      </Text>

      <FieldLabel label="MoMo Provider" />
      <DropdownField
        placeholder="Select provider"
        value={providerOptions.find((p) => p.key === momoProvider)?.label ?? ""}
        onPress={() => setShowProviderModal(true)}
        ChevronComponent={ChevronDownIcon}
      />

      {showProviderModal && (
        <View style={dropdownS.overlay}>
          {providerOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={dropdownS.option}
              onPress={() => {
                setMomoProvider(option.key);
                setShowProviderModal(false);
              }}
            >
              <Text style={dropdownS.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={dropdownS.cancel}
            onPress={() => setShowProviderModal(false)}
          >
            <Text style={dropdownS.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <FieldLabel label="MoMo Number" />
      <InputField
        IconComponent={WalletIcon}
        iconWidth={20}
        iconHeight={18}
        placeholder="0551234567"
        value={momoNumber}
        onChangeText={setMomoNumber}
        keyboardType="phone-pad"
      />
    </ProfileShell>
  );
}

const stepS = StyleSheet.create({
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
});

const dropdownS = StyleSheet.create({
  overlay: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    marginTop: -8,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  cancel: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
});
