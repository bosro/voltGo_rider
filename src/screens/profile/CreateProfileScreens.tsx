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

import UserProfileIcon from "../../../assets/icons/user-profile.svg";
import EmailIcon from "../../../assets/icons/email.svg";
import GlobeIcon from "../../../assets/icons/globe.svg";
import ChevronDownIcon from "../../../assets/icons/chevron-down-sm.svg";
import IdCardIcon from "../../../assets/icons/id-card.svg";
import BicycleIcon from "../../../assets/icons/bicycle.svg";
import UploadCloudIcon from "../../../assets/icons/upload-cloud.svg";
import PlusWhiteIcon from "../../../assets/icons/plus-white.svg";
import WalletIcon from "../../../assets/icons/wallet.svg";

const { height } = Dimensions.get("window");
const HERO_H = height * 0.3;

// ── ProfileShell ───────────────────────────────────────────────────────────────
function ProfileShell({
  step,
  children,
  onNext,
  onBack,
  nextLabel = "Next",
  isLoading = false,
}: {
  step: number;
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
          <StepDots current={step} />
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

// ── Step 1 — Personal Info ─────────────────────────────────────────────────────
export function CreateProfileStep1Screen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("");

  return (
    <ProfileShell
      step={1}
      onNext={() => {
        if (!name.trim())
          return Alert.alert("Required", "Please enter your full name.");
        if (!language)
          return Alert.alert("Required", "Please select a preferred language.");
        navigation.navigate("CreateProfileStep2", { name, email, language });
      }}
    >
      <FieldLabel label="Name" />
      <InputField
        IconComponent={UserProfileIcon}
        iconWidth={18}
        iconHeight={20}
        placeholder="Enter full name here.."
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <FieldLabel label="Email" optional />
      <InputField
        IconComponent={EmailIcon}
        iconWidth={20}
        iconHeight={16}
        placeholder="Enter email here.."
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FieldLabel label="Preferred Language" />
      <DropdownField
        IconComponent={GlobeIcon}
        iconWidth={20}
        iconHeight={20}
        placeholder="Select preferred language"
        value={language}
        onPress={() => setLanguage("English")}
        ChevronComponent={ChevronDownIcon}
      />
    </ProfileShell>
  );
}

// ── Step 2 — ID & Vehicle ──────────────────────────────────────────────────────
type Step2P = RouteProp<RootStackParamList, "CreateProfileStep2">;
export function CreateProfileStep2Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Step2P>();
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  return (
    <ProfileShell
      step={2}
      onNext={() => {
        if (!idType || !idNumber.trim() || !vehicleType)
          return Alert.alert("Required", "Please fill all fields.");
        navigation.navigate("CreateProfileStep3", {
          ...route.params,
          idType,
          idNumber,
          vehicleType,
        });
      }}
      onBack={() => navigation.goBack()}
    >
      <FieldLabel label="Identification Card" />
      <DropdownField
        placeholder="Select identification card type"
        value={idType}
        onPress={() => setIdType("Ghana Card")}
        ChevronComponent={ChevronDownIcon}
      />
      <FieldLabel label="ID Card Number" />
      <InputField
        IconComponent={IdCardIcon}
        iconWidth={22}
        iconHeight={16}
        placeholder="Enter ID number here"
        value={idNumber}
        onChangeText={setIdNumber}
        autoCapitalize="characters"
      />
      <FieldLabel label="Vehicle Type" />
      <DropdownField
        IconComponent={BicycleIcon}
        iconWidth={22}
        iconHeight={16}
        placeholder="Select vehicle type"
        value={vehicleType}
        onPress={() => setVehicleType("Bicycle")}
        ChevronComponent={ChevronDownIcon}
      />
    </ProfileShell>
  );
}

// ── Step 3 — Document Upload ───────────────────────────────────────────────────
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri)
      setter(result.assets[0].uri);
  };

  return (
    <ProfileShell
      step={3}
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
      nextLabel="Next"
    >
      <View style={{ height: 10 }} />
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

// ── Step 4 — Payout Account + Submit KYC ──────────────────────────────────────
type Step4P = RouteProp<RootStackParamList, "CreateProfileStep4">;
export function CreateProfileStep4Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Step4P>();
  const [accountType, setAccountType] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { mutateAsync: submitKyc, isPending } = useSubmitKyc();

  const handleComplete = async () => {
    if (!accountType || !accountNumber.trim() || !accountName.trim())
      return Alert.alert("Required", "Please fill all fields.");

    const {
      name,
      email,
      language,
      idType,
      idNumber,
      vehicleType,
      ghanaCardUri,
      profilePhotoUri,
    } = route.params;

    if (!ghanaCardUri || !profilePhotoUri) {
      return Alert.alert(
        "Error",
        "Missing document uploads. Please go back and upload them.",
      );
    }

    try {
      const form = buildKycFormData({
        name,
        email,
        language,
        id_type: idType,
        id_number: idNumber,
        vehicle_type: vehicleType,
        ghanaCardUri,
        profilePhotoUri,
        account_type: accountType,
        account_number: accountNumber,
        account_name: accountName,
      });

      await submitKyc(form);
      navigation.navigate("BiometricSetup");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Submission failed. Please try again.";
      Alert.alert("KYC Error", message);
    }
  };

  return (
    <ProfileShell
      step={4}
      onNext={handleComplete}
      onBack={() => navigation.goBack()}
      nextLabel="Complete"
      isLoading={isPending}
    >
      <Text style={step4S.subtitle}>
        Add an account for earning disbursement
      </Text>
      <FieldLabel label="Account Type" />
      <DropdownField
        placeholder="Select account type"
        value={accountType}
        onPress={() => setAccountType("Mobile Money")}
        ChevronComponent={ChevronDownIcon}
      />
      <FieldLabel label="Account Number" />
      <InputField
        IconComponent={WalletIcon}
        iconWidth={20}
        iconHeight={18}
        placeholder="Enter account number here"
        value={accountNumber}
        onChangeText={setAccountNumber}
        keyboardType="phone-pad"
      />
      <FieldLabel label="Account Name" />
      <InputField
        IconComponent={UserProfileIcon}
        iconWidth={18}
        iconHeight={20}
        placeholder="Enter account name.."
        value={accountName}
        onChangeText={setAccountName}
        autoCapitalize="words"
      />
    </ProfileShell>
  );
}

const step4S = StyleSheet.create({
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
});
