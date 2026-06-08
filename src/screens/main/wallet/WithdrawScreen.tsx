/**
 * WithdrawScreen.tsx
 * Reached from: WalletScreen → "Withdraw" button
 *
 * Layout:
 *  - Back header + "Withdraw" title
 *  - Available balance display (teal label + large amount)
 *  - Amount input with "GHS" prefix
 *  - Quick-amount chips: GHS 50 / 100 / 200 / 500
 *  - Account selector (dropdown — pulls from saved payment methods)
 *  - "Withdraw" navy button
 *  - Confirmation modal overlay
 *
 * SVGs needed: back_arrow.svg, wallet_account.svg, chevron_down.svg
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, TextInput, Modal, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { Colors, Radius, Shadow, Typography } from '@/theme';
import { GhostButton, NavyButton } from '@/components/common';
import { SafeAreaView } from "react-native-safe-area-context";


const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chevronDownSvg = `<svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L8 9L15 1" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const checkCircleSvg = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="28" fill="#E8FFF2"/><circle cx="28" cy="28" r="20" fill="#4CD964" fill-opacity="0.2"/><path d="M18 28L24 34L38 20" stroke="#4CD964" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const QUICK_AMOUNTS = [50, 100, 200, 500];
const ACCOUNTS = [
  { id: '1', label: 'MTN MoMo · 0575****04', emoji: '🟡' },
  { id: '2', label: 'Vodafone Cash · 0204****12', emoji: '🔴' },
];
const AVAILABLE_BALANCE = 2553.56;

export default function WithdrawScreen() {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount >= 10 && parsedAmount <= AVAILABLE_BALANCE;

  const handleWithdraw = () => {
    if (!isValid) {
      Alert.alert('Invalid amount', `Minimum withdrawal is GHS 10.00. Available: GHS ${AVAILABLE_BALANCE.toFixed(2)}.`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    // TODO: POST /api/wallet/withdraw { amount: parsedAmount, accountId: selectedAccount.id }
    setTimeout(() => setShowSuccess(true), 400);
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    navigation.goBack();
  };

  const cycleAccount = () => {
    const idx = ACCOUNTS.findIndex(a => a.id === selectedAccount.id);
    setSelectedAccount(ACCOUNTS[(idx + 1) % ACCOUNTS.length]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>GHS {AVAILABLE_BALANCE.toFixed(2)}</Text>
        </View>

        {/* Amount input */}
        <Text style={styles.fieldLabel}>Amount</Text>
        <View style={styles.amountRow}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>GHS</Text>
          </View>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={Colors.textPlaceholder}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            returnKeyType="done"
          />
        </View>

        {/* Quick amount chips */}
        <View style={styles.chipsRow}>
          {QUICK_AMOUNTS.map(q => (
            <TouchableOpacity
              key={q}
              style={[styles.chip, amount === q.toString() && styles.chipActive]}
              onPress={() => setAmount(q.toString())}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, amount === q.toString() && styles.chipTextActive]}>
                GHS {q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account selector */}
        <Text style={styles.fieldLabel}>Withdraw to</Text>
        <TouchableOpacity style={styles.accountPicker} onPress={cycleAccount} activeOpacity={0.8}>
          <Text style={styles.accountEmoji}>{selectedAccount.emoji}</Text>
          <Text style={styles.accountLabel}>{selectedAccount.label}</Text>
          <SvgXml xml={chevronDownSvg} width={16} height={10} />
        </TouchableOpacity>

        <Text style={styles.feeNote}>No withdrawal fees • Instant for MoMo • 1–2 days for bank</Text>

        <View style={{ height: 32 }} />
        <NavyButton label="Withdraw" onPress={handleWithdraw} disabled={!isValid} />
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Withdrawal</Text>
            <Text style={styles.modalBody}>
              You are about to withdraw{'\n'}
              <Text style={styles.modalHighlight}>GHS {parsedAmount.toFixed(2)}</Text>
              {'\n'}to {selectedAccount.emoji} {selectedAccount.label}
            </Text>
            <NavyButton label="Confirm" onPress={handleConfirm} style={{ marginBottom: 10 }} />
            <GhostButton label="Cancel" onPress={() => setShowConfirm(false)} />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <SvgXml xml={checkCircleSvg} width={56} height={56} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Withdrawal Initiated!</Text>
            <Text style={styles.modalBody}>
              GHS {parsedAmount.toFixed(2)} is on its way to{'\n'}{selectedAccount.label}
            </Text>
            <NavyButton label="Done" onPress={handleSuccessDone} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 22, paddingTop: 8 },

  balanceCard: { backgroundColor: Colors.navy, borderRadius: Radius.xl, padding: 24, alignItems: 'center', marginBottom: 28 },
  balanceLabel: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.primary, marginBottom: 6 },
  balanceAmount: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 34, color: Colors.white, letterSpacing: 0.3 },

  fieldLabel: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textPrimary, marginBottom: 10, marginTop: 4 },

  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 16 },
  currencyBadge: { backgroundColor: Colors.inputBg, paddingHorizontal: 16, paddingVertical: 16, borderRightWidth: 1, borderRightColor: Colors.border },
  currencyText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.lg, color: Colors.textPrimary },
  amountInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'HelveticaNeue-CondensedBold', fontSize: 22, color: Colors.textPrimary },

  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  chipText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },

  accountPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 14, gap: 12, marginBottom: 12 },
  accountEmoji: { fontSize: 22 },
  accountLabel: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textPrimary },

  feeNote: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,34,64,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 24, width: '100%', ...Shadow.modal },
  modalTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xxl, color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  modalBody: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  modalHighlight: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xxl, color: Colors.navy },
});
