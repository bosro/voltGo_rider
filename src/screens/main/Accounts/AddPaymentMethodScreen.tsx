/**
 * AddPaymentMethodScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Lets the rider add a Mobile Money account or a card.
 * Tabs: MoMo | Card
 * Calls POST /payment-methods via useAddPayment hook.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { SvgXml } from "react-native-svg";
import { useAddPayment } from "../../../hooks/rider/usePayments";
import { NavyButton, InputField, FieldLabel } from "../../../components/common";
import { Colors, Radius, Typography } from "../../../theme";

// ── Inline SVGs ───────────────────────────────────────────────────────────────
const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const phoneSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="1" width="14" height="18" rx="3" stroke="#5A6478" stroke-width="1.5" fill="none"/><circle cx="9" cy="16" r="1" fill="#5A6478"/></svg>`;
const userSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="5" r="4" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 19C1 15.7 5.1 13 9 13C12.9 13 17 15.7 17 19" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;
const cardSvg = `<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="18" height="14" rx="2" stroke="#5A6478" stroke-width="1.5" fill="none"/><rect x="1" y="5" width="18" height="3" fill="#5A6478" opacity="0.15"/><rect x="3" y="10" width="4" height="2" rx="0.5" fill="#5A6478"/></svg>`;

// ── MoMo providers ────────────────────────────────────────────────────────────
const MOMO_PROVIDERS = [
  { key: "mtn_momo", label: "MTN", color: "#FFCC00", text: "#000" },
  { key: "vodafone_cash", label: "Vodafone", color: "#E60000", text: "#fff" },
  {
    key: "airteltigo_money",
    label: "AirtelTigo",
    color: "#0080ffff",
    text: "#fff",
  },
];

type Tab = "momo" | "card";

export default function AddPaymentMethodScreen() {
  const navigation = useNavigation<any>();
  const { mutate: addPayment, isPending } = useAddPayment();

  const [activeTab, setActiveTab] = useState<Tab>("momo");

  // MoMo fields
  const [momoProvider, setMomoProvider] = useState<string>("mtn_momo");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardProvider, setCardProvider] = useState<"visa" | "mastercard">(
    "visa",
  );

  // ── Validation ──────────────────────────────────────────────────
  const validateMomo = () => {
    if (!momoNumber.trim()) return "Please enter your MoMo number.";
    if (momoNumber.replace(/\s/g, "").length < 10)
      return "Enter a valid 10-digit number.";
    if (!momoName.trim()) return "Please enter the account name.";
    return null;
  };

  const validateCard = () => {
    const stripped = cardNumber.replace(/\s/g, "");
    if (!stripped) return "Please enter your card number.";
    if (stripped.length < 15 || stripped.length > 19)
      return "Enter a valid card number.";
    if (!cardName.trim()) return "Please enter the name on card.";
    return null;
  };

  // ── Format card number with spaces ──────────────────────────────
  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    const grouped = digits.match(/.{1,4}/g)?.join(" ") ?? digits;
    setCardNumber(grouped);
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (activeTab === "momo") {
      const err = validateMomo();
      if (err) {
        Alert.alert("Validation", err);
        return;
      }

      addPayment(
        {
          type: "momo",
          account_number: momoNumber.replace(/\s/g, ""),
          account_name: momoName.trim(),
          provider: momoProvider,
        },
        {
          onSuccess: () => {
            Alert.alert("Success", "Mobile Money account added.", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          },
          onError: (e: any) => {
            const msg =
              e?.response?.data?.message ?? "Failed to add payment method.";
            Alert.alert("Error", msg);
          },
        },
      );
    } else {
      const err = validateCard();
      if (err) {
        Alert.alert("Validation", err);
        return;
      }

      addPayment(
        {
          type: "card",
          account_number: cardNumber.replace(/\s/g, ""),
          account_name: cardName.trim(),
          provider: cardProvider,
        },
        {
          onSuccess: () => {
            Alert.alert("Success", "Card added successfully.", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          },
          onError: (e: any) => {
            const msg = e?.response?.data?.message ?? "Failed to add card.";
            Alert.alert("Error", msg);
          },
        },
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["momo", "card"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "momo" ? "Mobile Money" : "Card"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "momo" ? (
            <>
              {/* Provider selector */}
              <FieldLabel label="Provider" />
              <View style={styles.providerRow}>
                {MOMO_PROVIDERS.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.providerChip,
                      momoProvider === p.key && {
                        backgroundColor: p.color,
                        borderColor: p.color,
                      },
                    ]}
                    onPress={() => setMomoProvider(p.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.providerChipText,
                        momoProvider === p.key && { color: p.text },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FieldLabel label="MoMo Number" />
              <InputField
                iconSvg={phoneSvg}
                placeholder="e.g. 0241234567"
                value={momoNumber}
                onChangeText={setMomoNumber}
                keyboardType="phone-pad"
                maxLength={13}
              />

              <FieldLabel label="Account Name" />
              <InputField
                iconSvg={userSvg}
                placeholder="Name registered to this number"
                value={momoName}
                onChangeText={setMomoName}
                autoCapitalize="words"
              />

              {/* Info box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Make sure the name matches your registered MoMo account
                  exactly to avoid payment delays.
                </Text>
              </View>
            </>
          ) : (
            <>
              <FieldLabel label="Card Type" />
              <View style={styles.providerRow}>
                {(["visa", "mastercard"] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.providerChip,
                      cardProvider === c && {
                        backgroundColor: Colors.navy,
                        borderColor: Colors.navy,
                      },
                    ]}
                    onPress={() => setCardProvider(c)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.providerChipText,
                        cardProvider === c && { color: Colors.white },
                      ]}
                    >
                      {c === "visa" ? "Visa" : "Mastercard"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FieldLabel label="Card Number" />
              <InputField
                iconSvg={cardSvg}
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="number-pad"
                maxLength={19}
              />

              <FieldLabel label="Name on Card" />
              <InputField
                iconSvg={userSvg}
                placeholder="As it appears on the card"
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="characters"
              />

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Only Visa and Mastercard debit cards are currently
                  supported.
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 32 }} />

          <NavyButton
            label={isPending ? "" : "Save Payment Method"}
            onPress={handleSubmit}
            disabled={isPending}
          />

          {isPending && (
            <ActivityIndicator color={Colors.navy} style={{ marginTop: 16 }} />
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider ?? "#ECEEF2",
    marginBottom: 4,
  },
  tab: {
    paddingBottom: 10,
    marginRight: 28,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.navy },
  tabText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  tabTextActive: { color: Colors.navy },

  scroll: { paddingHorizontal: 22, paddingTop: 20 },

  providerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border ?? "#DDE1E9",
    backgroundColor: Colors.white,
  },
  providerChipText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },

  infoBox: {
    backgroundColor: "#F0F4FF",
    borderRadius: Radius.md ?? 10,
    padding: 14,
    marginTop: 8,
  },
  infoText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: "#4A5568",
    lineHeight: 20,
  },
});
