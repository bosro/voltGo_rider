/**
 * PaymentMethodsScreen.tsx — Real API integration
 * Uses actual API field names: account_name, account_number, provider, type
 */
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import {
  usePaymentMethods,
  useRemovePayment,
  useSetDefaultPayment,
} from "../../../hooks/rider/usePayments";
import { Colors, Radius, Shadow, Typography } from "../../../theme";

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Map provider key → friendly display name
const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo:         "MTN Mobile Money",
  vodafone_cash:    "Vodafone Cash",
  airteltigo_money: "AirtelTigo Money",
  visa:             "Visa",
  mastercard:       "Mastercard",
};

// Map provider key → accent color for the badge
const PROVIDER_COLORS: Record<string, string> = {
  mtn_momo:         "#FFCC00",
  vodafone_cash:    "#E60000",
  airteltigo_money: "#FF6600",
  visa:             "#1A1F71",
  mastercard:       "#EB001B",
};

const PROVIDER_TEXT: Record<string, string> = {
  mtn_momo:         "#000",
  vodafone_cash:    "#fff",
  airteltigo_money: "#fff",
  visa:             "#fff",
  mastercard:       "#fff",
};

// The real shape returned by GET /payment-methods
interface ApiPaymentMethod {
  id:             string;
  type:           "momo" | "card";
  provider:       string;
  account_name:   string;
  account_number: string; // already masked by server e.g. "******0404"
  is_default:     boolean;
  is_active:      boolean;
}

export default function PaymentMethodsScreen() {
  const navigation = useNavigation<any>();
  const {
    data: methods = [],
    isLoading,
    isError,
    refetch,
  } = usePaymentMethods();

  const { mutate: setDefault, isPending: isSettingDefault } = useSetDefaultPayment();
  const { mutate: remove,     isPending: isRemoving }        = useRemovePayment();

  const handleRemove = (item: ApiPaymentMethod) => {
    const label = PROVIDER_LABELS[item.provider] ?? item.provider;
    Alert.alert(
      "Remove Payment Method",
      `Remove ${label} (${item.account_number})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => remove(item.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.navy} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptySubtitle}>Failed to load payment methods.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text style={{ color: Colors.navy, fontFamily: "Poppins-SemiBold" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={methods as ApiPaymentMethod[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 8,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>💳</Text>
              </View>
              <Text style={styles.emptyTitle}>No payment methods yet</Text>
              <Text style={styles.emptySubtitle}>
                Add a Mobile Money or card account to receive your earnings.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate("AddPaymentMethod")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyAddText}>+ Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddPaymentMethod")}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>+ Add Payment Method</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const providerLabel = PROVIDER_LABELS[item.provider] ?? item.provider;
            const providerColor = PROVIDER_COLORS[item.provider] ?? Colors.navy;
            const providerText  = PROVIDER_TEXT[item.provider]   ?? "#fff";

            return (
              <View style={[styles.card, item.is_default && styles.cardDefault]}>
                {/* Provider colour strip */}
                <View style={[styles.strip, { backgroundColor: providerColor }]}>
                  <Text style={[styles.stripText, { color: providerText }]}>
                    {item.type === "momo" ? "MoMo" : "Card"}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardLabel}>{providerLabel}</Text>
                    <Text style={styles.cardName}>{item.account_name}</Text>
                    <Text style={styles.cardNumber}>{item.account_number}</Text>
                    {item.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    {!item.is_default && (
                      <TouchableOpacity
                        style={styles.setDefaultBtn}
                        onPress={() => setDefault(item.id)}
                        disabled={isSettingDefault}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemove(item)}
                      disabled={isRemoving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...Shadow.card,
  },
  cardDefault: { borderColor: Colors.navy },
  strip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  stripText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardLeft: { flex: 1 },
  cardLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  cardName: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: 1,
  },
  cardNumber: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  defaultBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.navy,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
    color: Colors.white,
  },
  cardActions: { gap: 6 },
  setDefaultBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
  },
  setDefaultText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  removeBtn: {
    backgroundColor: "#FFF0F0",
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
  },
  removeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.errorRed,
  },

  // ── Add button (footer) ────────────────────────────────────────
  addBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: Colors.navy,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.navy,
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyAddBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyAddText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});