/**
 * PaymentMethodsScreen.tsx — Real API integration
 * Lists, sets default and removes saved MoMo/card payment methods.
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
import { PaymentMethod } from "../../../lib/api";
import { Colors, Radius, Shadow, Typography } from "../../../theme";

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function PaymentMethodsScreen() {
  const navigation = useNavigation<any>();
  const {
    data: methods = [],
    isLoading,
    isError,
    refetch,
  } = usePaymentMethods();
  const { mutate: setDefault, isPending: isSettingDefault } =
    useSetDefaultPayment();
  const { mutate: remove, isPending: isRemoving } = useRemovePayment();

  const handleRemove = (item: PaymentMethod) => {
    Alert.alert(
      "Remove Payment Method",
      `Remove ${item.label} ending in ${item.number.slice(-4)}?`,
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
          <Text style={styles.emptyText}>Failed to load payment methods.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text
              style={{ color: Colors.navy, fontFamily: "Poppins-SemiBold" }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 8,
            paddingBottom: 24,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                No payment methods saved yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.is_default && styles.cardDefault]}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardNumber}>
                  •••• {item.number.slice(-4)}
                </Text>
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
          )}
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
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadow.card,
  },
  cardDefault: { borderColor: Colors.navy },
  cardLeft: { flex: 1 },
  cardLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 2,
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
});
