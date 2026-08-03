import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavyButton, GhostButton } from "../../components/common";
import { useToast } from "@/components/common/Toast";
import { useAddPhone, useVerifyAddedPhone } from "../../hooks/auth/useAuth";
import { Colors, Radius, Typography } from "../../theme";

export default function AddPhoneScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const { mutateAsync: addPhone, isPending: isSending } = useAddPhone();
  const { mutateAsync: verifyAddedPhone, isPending: isVerifying } = useVerifyAddedPhone();

  const fullPhone = `0${phone.trim()}`;

  const handleSendOtp = async () => {
    if (phone.trim().length !== 9) {
      toast.error("Please enter a valid 9-digit phone number.");
      return;
    }
    try {
      await addPhone(fullPhone);
      setStep("otp");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not send code. This number may already be in use.");
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 5) {
      toast.error("Please enter the 5-digit code.");
      return;
    }
    try {
      await verifyAddedPhone({ phone: fullPhone, otp });
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid or expired code.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.heading}>
          {step === "phone" ? "Add your phone number" : "Enter the code"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "phone"
            ? "One last step — we need a phone number to keep you updated on deliveries."
            : `We sent a code to +233 ${phone}`}
        </Text>

        {step === "phone" ? (
          <>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder="XXXXXXXXX"
              maxLength={9}
            />
            <NavyButton
              label={isSending ? "Sending..." : "Send code"}
              onPress={handleSendOtp}
              disabled={isSending || phone.trim().length !== 9}
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              placeholder="XXXXX"
              maxLength={5}
            />
            <NavyButton
              label={isVerifying ? "Verifying..." : "Verify"}
              onPress={handleVerify}
              disabled={isVerifying || otp.length !== 5}
            />
            <GhostButton label="Back" onPress={() => setStep("phone")} style={{ marginTop: 12 }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 22 },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: { fontFamily: "Poppins-Regular", fontSize: Typography.base, color: Colors.textSecondary, marginBottom: 20 },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
  },
});